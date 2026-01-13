import { prisma } from "@/lib/db";

export async function createEscalation(params: {
    threadId: string;
    department: string;
    reason: string;
    draftId?: string | null;
}) {
    return prisma.escalation.create({
        data: {
            threadId: params.threadId,
            department: params.department,
            reason: params.reason,
            draftId: params.draftId ?? null,
        },
    });
}
