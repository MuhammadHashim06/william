// import { prisma } from "@/lib/db";
// import { downloadAttachmentContent } from "@/lib/graph";
// import { openai } from "@/lib/openai";
// import { audit } from "@/repositories/audit.repo";
// import { AuditAction, Prisma } from "@prisma/client";

// type ExtractResult = {
//     extracted: unknown; // or Prisma.JsonValue if you want stricter JSON typing
//     confidence: number;
// };

// function errorToMessage(e: unknown): string {
//     if (e instanceof Error) return e.message;
//     return typeof e === "string" ? e : JSON.stringify(e);
// }

// export class ExtractionService {
//     static async processAttachment(attachmentId: string) {
//         const att = await prisma.attachment.findUnique({
//             where: { id: attachmentId },
//             include: {
//                 message: {
//                     include: {
//                         thread: { include: { inbox: true } },
//                     },
//                 },
//             },
//         });

//         if (!att || att.status !== "PENDING") return;

//         const inboxUpn = att.message.thread.inbox.emailAddress;

//         try {
//             const file = await downloadAttachmentContent(
//                 inboxUpn,
//                 att.message.graphMessageId,
//                 att.graphAttachmentId
//             );

//             // Use the method your wrapper actually has
//             const result = await openai.classifyInline<ExtractResult>({
//                 system: `
// You extract structured data from healthcare documents.
// Return JSON only with keys: extracted, confidence.
// If you cannot extract, return extracted = null and confidence low.
// `,
//                 user: JSON.stringify({
//                     filename: file.name,
//                     contentType: file.contentType,
//                     note: "Attachment bytes downloaded. Routed content provided separately.",
//                 }),
//                 pdfFiles: [],
//                 images: [],
//                 attachmentTexts: [],
//             });


//             // Prisma Json fields: avoid "as any"; use Prisma.InputJsonValue / Prisma.JsonNull
//             const extractedJson: Prisma.InputJsonValue = {
//                 placeholder: true,
//                 filename: file.name,
//                 contentType: file.contentType,
//                 sizeBytes: file.bytes.length,
//                 extracted: (result.extracted ?? null) as Prisma.InputJsonValue,
//                 confidence: result.confidence,
//             };

//             await prisma.attachment.update({
//                 where: { id: att.id },
//                 data: {
//                     status: "EXTRACTED",
//                     extractedJson, // or extractedJson: extractedJson ?? Prisma.JsonNull (depending on your schema)
//                     lastError: null,
//                 },
//             });

//             await audit(AuditAction.AI_EXTRACTED, {
//                 threadId: att.message.threadId,
//                 messageId: att.messageId,
//                 payload: { attachmentId: att.id, filename: file.name },
//             });
//         } catch (e: unknown) {
//             const msg = errorToMessage(e);

//             await prisma.attachment.update({
//                 where: { id: att.id },
//                 data: {
//                     status: "FAILED",
//                     lastError: msg,
//                 },
//             });

//             await audit(AuditAction.GRAPH_ERROR, {
//                 threadId: att.message.threadId,
//                 messageId: att.messageId,
//                 payload: { attachmentId: att.id, error: msg },
//             });
//         }
//     }
// }




import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { downloadAttachmentContent } from "@/lib/graph";
import { openai } from "@/lib/openai";
import { audit } from "@/repositories/audit.repo";
import { AuditAction, Prisma } from "@prisma/client";

type SharePointMapping = {
    CustomerName: string | null;
    CustomerPhone: string | null;
    CustomerEmail: string | null;
    CustomerCompany: string | null;
    ReferralType: string | null;     // TDP, T2G, Early Intervention, etc.
    StaffedName: string | null;
    StaffedDate: string | null;
    ChildName: string | null;
    ProgramID: string | null;
    ServiceType: string | null;      // OT, ST, PT, ABA, ST Feeding, etc.
    Mandate: string | null;          // e.g. "2*30", "3*30"
    Language: string | null;
    DateOfBirth: string | null;       // YYYY-MM-DD or MM/DD/YYYY
    StreetAddress: string | null;
    City: string | null;
    State: string | null;
    ZipCode: string | null;
    County: string | null;
    CaregiverName: string | null;
    CaregiverPhone: string | null;
    Location: string | null;          // Service location (e.g. Home, Clinic)
    Notes: string | null;
};

type ExtractResult = {
    extracted: unknown;
    sharepoint_mapping: SharePointMapping | null;
    confidence: number;
};

function errorToMessage(e: unknown): string {
    if (e instanceof Error) return e.message;
    return typeof e === "string" ? e : JSON.stringify(e);
}

function sha256(buf: Buffer): string {
    return crypto.createHash("sha256").update(buf).digest("hex");
}

