import { prisma } from "@/lib/db";
import { audit } from "@/repositories/audit.repo";
import { AuditAction } from "@prisma/client";
import { Department, isValidStageForDepartment } from "@/domain/enums";

export class StageService {
    static async changeStage(args: { threadId: string; stage: string; actorUserId: string }) {
        const thread = await prisma.thread.findUnique({ where: { id: args.threadId } });
        if (!thread) throw new Error("Thread not found");

        // Only allow stage change within current department (safe without UI/auth)
        const department = thread.department as Department; // not any
        if (!Object.values(Department).includes(department)) {
            throw new Error(`Invalid department on thread: ${thread.department}`);
        }

        if (!isValidStageForDepartment(department, args.stage)) {
            throw new Error(`Invalid stage '${args.stage}' for department '${department}'`);
        }

        await prisma.$transaction(async (tx) => {
            await tx.thread.update({
                where: { id: args.threadId },
                data: {
                    stage: args.stage,
                    ownerUserId: args.actorUserId,
                },
            });
        });

        await audit(AuditAction.STAGE_CHANGED, {
            threadId: args.threadId,
            actorUserId: args.actorUserId,
            payload: { stage: args.stage },
        });

        await audit(AuditAction.OWNER_CHANGED, {
            threadId: args.threadId,
            actorUserId: args.actorUserId,
            payload: { ownerUserId: args.actorUserId },
        });

        return { ok: true };
    }
}
