// import crypto from "node:crypto";
// import { prisma } from "@/lib/db";
// import { Prisma } from "@prisma/client";
// import { audit } from "@/repositories/audit.repo";
// import { openai, type UploadFile, type InlineImage, type InlineTextAttachment } from "@/lib/openai";
// import { AuditAction } from "@prisma/client";
// import { assertDepartment, assertStage } from "@/domain/validators";
// import { Department } from "@/domain/enums";
// import { downloadAttachmentContent } from "@/lib/graph";
// import { getThreadForClassification, markThreadClassified } from "@/repositories/thread.repo";

// type JsonValue =
//     | string
//     | number
//     | boolean
//     | null
//     | { [k: string]: JsonValue }
//     | JsonValue[];

// type AttachmentForClassification = {
//     id: string; // DB attachment id
//     graphAttachmentId: string;
//     filename: string;
//     mimeType: string | null;
//     status: "PENDING" | "EXTRACTED" | "FAILED";
//     contentHash: string | null;
// };

// type MessageForClassification = {
//     id: string; // DB message id
//     graphMessageId: string;
//     fromJson: unknown;
//     subject: string | null;
//     bodyPreview: string | null;
//     bodyHtml: string | null;
//     bodyText: string | null;
//     hasAttachments: boolean;
//     attachments: AttachmentForClassification[];
// };

// type ThreadForClassification = {
//     id: string;
//     processingStatus: "NEW" | "CLASSIFIED" | "DRAFTED" | "DONE" | "FAILED";
//     subject: string | null;
//     inbox: { emailAddress: string };
//     messages: MessageForClassification[];
// };

// type AttachmentExtractOut = {
//     messageGraphId: string;
//     graphAttachmentId: string;
//     filename: string;
//     contentType: string | null;
//     extracted: JsonValue | null;
// };

// type ClassificationInlineResult = {
//     department: Department;
//     stage: string;
//     confidence: number;
//     responseRequired?: boolean;
//     draftTypeSuggested?: string | null;
//     attachments?: AttachmentExtractOut[];
// };

// function sha256(buf: Buffer): string {
//     return crypto.createHash("sha256").update(buf).digest("hex");
// }

// function isThreadForClassification(x: unknown): x is ThreadForClassification {
//     if (!x || typeof x !== "object") return false;
//     const o = x as Record<string, unknown>;
//     const inbox = o.inbox as Record<string, unknown> | null;
//     const messages = o.messages as unknown;

//     return (
//         typeof o.id === "string" &&
//         typeof o.processingStatus === "string" &&
//         !!inbox &&
//         typeof inbox.emailAddress === "string" &&
//         Array.isArray(messages)
//     );
// }

// function extLower(name: string): string {
//     const i = name.lastIndexOf(".");
//     if (i < 0) return "";
//     return name.slice(i + 1).toLowerCase();
// }

// function isPdf(filename: string, mimeType: string | null): boolean {
//     if ((mimeType ?? "").toLowerCase() === "application/pdf") return true;
//     return extLower(filename) === "pdf";
// }

// function isImage(filename: string, mimeType: string | null): boolean {
//     const mt = (mimeType ?? "").toLowerCase();
//     if (mt.startsWith("image/")) return true;
//     const ext = extLower(filename);
//     return ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "webp";
// }

// function isCsv(filename: string, mimeType: string | null): boolean {
//     const mt = (mimeType ?? "").toLowerCase();
//     if (mt.includes("text/csv")) return true;
//     return extLower(filename) === "csv";
// }

// function isDocx(filename: string, mimeType: string | null): boolean {
//     const mt = (mimeType ?? "").toLowerCase();
//     if (mt.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document")) return true;
//     return extLower(filename) === "docx";
// }

// function isXlsx(filename: string, mimeType: string | null): boolean {
//     const mt = (mimeType ?? "").toLowerCase();
//     if (mt.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")) return true;
//     const ext = extLower(filename);
//     return ext === "xlsx" || ext === "xls";
// }

// async function extractDocxText(buf: Buffer): Promise<string> {
//     // npm i mammoth
//     const mammoth = await import("mammoth");
//     const res = await mammoth.extractRawText({ buffer: buf });
//     return (res.value ?? "").trim();
// }