function extLower(name: string): string {
    const i = name.lastIndexOf(".");
    return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

function isPdf(name: string, ct?: string | null) {
    return (ct ?? "").toLowerCase() === "application/pdf" || extLower(name) === "pdf";
}

function isImage(name: string, ct?: string | null) {
    const mt = (ct ?? "").toLowerCase();
    if (mt.startsWith("image/")) return true;
    const ext = extLower(name);
    return ["jpg", "jpeg", "png", "webp"].includes(ext);
}

export class ExtractionService {
    static async runOnce(limit = 10) {
        const pending = await prisma.attachment.findMany({
            where: { status: "PENDING" },
            take: limit,
            select: { id: true },
        });

        for (const a of pending) {
            await ExtractionService.processAttachment(a.id);
        }

        return { ok: true, processed: pending.length };
    }

    /**
     * Helper to perform the actual AI extraction.
     * Can be used for Attachments (with file data) or Body Only (no file data).
     */
    private static async performExtraction(params: {
        filename: string;
        contentType: string;
        pdfFiles?: { name: string; bytes: Buffer; contentType: string }[];
        images?: { name: string; contentType: string; dataUrl: string }[];
        attachmentTexts?: { name: string; contentType: string; text: string }[];
        emailBodyContext?: string | null;
    }): Promise<ExtractResult> {
        const systemPrompt = `
You extract structured referral data from healthcare emails and their attachments.
These emails are typically from customers/agencies sending referrals for children needing therapy services (OT, ST, PT, ABA, etc.).

IMPORTANT: The referral data is usually in the EMAIL BODY text, not just in attachments.
Look for: child/patient name, date of birth, address, service/discipline needed, program ID, mandate frequency, language, caregiver info, and customer/agency info.
Also use any attachment content to fill in or supplement the data.

Return STRICT JSON with three keys:
1. "extracted": A rich, hierarchical JSON object capturing ALL available data.
2. "sharepoint_mapping": A flat object strictly matching the following schema. Use null if not found.
   - CustomerName: string | null (the person/agency sending the referral — often in the email signature or From line)
   - CustomerPhone: string | null (phone from signature or email body)
   - CustomerEmail: string | null (email address of the sender/referrer)
   - CustomerCompany: string | null (agency/company name, e.g. "Metro Children Services", "Early Intervention")
   - ReferralType: string | null (e.g. "TDP", "T2G", "Early Intervention")
   - StaffedName: string | null (assigned provider name if mentioned)
   - StaffedDate: string | null
   - ChildName: string | null (the child/patient being referred — CRITICAL field)
   - ProgramID: string | null (numeric program/case ID if present)
   - ServiceType: string | null (therapy discipline: "OT", "ST", "PT", "ABA", "ST Feeding", etc.)
   - Mandate: string | null (frequency like "2*30", "3*30", "10*60" meaning sessions*minutes)
   - Language: string | null (e.g. "English", "Spanish", "dual Spanish")
   - DateOfBirth: string | null (child's DOB in MM/DD/YYYY or YYYY-MM-DD)
   - StreetAddress: string | null (child/family street address)
   - City: string | null
   - State: string | null (e.g. "NY")
   - ZipCode: string | null
   - County: string | null (e.g. "Kings", "Bronx", "Queens")
   - CaregiverName: string | null (parent/guardian name)
   - CaregiverPhone: string | null (parent/guardian phone number)
   - Location: string | null (service location like "Home", "Clinic", "Daycare")
   - Notes: string | null (any relevant notes, summary, or special instructions)
3. "confidence": 0.0 to 1.0

If you cannot extract anything, return extracted=null, sharepoint_mapping=null, and confidence low.
`;

        const userContent = JSON.stringify({
            filename: params.filename,
            contentType: params.contentType,
            emailBodyContext: params.emailBodyContext ? params.emailBodyContext.slice(0, 5000) : "No body content", // Limit body size
        });

        return await openai.classifyInline<ExtractResult>({
            system: systemPrompt,
            user: userContent,
            pdfFiles: params.pdfFiles ?? [],
            images: params.images ?? [],
            attachmentTexts: params.attachmentTexts ?? [],
        });
    }

    static async processAttachment(attachmentId: string) {
        const att = await prisma.attachment.findUnique({
            where: { id: attachmentId },
            include: {
                message: {
                    include: {
                        thread: { include: { inbox: true } },
                    },
                },
            },
        });

        if (!att) return;
        if (att.status !== "PENDING") return;

        const inboxUpn = att.message.thread.inbox.emailAddress;

        try {
            const file = await downloadAttachmentContent(
                inboxUpn,
                att.message.graphMessageId,
                att.graphAttachmentId
            );

            const contentType = file.contentType ?? att.mimeType ?? "application/octet-stream";
            const hash = sha256(file.bytes);

            // store hash ASAP (idempotency + debugging)
            await prisma.attachment.update({
                where: { id: att.id },
                data: { contentHash: hash },
            });

            // Route the bytes to the right OpenAI input channel
            const pdfFiles = isPdf(file.name, contentType)
                ? [{ name: file.name, bytes: file.bytes, contentType: "application/pdf" }]
                : [];

            const images = isImage(file.name, contentType)
                ? [
                    {
                        name: file.name,
                        contentType: contentType.startsWith("image/") ? contentType : "image/png",
                        dataUrl: openai.bufferToDataUrl(
                            file.bytes,
                            contentType.startsWith("image/") ? contentType : "image/png"
                        ),
                    },
                ]
                : [];

            const attachmentTexts =
                pdfFiles.length === 0 && images.length === 0
                    ? [
                        {
                            name: file.name,
                            contentType,
                            text: file.bytes.toString("utf8").slice(0, 30_000),
                        },
                    ]
                    : [];

            // Get Email Body for Context
            const emailBody = att.message.bodyText ?? att.message.bodyPreview ?? null;

            // Perform Extraction
            const result = await ExtractionService.performExtraction({
                filename: file.name,
                contentType,
                pdfFiles,
                images,
                attachmentTexts,
                emailBodyContext: emailBody
            });

            // Cast result to Prisma Input
            const extractedJson: Prisma.InputJsonValue =
                (result as unknown) as Prisma.InputJsonValue;

            await prisma.attachment.update({
                where: { id: att.id },
                data: {
                    status: "EXTRACTED",
                    extractedJson,
                    lastError: null,
                    mimeType: att.mimeType ?? contentType,
                },
            });

            await audit(AuditAction.AI_EXTRACTED, {
                threadId: att.message.threadId,
                messageId: att.messageId,
                payload: { attachmentId: att.id, filename: file.name, contentHash: hash, confidence: result.confidence },
            });

            // Update Case Title logic (keeping existing logic)
            if (result.extracted && typeof result.extracted === 'object') {
                const ej = result.extracted as any;
                const patientName = ej.patient?.name?.full || ej.patient?.name || ej.patientName || ej.name;

                if (patientName && typeof patientName === 'string') {
                    const threadWithCase = await prisma.thread.findUnique({
                        where: { id: att.message.threadId },
                        include: { case: true }
                    });

                    if (threadWithCase?.caseId && threadWithCase.case) {
                        const currentTitle = threadWithCase.case.title;
                        const defaultSubject = threadWithCase.subject || 'Untitled Case';

                        if (currentTitle === defaultSubject || currentTitle === 'Untitled Case') {
                            await prisma.case.update({
                                where: { id: threadWithCase.caseId },
                                data: {
                                    title: `Patient: ${patientName}`,
                                    description: threadWithCase.case.description ? threadWithCase.case.description + `\n\nIdentified Patient: ${patientName}` : `Identified Patient: ${patientName}`
                                }
                            });
                        }
                    }
                }
            }

        } catch (e: unknown) {
            const msg = errorToMessage(e);

            await prisma.attachment.update({
                where: { id: att.id },
                data: {
                    status: "FAILED",
                    lastError: msg,
                },
            });

            // If it's OpenAI, log OPENAI_ERROR. If it's Graph download, it'll still show here, but that's acceptable.
            await audit(AuditAction.OPENAI_ERROR, {
                threadId: att.message.threadId,
                messageId: att.messageId,
                payload: { attachmentId: att.id, error: msg },
            });
        }
    }

    /**
     * Extracts data from Email Body ONLY (when no attachments exist).
     */
    static async extractFromBody(messageId: string): Promise<ExtractResult | null> {
        const msg = await prisma.emailMessage.findUnique({
            where: { id: messageId },
            include: { thread: true }
        });

        if (!msg) return null;

        const bodyText = msg.bodyText ?? msg.bodyPreview ?? "";
        if (!bodyText) return null;

        try {
            // Treat body as a text file
            const result = await ExtractionService.performExtraction({
                filename: "email_body.txt",
                contentType: "text/plain",
                attachmentTexts: [{
                    name: "email_body.txt",
                    contentType: "text/plain",
                    text: bodyText.slice(0, 30_000)
                }],
                emailBodyContext: null // Already provided as text content
            });

            // We don't save to 'Attachment' table since there is none.
            // The caller (SharePointService) will use this result directly.

            await audit(AuditAction.AI_EXTRACTED, {
                threadId: msg.threadId,
                messageId: msg.id,
                payload: { source: "body", confidence: result.confidence },
            });

            return result;

        } catch (e) {
            console.error("[Extraction] Body extraction failed:", e);
            return null;
        }
    }
}
