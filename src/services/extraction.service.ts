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

type ExtractResult = {
    extracted: unknown;
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

            const result = await openai.classifyInline<ExtractResult>({
                system: `
You extract structured data from a SINGLE healthcare document attachment.
Return STRICT JSON only with keys: extracted, confidence.
- extracted must be a JSON object or null
- confidence is 0.0 to 1.0
If you cannot extract, return extracted=null and confidence low.
`,
                user: JSON.stringify({
                    filename: file.name,
                    contentType,
                }),
                pdfFiles,
                images,
                attachmentTexts,
            });

            const extractedJson: Prisma.InputJsonValue =
                (result.extracted ?? Prisma.JsonNull) as Prisma.InputJsonValue;

            await prisma.attachment.update({
                where: { id: att.id },
                data: {
                    status: "EXTRACTED",
                    extractedJson,
                    lastError: null,
                    mimeType: att.mimeType ?? contentType, // keep mimeType populated if missing
                },
            });

            await audit(AuditAction.AI_EXTRACTED, {
                threadId: att.message.threadId,
                messageId: att.messageId,
                payload: { attachmentId: att.id, filename: file.name, contentHash: hash, confidence: result.confidence },
            });

            // Update Case Title if Patient Name is found and Case exists
            if (extractedJson && typeof extractedJson === 'object' && !Array.isArray(extractedJson)) {
                // Try to find a patient name in common fields
                const ej = extractedJson as any;
                const patientName = ej.patient?.name?.full || ej.patient?.name || ej.patientName || ej.name;

                if (patientName && typeof patientName === 'string') {
                    const threadWithCase = await prisma.thread.findUnique({
                        where: { id: att.message.threadId },
                        include: { case: true }
                    });

                    if (threadWithCase?.caseId && threadWithCase.case) {
                        // Check if current title is generic or needs update
                        // We strictly update if the current title matches the thread subject (which was the default)
                        // OR if it's "Untitled Case"
                        // OR we can just prepend "Patient: " if not already there.

                        // Strategy: If title equals thread subject (auto-created default), replace it.
                        // If user changed it, leave it alone.
                        // But since we can't easily track user edits vs auto, we'll assume if it matches subject it's safe.

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
}