// async function extractXlsxText(buf: Buffer): Promise<string> {
//     // npm i xlsx
//     const xlsx = await import("xlsx");
//     const wb = xlsx.read(buf, { type: "buffer" });
//     const sheetNames = wb.SheetNames ?? [];
//     if (sheetNames.length === 0) return "";
//     const first = wb.Sheets[sheetNames[0]];
//     const csv = xlsx.utils.sheet_to_csv(first);
//     return csv.trim();
// }

// export async function classifyThread(threadId: string) {
//     const raw = await getThreadForClassification(threadId);
//     if (!isThreadForClassification(raw)) return;

//     const thread = raw;
//     if (thread.processingStatus !== "NEW") return;

//     const inboxUpn = thread.inbox.emailAddress;

//     // Build message context
//     const messagesCtx = thread.messages.map((m) => ({
//         graphMessageId: m.graphMessageId,
//         from: m.fromJson,
//         subject: m.subject,
//         preview: m.bodyPreview,
//         bodyHtml: m.bodyHtml,
//         bodyText: m.bodyText,
//         hasAttachments: m.hasAttachments,
//     }));

//     // Files and mappings
//     const pdfFiles: UploadFile[] = [];
//     const images: InlineImage[] = [];
//     const attachmentTexts: InlineTextAttachment[] = [];

//     const attachmentMap: Array<{
//         messageGraphId: string;
//         attachmentDbId: string;
//         graphAttachmentId: string;
//         filename: string;
//         mimeType: string | null;
//         contentHash: string;
//     }> = [];

//     for (const m of thread.messages) {
//         for (const a of m.attachments) {
//             // If already extracted with a hash, skip download completely
//             if (a.status === "EXTRACTED" && a.contentHash) continue;

//             let content: { name: string; contentType: string; bytes: Buffer };
//             try {
//                 // Download bytes from Graph (may fail: non-fileAttachment, deleted, 403, etc.)
//                 content = await downloadAttachmentContent(inboxUpn, m.graphMessageId, a.graphAttachmentId);
//             } catch (e: unknown) {
//                 const msg = e instanceof Error ? e.message : String(e);
//                 await prisma.attachment.update({
//                     where: { id: a.id },
//                     data: { status: "FAILED", lastError: msg },
//                 });
//                 continue;
//             }

//             const hash = sha256(content.bytes);

//             // Store/refresh hash
//             await prisma.attachment.update({
//                 where: { id: a.id },
//                 data: { contentHash: hash },
//             });

//             // If already extracted and same hash, skip
//             if (a.status === "EXTRACTED" && a.contentHash === hash) continue;

//             const contentType = a.mimeType ?? content.contentType ?? "application/octet-stream";

//             try {
//                 // Decide pathway
//                 if (isPdf(a.filename, a.mimeType)) {
//                     pdfFiles.push({
//                         name: a.filename,
//                         bytes: content.bytes,
//                         contentType,
//                     });
//                 } else if (isImage(a.filename, a.mimeType)) {
//                     const imgContentType = contentType.startsWith("image/") ? contentType : "image/png";
//                     images.push({
//                         name: a.filename,
//                         contentType: imgContentType,
//                         dataUrl: openai.bufferToDataUrl(content.bytes, imgContentType),
//                     });
//                 } else if (isCsv(a.filename, a.mimeType)) {
//                     attachmentTexts.push({
//                         name: a.filename,
//                         contentType,
//                         text: content.bytes.toString("utf8").slice(0, 200_000), // guard
//                     });
//                 } else if (isDocx(a.filename, a.mimeType)) {
//                     const text = await extractDocxText(content.bytes);
//                     attachmentTexts.push({
//                         name: a.filename,
//                         contentType,
//                         text: text.slice(0, 200_000),
//                     });
//                 } else if (isXlsx(a.filename, a.mimeType)) {
//                     const text = await extractXlsxText(content.bytes);
//                     attachmentTexts.push({
//                         name: a.filename,
//                         contentType,
//                         text: text.slice(0, 200_000),
//                     });
//                 } else {
//                     // unsupported: mark failed (so thread can still proceed)
//                     await prisma.attachment.update({
//                         where: { id: a.id },
//                         data: {
//                             status: "FAILED",
//                             lastError: `UNSUPPORTED_ATTACHMENT_TYPE filename=${a.filename} mimeType=${a.mimeType ?? "null"}`,
//                         },
//                     });
//                     continue;
//                 }
//             } catch (e: unknown) {
//                 // Any extraction/parser failure should not block the thread
//                 const msg = e instanceof Error ? e.message : String(e);
//                 await prisma.attachment.update({
//                     where: { id: a.id },
//                     data: { status: "FAILED", lastError: msg },
//                 });
//                 continue;
//             }

