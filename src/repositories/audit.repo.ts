import { prisma } from "@/lib/db";
import { AuditAction, Prisma } from "@prisma/client";

type AuditCtx = {
    threadId?: string;
    messageId?: string;
    draftId?: string;
    actorUserId?: string;
    payload?: Prisma.InputJsonValue;
};

export async function audit(action: AuditAction, ctx: AuditCtx) {
    return prisma.auditLog.create({
        data: {
            action,
            threadId: ctx.threadId,
            messageId: ctx.messageId,
            draftId: ctx.draftId,
            actorUserId: ctx.actorUserId,
            payload: ctx.payload ?? Prisma.JsonNull,
        },
    });
}
