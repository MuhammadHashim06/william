import { prisma } from "@/lib/db";
import { Department, StaffingStage } from "@/domain/enums";

export async function upsertThread(params: {
    inboxId: string;
    graphConversationId: string;
    subject?: string | null;
    lastMessageAt?: Date | null;
}) {
    const defaultDepartment = Department.Staffing;
    const defaultStage = StaffingStage.OpenPending;

    return prisma.thread.upsert({
        where: {
            inboxId_graphConversationId: {
                inboxId: params.inboxId,
                graphConversationId: params.graphConversationId,
            },
        },
        update: {
            subject: params.subject ?? undefined,
            lastMessageAt: params.lastMessageAt ?? undefined,
        },
        create: {
            inboxId: params.inboxId,
            graphConversationId: params.graphConversationId,
            subject: params.subject ?? null,
            lastMessageAt: params.lastMessageAt ?? null,
            department: defaultDepartment,
            stage: defaultStage,
            needsReview: false,
            processingStatus: "NEW",
        },
    });
}

export async function getThreadForClassification(threadId: string) {
    return prisma.thread.findUnique({
        where: { id: threadId },
        include: {
            inbox: true,
            messages: {
                orderBy: { receivedAt: "asc" },
                take: 5,
                include: { attachments: true },
            },
        },
    });
}

export async function markThreadClassified(params: {
    threadId: string;
    department: string;
    stage: string;
    needsReview: boolean;
}) {
    return prisma.thread.update({
        where: { id: params.threadId },
        data: {
            department: params.department,
            stage: params.stage,
            needsReview: params.needsReview,
            processingStatus: "CLASSIFIED",
        },
    });
}

export async function getThreadWithLatestMessage(threadId: string) {
    return prisma.thread.findUnique({
        where: { id: threadId },
        include: {
            inbox: true,
            messages: { orderBy: { receivedAt: "desc" }, take: 1 },
        },
    });
}

export async function markThreadDrafted(params: {
    threadId: string;
    draftTypeSuggested?: string | null;
    responseRequired?: boolean | null;
}) {
    return prisma.thread.update({
        where: { id: params.threadId },
        data: {
            processingStatus: "DRAFTED",
            draftTypeSuggested: params.draftTypeSuggested ?? undefined,
            responseRequired: params.responseRequired ?? undefined,
        },
    });
}
