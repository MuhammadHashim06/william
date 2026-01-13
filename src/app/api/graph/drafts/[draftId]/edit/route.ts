import { NextRequest, NextResponse } from "next/server";
import { requireActorUserId } from "@/lib/actor";
import { DraftActionsService } from "@/services/draft_actions.service";

export async function POST(req: NextRequest, ctx: { params: Promise<{ draftId: string }> }) {
    try {
        const actorUserId = requireActorUserId(req);
        const { draftId } = await ctx.params;

        const body = await req.json();

        await DraftActionsService.editDraft(draftId, actorUserId, {
            subject: body?.subject,
            bodyHtml: body?.bodyHtml,
            to: body?.to,
            cc: body?.cc,
        });

        return NextResponse.json({ ok: true });
    } catch (e: unknown) {
        return NextResponse.json(
            { ok: false, error: e instanceof Error ? e.message : String(e) },
            { status: 400 }
        );
    }
}