//             attachmentMap.push({
//                 messageGraphId: m.graphMessageId,
//                 attachmentDbId: a.id,
//                 graphAttachmentId: a.graphAttachmentId,
//                 filename: a.filename,
//                 mimeType: a.mimeType,
//                 contentHash: hash,
//             });
//         }
//     }

//     const system = `
// You classify healthcare operations email threads AND extract useful data from attachments.

// Return STRICT JSON only.

// Choose One Single Department:
// - STAFFING
// - CASE_MANAGEMENT
// - BILLING

// Choose a VALID STAGE BY DEPARTMENT (you MUST follow this):
// - If Department = STAFFING, stage MUST be one of:
//   OPEN_PENDING, REQUEST_CONTACT_INFO, CONTACT_INFO_SENT, PROVIDER_SCHEDULED, STAFFED
// - If Department = CASE_MANAGEMENT, stage MUST be one of:
//   FOLLOWING_UP, COMPLETE
// - If Department = BILLING, stage MUST be one of:
//   FOLLOWING_UP, COMPLETE

// Attachments inputs you may receive:
// - PDFs as files
// - Images as images
// - DOCX/XLSX/CSV provided as extracted text blocks in the prompt

// Use attachment content heavily if email body is sparse.

// Output JSON schema:
// {
//   "department": "STAFFING|CASE_MANAGEMENT|BILLING",
//   "stage": "<VALID_STAGE_FOR_DEPARTMENT>",
//   "confidence": 0.0-1.0,
//   "responseRequired": true|false,
//   "draftTypeSuggested": "<string|null>",
//   "attachments": [
//     {
//       "messageGraphId": "<string>",
//       "graphAttachmentId": "<string>",
//       "filename": "<string>",
//       "contentType": "<string|null>",
//       "extracted": {
//         "docType": "<string|null>",
//         "summaryText": "<string|null>",
//         "patient": { "name": "<string|null>", "dob": "<string|null>", "address": "<string|null>" },
//         "insurance": { "payer": "<string|null>", "memberId": "<string|null>" },
//         "dates": { "evaluationDate": "<string|null>", "dosFrom": "<string|null>", "dosTo": "<string|null>" },
//         "tables": { "invoiceLines": [], "visitLines": [] },
//         "rawText": "<string|null>"
//       }
//     }
//   ]
// }

// Rules:
// - Pick exactly ONE department and ONE valid stage.
// - Do not invent values or choose stages that are not listed for that department.
// - FOLLOWING_UP is not a valid stage for Staffing Department.
// `;

//     const user = JSON.stringify({
//         thread: { id: thread.id, inbox: inboxUpn, subject: thread.subject },
//         messages: messagesCtx,
//         attachmentsToExtract: attachmentMap.map((a) => ({
//             messageGraphId: a.messageGraphId,
//             graphAttachmentId: a.graphAttachmentId,
//             filename: a.filename,
//             contentType: a.mimeType,
//             contentHash: a.contentHash,
//         })),
//         note: {
//             pdfFileCount: pdfFiles.length,
//             imageCount: images.length,
//             textAttachmentCount: attachmentTexts.length,
//         },
//     });

//     let result: ClassificationInlineResult;

//     try {
//         result = await openai.classifyInline<ClassificationInlineResult>({
//             system,
//             user,
//             pdfFiles,
//             images,
//             attachmentTexts,
//         });
//     } catch (e: unknown) {
//         const msg = e instanceof Error ? e.message : String(e);
//         await audit(AuditAction.OPENAI_ERROR, {
//             threadId,
//             payload: { reason: "INLINE_CLASSIFY_FAILED", message: msg },
//         });
//         throw e;
//     }

//     assertDepartment(result.department);
//     assertStage(result.department, result.stage);

//     await markThreadClassified({
//         threadId,
//         department: result.department,
//         stage: result.stage,
//         needsReview: (result.confidence ?? 0) < 0.75,
//     });

