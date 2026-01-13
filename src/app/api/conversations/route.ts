import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const inboxId = searchParams.get("inboxId");
    const skip = (page - 1) * limit;

    try {
        const where: any = {};
        const status = searchParams.get("status");

        if (inboxId && inboxId !== 'ALL') {
            where.inboxId = inboxId;
        }

        if (status && status !== 'ALL') {
            where.processingStatus = status;
        }

        const search = searchParams.get("search");
        if (search) {
            where.OR = [
                { subject: { contains: search } },
                {
                    inbox: { emailAddress: { contains: search } }
                },
                {
                    owner: { displayName: { contains: search } }
                },
                {
                    messages: {
                        some: {
                            OR: [
                                { subject: { contains: search } },
                                { bodyPreview: { contains: search } },
                                { bodyText: { contains: search } },
                            ]
                        }
                    }
                }
            ];
        }

        const [threads, total] = await Promise.all([
            prisma.thread.findMany({
                where,
                orderBy: { lastMessageAt: 'desc' },
                take: limit,
                skip,
                include: {
                    owner: { select: { displayName: true, initials: true } },
                    messages: {
                        orderBy: { receivedAt: 'desc' },
                        take: 1,
                        select: {
                            bodyPreview: true,
                            fromJson: true,
                            hasAttachments: true,
                        }
                    },
                    inbox: {
                        select: { emailAddress: true }
                    }
                }
            }),
            prisma.thread.count({ where })
        ]);

        return NextResponse.json({
            data: threads,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error("Conversations fetch error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
