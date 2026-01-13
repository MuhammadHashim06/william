import { prisma } from "@/lib/db";
import { createNewMessageDraft, sendDraft } from "@/lib/graph";
import { audit } from "@/repositories/audit.repo";
import {
    Department,
    DraftStatus,
    DraftType,
    ESCALATION_SUBJECT_PREFIX,
} from "@/domain/enums";
import { AuditAction } from "@prisma/client";

type TriggerEscalationArgs = {
    threadId: string;
    reason: string;
    actorUserId?: string | null; // optional (system)
};

function escalationInboxForDepartment(department: string): string {
    switch (department) {
        case Department.Staffing:
            return "staffing@therapydepotonline.com";
        case Department.CaseManagement:
            return "services@therapydepotonline.com";
        case Department.Billing:
            return "billing@therapydepotonline.com";
        default:
            throw new Error(`No escalation inbox for department: ${department}`);
    }
}

export class EscalationService {
    static async triggerEscalation(args: TriggerEscalationArgs) {
        const actorUserId = args.actorUserId ?? undefined;

        const thread = await prisma.thread.findUnique({
            where: { id: args.threadId },
            include: {
                inbox: true,
                messages: { orderBy: { receivedAt: "desc" }, take: 1 },
            },
        });
        if (!thread) throw new Error("Thread not found");

        // Idempotency: avoid duplicate escalations for same thread + department
        const existing = await prisma.escalation.findFirst({
            where: { threadId: thread.id, department: thread.department },
        });
        if (existing) return { ok: true, skipped: true };

        const escalationInbox = escalationInboxForDepartment(thread.department);
        const latestMsg = thread.messages[0];

        const subject = `${ESCALATION_SUBJECT_PREFIX} ${thread.subject ?? "No subject"}`;

        const bodyHtml = `
      <p><strong>Escalation Reason:</strong> ${args.reason}</p>
      <p><strong>Department:</strong> ${thread.department}</p>
      <p><strong>Stage:</strong> ${thread.stage}</p>
      <p><strong>Original Inbox:</strong> ${thread.inbox.emailAddress}</p>
      <hr />
      <p><strong>Latest Message Preview:</strong></p>
      <blockquote>${latestMsg?.bodyPreview ?? "N/A"}</blockquote>
    `;

        // 1) Create DB draft record (draft-first record, but we will auto-send)
        const draft = await prisma.draft.create({
            data: {
                threadId: thread.id,
                draftType: DraftType.EscalationInternal,
                status: DraftStatus.Created,
                version: 1,
                subject,
                bodyHtml,
                toJson: [escalationInbox],
                createdByUserId: actorUserId,
            },
        });

        // 2) Create draft message in the escalation mailbox
        const graphDraft = await createNewMessageDraft(escalationInbox, {
            subject,
            bodyHtml,
            to: [escalationInbox],
        });

        if (!graphDraft?.id) {
            await audit(AuditAction.GRAPH_ERROR, {
                threadId: thread.id,
                draftId: draft.id,
                actorUserId,
                payload: { reason: "ESCALATION_GRAPH_DRAFT_FAILED" },
            });
            return { ok: false };
        }

        // 3) Link Graph draft id
        await prisma.draft.update({
            where: { id: draft.id },
            data: { graphDraftMessageId: graphDraft.id },
        });

        // 4) Create escalation record
        const escalation = await prisma.escalation.create({
            data: {
                threadId: thread.id,
                department: thread.department,
                reason: args.reason,
                draftId: draft.id,
            },
        });

        await audit(AuditAction.ESCALATION_TRIGGERED, {
            threadId: thread.id,
            draftId: draft.id,
            actorUserId,
            payload: {
                escalationId: escalation.id,
                department: thread.department,
                inbox: escalationInbox,
            },
        });

        await audit(AuditAction.GRAPH_CREATED_DRAFT, {
            threadId: thread.id,
            draftId: draft.id,
            actorUserId,
            payload: { graphDraftMessageId: graphDraft.id, escalationInbox },
        });

        // 5) AUTO SEND escalation email (this is your requirement)
        await sendDraft(escalationInbox, graphDraft.id);

        await prisma.draft.update({
            where: { id: draft.id },
            data: { status: DraftStatus.Sent },
        });

        await audit(AuditAction.GRAPH_SENT_DRAFT, {
            threadId: thread.id,
            draftId: draft.id,
            actorUserId,
            payload: { graphDraftMessageId: graphDraft.id, escalationInbox },
        });

        await audit(AuditAction.DRAFT_SENT, {
            threadId: thread.id,
            draftId: draft.id,
            actorUserId,
            payload: {},
        });

        return { ok: true };
    }
}
