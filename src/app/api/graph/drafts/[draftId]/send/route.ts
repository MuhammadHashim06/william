import { NextResponse } from "next/server";

export async function POST() {
    return NextResponse.json(
        {
            ok: false,
            error:
                "Sending is disabled. External emails must remain drafts only. Escalations are auto-sent by the escalation system.",
        },
        { status: 400 }
    );
}