//     await audit(AuditAction.AI_CLASSIFIED, {
//         threadId,
//         payload: {
//             department: result.department,
//             stage: result.stage,
//             confidence: result.confidence,
//             responseRequired: result.responseRequired ?? true,
//             draftTypeSuggested: result.draftTypeSuggested ?? null,
//         },
//     });

//     // Persist attachment extraction results
//     if (Array.isArray(result.attachments)) {
//         for (const out of result.attachments) {
//             const match = attachmentMap.find(
//                 (m) => m.messageGraphId === out.messageGraphId && m.graphAttachmentId === out.graphAttachmentId
//             );
//             if (!match) continue;

//             await prisma.attachment.update({
//                 where: { id: match.attachmentDbId },
//                 data: {
//                     status: "EXTRACTED",
//                     extractedJson: out.extracted ?? Prisma.JsonNull,
//                     lastError: null,
//                 },
//             });

//             await audit(AuditAction.AI_EXTRACTED, {
//                 threadId,
//                 payload: {
//                     messageGraphId: out.messageGraphId,
//                     graphAttachmentId: out.graphAttachmentId,
//                     filename: out.filename,
//                 },
//             });
//         }
//     }
// }



import { prisma } from "@/lib/db";
import { audit } from "@/repositories/audit.repo";
import { openai } from "@/lib/openai";
import { AuditAction, Prisma } from "@prisma/client";
import { assertDepartment, assertStage } from "@/domain/validators";
import { Department } from "@/domain/enums";
import { getThreadForClassification, markThreadClassified } from "@/repositories/thread.repo";

type AttachmentForClassification = {
    id: string; // DB attachment id
    graphAttachmentId: string;
    filename: string;
    mimeType: string | null;
    status: "PENDING" | "EXTRACTED" | "FAILED";
    contentHash: string | null;
};

type MessageForClassification = {
    id: string; // DB message id
    graphMessageId: string;
    fromJson: unknown;
    subject: string | null;
    bodyPreview: string | null;
    bodyHtml: string | null;
    bodyText: string | null;
    hasAttachments: boolean;
    attachments: AttachmentForClassification[];
};

type ThreadForClassification = {
    id: string;
    processingStatus: "NEW" | "CLASSIFIED" | "DRAFTED" | "DONE" | "FAILED";
    subject: string | null;
    inbox: { emailAddress: string };
    messages: MessageForClassification[];
};

type ClassificationResult = {
    department: Department;
    stage: string;
    confidence: number;
    responseRequired?: boolean;
    draftTypeSuggested?: string | null;
};

function isThreadForClassification(x: unknown): x is ThreadForClassification {
    if (!x || typeof x !== "object") return false;
    const o = x as Record<string, unknown>;
    const inbox = o.inbox as Record<string, unknown> | null;
    const messages = o.messages as unknown;

    return (
        typeof o.id === "string" &&
        typeof o.processingStatus === "string" &&
        !!inbox &&
        typeof inbox.emailAddress === "string" &&
        Array.isArray(messages)
    );
}

/**
 * Keep attachment payload small.
 * We only pass a subset of extractedJson so we don't blow context.
 */
function shrinkExtractedJson(v: unknown, maxChars = 6000): unknown {
    // If it's already small string
    if (typeof v === "string") return v.slice(0, maxChars);

    // For objects/arrays, stringify and slice.
    // Minimal and safe. (No heavy traversal logic.)
    try {
        const s = JSON.stringify(v);
        if (s.length <= maxChars) return v;
        return { truncated: true, preview: s.slice(0, maxChars) };
    } catch {
        return { truncated: true, preview: String(v).slice(0, maxChars) };
    }
}

