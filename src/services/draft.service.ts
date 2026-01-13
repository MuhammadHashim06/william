import { prisma } from "@/lib/db";
import { openai } from "@/lib/openai";
import { createNewMessageDraft, createReplyDraft, patchDraft } from "@/lib/graph";
import { audit } from "@/repositories/audit.repo";
import { createDraft, findLatestDraftForThread, linkGraphDraftId } from "@/repositories/draft.repo";
import { getThreadWithLatestMessage, markThreadDrafted } from "@/repositories/thread.repo";
import { DraftStatus, DraftType } from "@/domain/enums";
import { assertDraftType } from "@/domain/validators";
import { AuditAction } from "@prisma/client";

type DraftResult = {
    draftType: DraftType;
    subject: string;
    bodyHtml: string;
    to: unknown; // normalize later (OpenAI may return objects)
    cc?: unknown;
    confidence: number;
};

type ExtractedAttachmentCtx = {
    filename: string;
    mimeType: string | null;
    extractedJson: unknown | null;
};

function normalizeEmailList(input: unknown): string[] {
    const out: string[] = [];

    const push = (v: unknown) => {
        if (typeof v !== "string") return;
        const s = v.trim();
        if (!s) return;
        out.push(s);
    };

    const pullFromObj = (o: unknown) => {
        if (!o || typeof o !== "object") return;
        const r = o as Record<string, unknown>;

        // { address: "a@b.com" }
        if (typeof r.address === "string") {
            push(r.address);
            return;
        }

        // { emailAddress: { address: "a@b.com" } }
        const emailAddress = r.emailAddress;
        if (emailAddress && typeof emailAddress === "object") {
            const ea = emailAddress as Record<string, unknown>;
            if (typeof ea.address === "string") push(ea.address);
        }
    };

    if (Array.isArray(input)) {
        for (const v of input) {
            push(v);
            pullFromObj(v);
        }
    } else {
        push(input);
        pullFromObj(input);
    }

    // de-dupe
    return Array.from(new Set(out));
}

function isInvalidReplyItemError(e: unknown): boolean {
    const msg = e instanceof Error ? e.message : String(e);
    return msg.includes("Item type is invalid for creating a Reply");
}

