import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request, ctx: { params: Promise<{ draftId: string }> }) {
    try {
        const { draftId } = await ctx.params;

        const draft = await prisma.draft.findUnique({
            where: { id: draftId },
            include: {
                thread: {
                    include: {
                        inbox: true,
                        messages: {
                            orderBy: { receivedAt: 'desc' },
                            take: 5 // Get some context
                        }
                    }
                },
                createdBy: { select: { displayName: true, initials: true } },
                lastEditedBy: { select: { displayName: true, initials: true } },
                auditLogs: {
                    orderBy: { createdAt: 'desc' },
                    take: 10
                }
            }
        });

        if (!draft) {
            return NextResponse.json({ error: "Draft not found" }, { status: 404 });
        }

        return NextResponse.json({ data: draft });
    } catch (error) {
        console.error("Draft detail fetch error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
