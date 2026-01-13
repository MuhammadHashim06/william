import { prisma } from "@/lib/db";
import { patchDraft, sendDraft } from "@/lib/graph";
import { audit } from "@/repositories/audit.repo";
import { DraftStatus } from "@/domain/enums";
import { AuditAction } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { DraftType } from "@/domain/enums"; // add this

type JsonInput = Prisma.InputJsonValue;
type JsonValue = Prisma.JsonValue;

function normalizeJsonEmailList(v: unknown): string[] {
    // reuse your existing normalizeEmailList logic if you want
    if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
    if (typeof v === "string") return [v];
    return [];
}

type EditPatch = {
    subject?: string;
    bodyHtml?: string;
    to?: string[];
    cc?: string[];
};

export class DraftActionsService {
    static async editDraft(draftId: string, actorUserId: string, patch: EditPatch) {
        const current = await prisma.draft.findUnique({
            where: { id: draftId },
            include: { thread: { include: { inbox: true } } },
        });
        if (!current) throw new Error("Draft not found");
        if (!current.thread) throw new Error("Thread not found");

        const inboxUpn = current.thread.inbox.emailAddress;

        // Find the latest version for this thread + draftType
        const latest = await prisma.draft.findFirst({
            where: { threadId: current.threadId, draftType: current.draftType },
            orderBy: [{ version: "desc" }],
        });
        if (!latest) throw new Error("Latest draft not found");

        // Ensure we have the Graph draft id on the latest row
        const graphId = latest.graphDraftMessageId;
        if (!graphId) throw new Error("Draft is not linked to an Outlook draft (graphDraftMessageId missing)");

        // Patch the Outlook draft first (if this fails, we shouldn't version bump DB)
        await patchDraft(inboxUpn, graphId, {
            subject: patch.subject,
            bodyHtml: patch.bodyHtml,
            to: patch.to,
            cc: patch.cc,
        });

        // DB versioning:
        // - move graphDraftMessageId off the previous latest row (must be null to preserve uniqueness)
        // - create a new row with version+1 holding the graphDraftMessageId
        const nextVersion = latest.version + 1;

        await prisma.$transaction(async (tx) => {
            await tx.draft.update({
                where: { id: latest.id },
                data: {
                    graphDraftMessageId: null, // critical due to @unique
                },
            });

            const toList = patch.to ?? (latest.toJson as unknown as string[]);
            const ccList = patch.cc ?? (latest.ccJson as unknown as string[] | undefined);

            await tx.draft.create({
                data: {
                    threadId: latest.threadId,
                    draftType: latest.draftType,
                    status: DraftStatus.Edited,
                    version: nextVersion,
                    graphDraftMessageId: graphId,
                    subject: patch.subject ?? latest.subject ?? undefined,
                    bodyHtml: patch.bodyHtml ?? latest.bodyHtml ?? undefined,
                    bodyText: latest.bodyText ?? undefined,
                    toJson: toList as unknown as Prisma.InputJsonValue,
                    ccJson: ccList ? (ccList as unknown as Prisma.InputJsonValue) : undefined,
                    createdByUserId: latest.createdByUserId ?? undefined,
                    lastEditedByUserId: actorUserId,
                },
            });
        });

        await audit(AuditAction.DRAFT_EDITED, {
            threadId: current.threadId,
            draftId: draftId,
            actorUserId,
            payload: { patch, nextVersion },
        });

        return { ok: true };
    }

    static async approveDraft(draftId: string, actorUserId: string) {
        const d = await prisma.draft.findUnique({
            where: { id: draftId },
            include: { thread: { include: { inbox: true } } },
        });
        if (!d) throw new Error("Draft not found");

        // Approve the latest version (safety)
        const latest = await prisma.draft.findFirst({
            where: { threadId: d.threadId, draftType: d.draftType },
            orderBy: [{ version: "desc" }],
        });
        if (!latest) throw new Error("Latest draft not found");

        await prisma.draft.update({
            where: { id: latest.id },
            data: { status: DraftStatus.Approved },
        });

        await audit(AuditAction.DRAFT_APPROVED, {
            threadId: d.threadId,
            draftId: latest.id,
            actorUserId,
            payload: {},
        });

        return { ok: true };
    }

    static async sendApprovedDraft(draftId: string, actorUserId: string) {
        const d = await prisma.draft.findUnique({
            where: { id: draftId },
            include: { thread: { include: { inbox: true } } },
        });
        if (!d) throw new Error("Draft not found");

        const latest = await prisma.draft.findFirst({
            where: { threadId: d.threadId, draftType: d.draftType },
            orderBy: [{ version: "desc" }],
        });
        if (!latest) throw new Error("Latest draft not found");

        // HARD RULE: platform only sends escalation emails
        if (latest.draftType !== DraftType.EscalationInternal) {
            throw new Error("Sending is only allowed for escalation drafts. External drafts must remain drafts only.");
        }

        if (latest.status !== DraftStatus.Approved) {
            throw new Error("Escalation draft must be APPROVED before sending");
        }

        const graphId = latest.graphDraftMessageId;
        if (!graphId) throw new Error("graphDraftMessageId missing");

        const inboxUpn = d.thread.inbox.emailAddress;

        await sendDraft(inboxUpn, graphId);

        await prisma.$transaction(async (tx) => {
            await tx.draft.update({
                where: { id: latest.id },
                data: { status: DraftStatus.Sent },
            });
            await tx.thread.update({
                where: { id: d.threadId },
                data: { ownerUserId: actorUserId }, // escalation sender becomes owner (fine)
            });
        });

        await audit(AuditAction.GRAPH_SENT_DRAFT, {
            threadId: d.threadId,
            draftId: latest.id,
            actorUserId,
            payload: { graphDraftMessageId: graphId },
        });

        await audit(AuditAction.DRAFT_SENT, {
            threadId: d.threadId,
            draftId: latest.id,
            actorUserId,
            payload: {},
        });

        await audit(AuditAction.OWNER_CHANGED, {
            threadId: d.threadId,
            draftId: latest.id,
            actorUserId,
            payload: { ownerUserId: actorUserId },
        });

        return { ok: true };
    }


static async discardDraft(draftId: string, actorUserId: string) {
        const d = await prisma.draft.findUnique({ where: { id: draftId } });
        if (!d) throw new Error("Draft not found");

        const latest = await prisma.draft.findFirst({
            where: { threadId: d.threadId, draftType: d.draftType },
            orderBy: [{ version: "desc" }],
        });
        if (!latest) throw new Error("Latest draft not found");

        await prisma.draft.update({
            where: { id: latest.id },
            data: { status: DraftStatus.Discarded },
        });

        await audit(AuditAction.DRAFT_DISCARDED, {
            threadId: d.threadId,
            draftId: latest.id,
            actorUserId,
            payload: {},
        });

        return { ok: true };
    }
}
