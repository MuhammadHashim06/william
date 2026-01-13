import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const search = searchParams.get("search");

    const where: any = {};
    if (search) {
        where.OR = [
            { subject: { contains: search } },
            { bodyText: { contains: search } },
            { draftType: { contains: search } },
            {
                thread: {
                    OR: [
                        { subject: { contains: search } },
                        { inbox: { emailAddress: { contains: search } } }
                    ]
                }
            }
        ];
    }

    try {
        const [drafts, total] = await Promise.all([
            prisma.draft.findMany({
                where,
                orderBy: { updatedAt: 'desc' },
                take: limit,
                skip,
                include: {
                    thread: {
                        select: {
                            id: true,
                            subject: true,
                            inbox: { select: { emailAddress: true } }
                        }
                    },
                    createdBy: {
                        select: { displayName: true, initials: true }
                    },
                    lastEditedBy: {
                        select: { displayName: true, initials: true }
                    }
                }
            }),
            prisma.draft.count({ where })
        ]);

        return NextResponse.json({
            data: drafts,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error("Drafts fetch error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
