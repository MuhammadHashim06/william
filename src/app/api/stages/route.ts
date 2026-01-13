import { NextRequest, NextResponse } from "next/server";
import { requireActorUserId } from "@/lib/actor";
import { StageService } from "@/services/stage.service";

export async function PATCH(req: NextRequest) {
    try {
        const actorUserId = requireActorUserId(req);
        const body = await req.json();

        const threadId = body?.threadId;
        const stage = body?.stage;

        if (!threadId || !stage) throw new Error("threadId and stage are required");

        await StageService.changeStage({ threadId, stage, actorUserId });

        return NextResponse.json({ ok: true });
    } catch (e: unknown) {
        return NextResponse.json(
            { ok: false, error: e instanceof Error ? e.message : String(e) },
            { status: 400 }
        );
    }
}
