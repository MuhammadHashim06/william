import { NextRequest, NextResponse } from "next/server";
import { EscalationService } from "@/services/escalation.service";
import { requireActorUserId } from "@/lib/actor";

export async function POST(req: NextRequest) {
    try {
        const actorUserId = requireActorUserId(req); // required for audit

        const body = await req.json();
        const threadId = body?.threadId as string | undefined;
        const reason = (body?.reason as string | undefined) ?? "Manual escalation";

        if (!threadId) throw new Error("threadId is required");

        // No need to pre-check thread existence here. Service will validate and throw.
        await EscalationService.triggerEscalation({
            threadId,
            reason,
            actorUserId, // string (never null)
        });

        return NextResponse.json({ ok: true });
    } catch (e: unknown) {
        return NextResponse.json(
            { ok: false, error: e instanceof Error ? e.message : String(e) },
            { status: 400 }
        );
    }
}
