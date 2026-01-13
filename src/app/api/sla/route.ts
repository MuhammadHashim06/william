import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
    const now = new Date();

    const breached = await prisma.thread.count({
        where: { slaBreachedAt: { not: null }, processingStatus: { not: "DONE" } },
    });

    const dueSoon = await prisma.thread.findMany({
        where: {
            slaDueAt: { not: null, lte: new Date(now.getTime() + 60 * 60 * 1000) }, // next 1 hour
            slaBreachedAt: null,
            processingStatus: { not: "DONE" },
        },
        orderBy: { slaDueAt: "asc" },
        take: 20,
        select: { id: true, department: true, stage: true, slaDueAt: true, subject: true },
    });

    return NextResponse.json({ ok: true, breached, dueSoon });
}
