import { prisma } from "@/lib/db";

export async function getAllSharedInboxes() {
    return prisma.inbox.findMany({ where: { isEscalation: false } });
}

export async function getInboxCursor(inboxId: string) {
    return prisma.inboxCursor.findUnique({ where: { inboxId } });
}

export async function upsertInboxCursor(inboxId: string, deltaLink: string | null) {
    return prisma.inboxCursor.upsert({
        where: { inboxId },
        update: { deltaLink, lastSyncAt: new Date() },
        create: { inboxId, deltaLink, lastSyncAt: new Date() },
    });
}