export async function classifyThread(threadId: string) {
    const raw = await getThreadForClassification(threadId);
    if (!isThreadForClassification(raw)) return;

    const thread = raw;
    if (thread.processingStatus !== "NEW") return;

    // Hard safety: do not classify if any attachment still PENDING
    const hasPending = thread.messages.some((m) => m.attachments?.some((a) => a.status === "PENDING"));
    if (hasPending) return;

    const inboxUpn = thread.inbox.emailAddress;

    // Latest message full, older minimal.
    const MAX_OLDER = 2;
    const ordered = thread.messages; // assuming newest-first in your repo
    const latest = ordered[0];
    const older = ordered.slice(1, 1 + MAX_OLDER);

    const messagesCtx = [
        {
            graphMessageId: latest.graphMessageId,
            from: latest.fromJson,
            subject: latest.subject,
            preview: (latest.bodyPreview ?? "").slice(0, 2000),
            bodyHtml: (latest.bodyHtml ?? "").slice(0, 12000),
            bodyText: (latest.bodyText ?? "").slice(0, 12000),
            hasAttachments: latest.hasAttachments,
        },
        ...older.map((m) => ({
            graphMessageId: m.graphMessageId,
            from: m.fromJson,
            subject: m.subject,
            preview: (m.bodyPreview ?? "").slice(0, 1500),
            bodyHtml: null,
            bodyText: null,
            hasAttachments: m.hasAttachments,
        })),
    ];

    // Pull extracted attachments from DB for this thread
    const extracted = await prisma.attachment.findMany({
        where: {
            status: "EXTRACTED",
            message: { threadId: thread.id },
        },
        select: {
            graphAttachmentId: true,
            filename: true,
            mimeType: true,
            extractedJson: true,
            message: { select: { graphMessageId: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 8, // hard cap
    });

    const extractedCtx = extracted.map((a) => ({
        messageGraphId: a.message.graphMessageId,
        graphAttachmentId: a.graphAttachmentId,
        filename: a.filename,
        contentType: a.mimeType,
        extracted: shrinkExtractedJson(a.extractedJson),
    }));

    const system = `
You classify healthcare operations email threads.
Return STRICT JSON only.

Choose One Single Department:
- STAFFING
- CASE_MANAGEMENT
- BILLING

Choose a VALID STAGE BY DEPARTMENT (you MUST follow this):
- If Department = STAFFING, stage MUST be one of:
  OPEN_PENDING, REQUEST_CONTACT_INFO, CONTACT_INFO_SENT, PROVIDER_SCHEDULED, STAFFED
- If Department = CASE_MANAGEMENT, stage MUST be one of:
  FOLLOWING_UP, COMPLETE
- If Department = BILLING, stage MUST be one of:
  FOLLOWING_UP, COMPLETE

You may receive "extractedAttachments" which contain previously extracted structured data.
Use that extracted content heavily if email body is sparse.

Output JSON schema:
{
  "department": "STAFFING|CASE_MANAGEMENT|BILLING",
  "stage": "<VALID_STAGE_FOR_DEPARTMENT>",
  "confidence": 0.0-1.0,
  "responseRequired": true|false,
  "draftTypeSuggested": "<string|null>"
}

Rules:
- Pick exactly ONE department and ONE valid stage.
- Do not invent values or choose stages that are not listed for that department.
- FOLLOWING_UP is not a valid stage for Staffing Department.
`;

    const user = JSON.stringify({
        thread: { id: thread.id, inbox: inboxUpn, subject: thread.subject },
        messages: messagesCtx,
        extractedAttachments: extractedCtx,
    });

    let result: ClassificationResult;

    try {
        // LIGHTWEIGHT call: no files, no images, no long text attachments
        result = await openai.classifyInline<ClassificationResult>({
            system,
            user,
            pdfFiles: [],
            images: [],
            attachmentTexts: [],
        });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        await audit(AuditAction.OPENAI_ERROR, {
            threadId,
            payload: { reason: "CLASSIFY_FAILED", message: msg },
        });
        throw e;
    }

    assertDepartment(result.department);
    assertStage(result.department, result.stage);

    await markThreadClassified({
        threadId,
        department: result.department,
        stage: result.stage,
        needsReview: (result.confidence ?? 0) < 0.75,
    });

    await audit(AuditAction.AI_CLASSIFIED, {
        threadId,
        payload: {
            department: result.department,
            stage: result.stage,
            confidence: result.confidence,
            responseRequired: result.responseRequired ?? true,
            draftTypeSuggested: result.draftTypeSuggested ?? null,
            extractedAttachmentCount: extractedCtx.length,
        },
    });

    // Create Automated Note for AI Classification
    await prisma.note.create({
        data: {
            threadId,
            createdByUserId: null, // System/AI
            description: `[AI] Classified thread as ${result.department} / ${result.stage.replace(/_/g, ' ')}`
        }
    });
}
