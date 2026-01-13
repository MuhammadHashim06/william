import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export type CreateDraftParams = {
    threadId: string;
    draftType: string;
    status: string;
    subject: string | null;
    bodyHtml: string | null;
    bodyText: string | null;
    toJson: unknown; // string[] in practice
    ccJson: unknown | null; // string[] in practice
    createdByUserId: string | null;
};

export async function createDraft(p: CreateDraftParams) {
    return prisma.draft.create({
        data: {
            threadId: p.threadId,
            draftType: p.draftType,
            status: p.status,
            subject: p.subject,
            bodyHtml: p.bodyHtml,
            bodyText: p.bodyText,
            toJson: p.toJson as never,
            ccJson: (p.ccJson ?? null) as never,
            createdByUserId: p.createdByUserId ?? null,
        },
    });
}

export async function findLatestDraftForThread(threadId: string) {
    return prisma.draft.findFirst({
        where: { threadId },
        orderBy: { createdAt: "desc" },
    });
}

/**
 * Idempotent graph draft linking:
 * - If this draft already has the same graphDraftMessageId -> ok
 * - If the graphDraftMessageId is already used by another Draft -> return null (caller decides what to do)
 */
export async function linkGraphDraftId(draftId: string, graphDraftMessageId: string) {
    // If already linked correctly, do nothing
    const existing = await prisma.draft.findUnique({ where: { id: draftId } });
    if (!existing) return null;

    if (existing.graphDraftMessageId === graphDraftMessageId) return existing;

    // If graphDraftMessageId is already linked to some other row, do NOT violate uniqueness
    const taken = await prisma.draft.findFirst({
        where: { graphDraftMessageId },
        select: { id: true },
    });
    if (taken && taken.id !== draftId) return null;

    try {
        return await prisma.draft.update({
            where: { id: draftId },
            data: { graphDraftMessageId },
        });
    } catch (e: unknown) {
        // In case of race (two workers), handle Prisma unique error safely
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
            return null;
        }
        throw e;
    }
}
