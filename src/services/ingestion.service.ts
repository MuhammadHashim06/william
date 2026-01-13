import {
    fetchDeltaAll,
    fetchDeltaAllFrom,
    getMessage,
    listMessageAttachments,
    type GraphAttachmentListItem,
} from "@/lib/graph";
import {
    getAllSharedInboxes,
    getInboxCursor,
    upsertInboxCursor,
} from "@/repositories/inbox.repo";
import { upsertThread } from "@/repositories/thread.repo";
import { upsertMessage } from "@/repositories/message.repo";
import { upsertAttachment } from "@/repositories/attachment.repo";
import { audit } from "@/repositories/audit.repo";
import { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

function toDate(s?: string | null) {
    if (!s) return null;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
}

// Optional env: limit initial backfill only (when no delta cursor yet)
function getLookbackDays(): number | null {
    const raw = process.env.GRAPH_INGEST_LOOKBACK_DAYS;
    if (!raw) return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.floor(n);
}

function isoDaysAgo(days: number): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString();
}

// Graph SDK types are not JSON-typed, but they are JSON-serializable.
// This helper forces correct Prisma JSON input types.
function asJson(v: unknown): Prisma.InputJsonValue {
    return v as Prisma.InputJsonValue;
}

export class IngestionService {
    static async runOnce() {
        const inboxes = await getAllSharedInboxes();
        const lookbackDays = getLookbackDays();

        for (const inbox of inboxes) {
            const cursor = await getInboxCursor(inbox.id);

            // IMPORTANT:
            // - If we already have a deltaLink, always use it (incremental).
            // - Only apply lookback on FIRST sync (no cursor yet).
            // - Always page through @odata.nextLink and persist ONLY final @odata.deltaLink.
            const { items, deltaLink } = cursor?.deltaLink
                ? await fetchDeltaAll(inbox.emailAddress, cursor.deltaLink)
                : lookbackDays
                    ? await fetchDeltaAllFrom(inbox.emailAddress, isoDaysAgo(lookbackDays))
                    : await fetchDeltaAll(inbox.emailAddress, null);

            for (const item of items) {
                if (!item?.id || !item?.conversationId) continue;

                // Fetch full message (body, recipients, etc.)
                const msg = await getMessage(inbox.emailAddress, item.id);
                if (!msg?.conversationId) continue;

                const thread = await upsertThread({
                    inboxId: inbox.id,
                    graphConversationId: msg.conversationId,
                    subject: msg.subject ?? null,
                    lastMessageAt: toDate(msg.receivedDateTime) ?? null,
                });

                // Auto-create Case if not exists
                if (!thread.caseId) {
                    const caseTitle = msg.subject || 'Untitled Case';

                    try {
                        const newCase = await prisma.case.create({
                            data: {
                                title: caseTitle,
                                status: 'OPEN',
                                priority: 'MEDIUM',
                                description: `Auto-created from thread: ${msg.subject || 'No Subject'}`
                            }
                        });

                        await prisma.thread.update({
                            where: { id: thread.id },
                            data: { caseId: newCase.id }
                        });

                        // Update thread object for subsequent use
                        thread.caseId = newCase.id;
                    } catch (error) {
                        console.error('Failed to auto-create case:', error);
                    }
                }

                const storedMsg = await upsertMessage({
                    threadId: thread.id,
                    graphMessageId: msg.id,
                    internetMessageId: msg.internetMessageId ?? null,

                    // JSON fields (Prisma): do not pass plain null for Json inputs
                    fromJson: msg.from ? asJson({
                        ...msg.from,
                        // Provide nested structures expected by some UI versions
                        sender: msg.from,
                        from: msg.from
                    }) : Prisma.JsonNull,
                    toJson: asJson(msg.toRecipients ?? []),
                    ccJson: asJson(msg.ccRecipients ?? []),

                    subject: msg.subject ?? null,
                    bodyPreview: msg.bodyPreview ?? null,
                    bodyHtml:
                        msg.body?.contentType?.toLowerCase?.() === "html"
                            ? msg.body?.content ?? null
                            : null,
                    bodyText:
                        msg.body?.contentType?.toLowerCase?.() === "text"
                            ? msg.body?.content ?? null
                            : null,

                    receivedAt: toDate(msg.receivedDateTime),
                    sentAt: toDate(msg.sentDateTime),

                    hasAttachments: !!msg.hasAttachments,
                });

                await audit(AuditAction.GRAPH_INGESTED_MESSAGE, {
                    threadId: thread.id,
                    messageId: storedMsg.id,
                    payload: {
                        inbox: inbox.emailAddress,
                        graphMessageId: msg.id,
                        conversationId: msg.conversationId,
                    },
                });

                if (msg.hasAttachments) {
                    const att = await listMessageAttachments(inbox.emailAddress, msg.id);
                    const attachments: GraphAttachmentListItem[] = att.value ?? [];

                    for (const a of attachments) {
                        if (!a.id || !a.name) continue;

                        await upsertAttachment({
                            messageId: storedMsg.id,
                            graphAttachmentId: a.id,
                            filename: a.name,
                            mimeType: a.contentType ?? null,
                            sizeBytes: typeof a.size === "number" ? a.size : null,
                        });
                    }
                }
            }

            // Persist ONLY the final deltaLink (if present)
            if (deltaLink) {
                await upsertInboxCursor(inbox.id, deltaLink);
            }
        }
    }
}
