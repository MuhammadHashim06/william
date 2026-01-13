import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await ctx.params;

        const thread = await prisma.thread.findUnique({
            where: { id },
            include: {
                inbox: true,
                owner: { select: { id: true, displayName: true, initials: true } },
                auditLogs: {
                    where: {
                        action: { in: ['STAGE_CHANGED', 'OWNER_CHANGED'] }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    include: {
                        actor: { select: { initials: true, displayName: true } }
                    }
                },
                messages: {
                    orderBy: { receivedAt: 'desc' },
                    include: {
                        attachments: true
                    }
                },
                notes: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        createdBy: { select: { id: true, displayName: true, initials: true } }
                    }
                }
            }
        });

        if (!thread) {
            return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
        }

        return NextResponse.json({ data: thread });
    } catch (error) {
        console.error("Conversation detail error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
