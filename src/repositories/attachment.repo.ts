import { prisma } from "@/lib/db";

export async function upsertAttachment(params: {
    messageId: string;
    graphAttachmentId: string;
    filename: string;
    mimeType?: string | null;
    sizeBytes?: number | null;
}) {
    return prisma.attachment.upsert({
        where: {
            messageId_graphAttachmentId: {
                messageId: params.messageId,
                graphAttachmentId: params.graphAttachmentId,
            },
        },
        update: {
            filename: params.filename,
            mimeType: params.mimeType ?? null,
            sizeBytes: params.sizeBytes ?? null,
        },
        create: {
            messageId: params.messageId,
            graphAttachmentId: params.graphAttachmentId,
            filename: params.filename,
            mimeType: params.mimeType ?? null,
            sizeBytes: params.sizeBytes ?? null,
            status: "PENDING",
        },
    });
}
