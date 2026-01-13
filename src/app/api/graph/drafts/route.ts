import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DraftService } from "@/services/draft.service";

export async function POST() {
    const threads = await prisma.thread.findMany({
        where: { processingStatus: "CLASSIFIED" },
        orderBy: { updatedAt: "asc" },
        take: 25,
        select: { id: true },
    });

    for (const t of threads) {
        await DraftService.createDraftForThread(t.id);
    }

    return NextResponse.json({ ok: true, processed: threads.length });
}
