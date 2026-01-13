import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, ctx: { params: Promise<{ threadId: string }> }) {
    try {
        const { threadId } = await ctx.params;

        const thread = await prisma.thread.findUnique({
            where: { id: threadId },
            include: {
                inbox: { select: { id: true, key: true, emailAddress: true, isEscalation: true } },
                messages: {
                    orderBy: [{ receivedAt: "asc" }, { createdAt: "asc" }],
                    include: { attachments: { orderBy: { createdAt: "asc" } } },
                },
                drafts: { orderBy: [{ version: "desc" }, { createdAt: "desc" }] },
                escalations: { orderBy: [{ triggeredAt: "desc" }, { createdAt: "desc" }] },
                auditLogs: { orderBy: { createdAt: "desc" } },
            },
        });

        if (!thread) {
            return NextResponse.json({ ok: false, error: "Thread not found" }, { status: 404 });
        }

        return NextResponse.json({ ok: true, thread });
    } catch (e: unknown) {
        return NextResponse.json(
            { ok: false, error: e instanceof Error ? e.message : String(e) },
            { status: 400 }
        );
    }
}
