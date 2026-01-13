import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { DraftActionsService } from "@/services/draft_actions.service";

export async function POST(req: NextRequest, ctx: { params: Promise<{ draftId: string }> }) {
    try {
        const session = await getSession();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { draftId } = await ctx.params;
        const actorUserId = session.user.id;
        const body = await req.json();

        await DraftActionsService.editDraft(draftId, actorUserId, {
            subject: body.subject,
            bodyHtml: body.bodyHtml,
            to: body.to, // Expecting array of objects or strings, service will validate
            cc: body.cc,
        });

        return NextResponse.json({ ok: true });
    } catch (e: unknown) {
        console.error("Edit Draft Error:", e);
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json(
            { ok: false, error: msg },
            { status: 400 }
        );
    }
}
