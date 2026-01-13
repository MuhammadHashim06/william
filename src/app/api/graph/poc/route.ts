import { NextResponse } from "next/server";
import { createReplyDraft, listInboxMessages, getMessage } from "@/lib/graph";

export async function GET() {
    const inbox = process.env.GRAPH_POC_INBOX;
    if (!inbox) return NextResponse.json({ ok: false, error: "Missing GRAPH_POC_INBOX" }, { status: 500 });

    // 1) list newest messages
    const list = await listInboxMessages(inbox, 5);
    const first = list?.value?.[0];
    if (!first) return NextResponse.json({ ok: true, message: "No messages found in inbox." });

    // 2) fetch full message
    const msg = await getMessage(inbox, first.id);

    // 3) create reply draft (draft-first)
    const draft = await createReplyDraft(
        inbox,
        msg.id,
        `<p>POC Draft (not sent). This is created by the platform for validation.</p>`
    );

    return NextResponse.json({
        ok: true,
        inbox,
        pickedMessage: {
            id: msg.id,
            subject: msg.subject,
            conversationId: msg.conversationId,
            receivedDateTime: msg.receivedDateTime,
        },
        createdDraft: {
            id: draft?.id,
            subject: draft?.subject,
            conversationId: draft?.conversationId,
        },
    });
}
