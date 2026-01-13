import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function parseBool(v: string | null): boolean | undefined {
    if (v === null) return undefined;
    if (v === "true") return true;
    if (v === "false") return false;
    return undefined;
}

export async function GET(req: NextRequest) {
    try {
        const sp = req.nextUrl.searchParams;

        const inboxId = sp.get("inboxId");
        const department = sp.get("department");
        const stage = sp.get("stage");
        const ownerUserId = sp.get("ownerUserId");
        const processingStatus = sp.get("processingStatus");

        const needsReview = parseBool(sp.get("needsReview"));
        const responseRequired = parseBool(sp.get("responseRequired"));
        const slaBreached = parseBool(sp.get("slaBreached"));

        const take = Math.min(Number(sp.get("take") ?? 50), 200);

        const where: Record<string, unknown> = {};
        if (inboxId) where.inboxId = inboxId;
        if (department) where.department = department;
        if (stage) where.stage = stage;
        if (ownerUserId) where.ownerUserId = ownerUserId;
        if (processingStatus) where.processingStatus = processingStatus;
        if (needsReview !== undefined) where.needsReview = needsReview;
        if (responseRequired !== undefined) where.responseRequired = responseRequired;
        if (slaBreached !== undefined) where.slaBreachedAt = slaBreached ? { not: null } : null;

        const items = await prisma.thread.findMany({
            where,
            orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
            take,
            include: {
                inbox: { select: { id: true, key: true, emailAddress: true, isEscalation: true } },
            },
        });

        return NextResponse.json({ ok: true, items });
    } catch (e: unknown) {
        return NextResponse.json(
            { ok: false, error: e instanceof Error ? e.message : String(e) },
            { status: 400 }
        );
    }
}