export class DraftService {
    static async createDraftForThread(threadId: string) {
        const thread = await getThreadWithLatestMessage(threadId);
        if (!thread) return;

        // Only draft after classification step
        if (thread.processingStatus !== "CLASSIFIED") return;

        const latest = thread.messages?.[0];
        if (!latest) return;

        // If response not required, close thread
        if (thread.responseRequired === false) {
            await prisma.thread.update({
                where: { id: threadId },
                data: { processingStatus: "DONE" },
            });
            return;
        }

        // ---- Idempotency guard: if we already have a draft + graph draft id, mark drafted and stop
        const existingDraft = await findLatestDraftForThread(thread.id);
        if (existingDraft?.graphDraftMessageId) {
            await markThreadDrafted({
                threadId: thread.id,
                draftTypeSuggested: thread.draftTypeSuggested ?? existingDraft.draftType,
                responseRequired: true,
            });
            return;
        }

        // Pull extracted attachments for latest message
        const latestMsgWithAtt = await prisma.emailMessage.findUnique({
            where: { id: latest.id },
            include: { attachments: true },
        });

        const attachmentCtx: ExtractedAttachmentCtx[] =
            latestMsgWithAtt?.attachments
                .filter((a) => a.status === "EXTRACTED")
                .map((a) => ({
                    filename: a.filename,
                    mimeType: a.mimeType ?? null,
                    extractedJson: a.extractedJson ?? null,
                })) ?? [];

        // ---- Generate (or re-generate) draft text
        const result = await openai.draft<DraftResult>({
            system: `
You write professional healthcare operations email drafts.

Return JSON only with keys:
- draftType
- subject
- bodyHtml
- to
- cc
- confidence

Allowed draftType values:
EXTERNAL_REPLY
STAFFING_REQUEST_CONTACT_INFO
STAFFING_STAFFED_CONFIRMATION
CASE_MANAGEMENT_FOLLOW_UP
BILLING_FOLLOW_UP
AUTHORIZATION_FOLLOW_UP
ESCALATION_INTERNAL

Rules:
- Safe, professional, concise.
- Use extracted attachment data if present.
- No internal notes in external drafts.
- If unsure: draftType=EXTERNAL_REPLY with lower confidence.
`,
            user: JSON.stringify({
                thread: {
                    id: thread.id,
                    department: thread.department,
                    stage: thread.stage,
                    subject: thread.subject,
                    inbox: thread.inbox.emailAddress,
                },
                latestMessage: {
                    from: latest.fromJson,
                    to: latest.toJson,
                    cc: latest.ccJson,
                    subject: latest.subject,
                    preview: latest.bodyPreview,
                    bodyHtml: latest.bodyHtml,
                    bodyText: latest.bodyText,
                },
                extractedAttachments: attachmentCtx,
            }),
        });

        assertDraftType(result.draftType);

        const to = normalizeEmailList(result.to);
        const cc = normalizeEmailList(result.cc);

        // ---- Create platform draft if not exists; otherwise reuse existingDraft (avoid duplicates)
        const platformDraft =
            existingDraft ??
            (await createDraft({
                threadId: thread.id,
                draftType: result.draftType,
                status: DraftStatus.Created,
                subject: result.subject ?? null,
                bodyHtml: result.bodyHtml ?? null,
                bodyText: null,
                toJson: to,
                ccJson: cc,
                createdByUserId: null,
            }));

        // If we reused existing draft, update content so UI stays fresh
        if (existingDraft) {
            await prisma.draft.update({
                where: { id: existingDraft.id },
                data: {
                    draftType: result.draftType,
                    status: DraftStatus.Created,
                    subject: result.subject ?? null,
                    bodyHtml: result.bodyHtml ?? null,
                    toJson: to as never,
                    ccJson: cc as never,
                },
            });
        }

        await audit(AuditAction.DRAFT_CREATED, {
            threadId: thread.id,
            draftId: platformDraft.id,
            payload: { draftType: result.draftType, confidence: result.confidence },
        });

        // ---- Create Outlook draft (prefer reply, fallback to new message for non-replyable items)
        const inboxUpn = thread.inbox.emailAddress;

        let graphDraftId: string | null = null;
        let graphConversationId: string | undefined;

        try {
            const graphDraft = await createReplyDraft(inboxUpn, latest.graphMessageId, "<p></p>");
            if (!graphDraft?.id) throw new Error("Graph createReply returned no id");

            await patchDraft(inboxUpn, graphDraft.id, {
                subject: result.subject,
                bodyHtml: result.bodyHtml,
                to,
                cc,
            });

            graphDraftId = graphDraft.id;
            graphConversationId = graphDraft.conversationId;
        } catch (e: unknown) {
            if (!isInvalidReplyItemError(e)) {
                await audit(AuditAction.GRAPH_ERROR, {
                    threadId: thread.id,
                    draftId: platformDraft.id,
                    payload: { reason: "GRAPH_CREATE_REPLY_FAILED", message: e instanceof Error ? e.message : String(e) },
                });
                return;
            }

            // Fallback: create new draft message (still draft-first)
            const newDraft = await createNewMessageDraft(inboxUpn, {
                subject: result.subject,
                bodyHtml: result.bodyHtml,
                to,
                cc,
            });

            if (!newDraft?.id) {
                await audit(AuditAction.GRAPH_ERROR, {
                    threadId: thread.id,
                    draftId: platformDraft.id,
                    payload: { reason: "GRAPH_CREATE_NEW_DRAFT_FAILED" },
                });
                return;
            }

            graphDraftId = newDraft.id;
            graphConversationId = newDraft.conversationId;
        }

        // ---- Idempotent link: if link fails due to uniqueness, stop and flag review
        const linked = await linkGraphDraftId(platformDraft.id, graphDraftId);
        if (!linked) {
            await prisma.thread.update({
                where: { id: thread.id },
                data: { needsReview: true },
            });

            await audit(AuditAction.GRAPH_ERROR, {
                threadId: thread.id,
                draftId: platformDraft.id,
                payload: {
                    reason: "GRAPH_DRAFT_ID_ALREADY_LINKED",
                    graphDraftMessageId: graphDraftId,
                },
            });
            return;
        }

        await audit(AuditAction.GRAPH_CREATED_DRAFT, {
            threadId: thread.id,
            draftId: platformDraft.id,
            payload: {
                graphDraftMessageId: graphDraftId,
                conversationId: graphConversationId,
            },
        });

        await markThreadDrafted({
            threadId: thread.id,
            draftTypeSuggested: result.draftType,
            responseRequired: true,
        });

        await audit(AuditAction.AI_DRAFTED, {
            threadId: thread.id,
            draftId: platformDraft.id,
            payload: { draftType: result.draftType, confidence: result.confidence },
        });
    }
}
