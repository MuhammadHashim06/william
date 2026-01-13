import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function upsertMessage(params: {
    threadId: string;
    graphMessageId: string;
    internetMessageId?: string | null;

    fromJson: Prisma.InputJsonValue | typeof Prisma.JsonNull;
    toJson: Prisma.InputJsonValue;
    ccJson?: Prisma.InputJsonValue | typeof Prisma.JsonNull | null;

    subject?: string | null;
    bodyPreview?: string | null;
    bodyHtml?: string | null;
    bodyText?: string | null;

    receivedAt?: Date | null;
    sentAt?: Date | null;

    hasAttachments: boolean;
}) {
    const ccJsonUpdate =
        params.ccJson === undefined ? undefined : params.ccJson ?? Prisma.JsonNull;

    return prisma.emailMessage.upsert({
        where: { graphMessageId: params.graphMessageId },
        update: {
            threadId: params.threadId,
            internetMessageId: params.internetMessageId ?? undefined,

            fromJson: params.fromJson,
            toJson: params.toJson,
            ccJson: ccJsonUpdate,

            subject: params.subject ?? null,
            bodyPreview: params.bodyPreview ?? null,
            bodyHtml: params.bodyHtml ?? null,
            bodyText: params.bodyText ?? null,
            receivedAt: params.receivedAt ?? null,
            sentAt: params.sentAt ?? null,
            hasAttachments: params.hasAttachments,
        },
        create: {
            threadId: params.threadId,
            graphMessageId: params.graphMessageId,
            internetMessageId: params.internetMessageId ?? null,

            fromJson: params.fromJson,
            toJson: params.toJson,
            ccJson: params.ccJson ?? Prisma.JsonNull,

            subject: params.subject ?? null,
            bodyPreview: params.bodyPreview ?? null,
            bodyHtml: params.bodyHtml ?? null,
            bodyText: params.bodyText ?? null,
            receivedAt: params.receivedAt ?? null,
            sentAt: params.sentAt ?? null,
            hasAttachments: params.hasAttachments,
        },
    });
}
