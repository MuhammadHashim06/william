import { prisma } from "@/lib/db";
import { downloadAttachmentContent } from "@/lib/graph";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    ctx: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await ctx.params;

        const attachment = await prisma.attachment.findUnique({
            where: { id },
            include: {
                message: {
                    include: {
                        thread: {
                            include: {
                                inbox: true,
                            },
                        },
                    },
                },
            },
        });

        if (!attachment) {
            return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
        }

        const inboxUpn = attachment.message.thread.inbox.emailAddress;
        const graphMessageId = attachment.message.graphMessageId;
        const graphAttachmentId = attachment.graphAttachmentId;

        const file = await downloadAttachmentContent(
            inboxUpn,
            graphMessageId,
            graphAttachmentId
        );

        // Return the file content with appropriate headers for download
        return new Response(new Uint8Array(file.bytes), {
            headers: {
                "Content-Type": file.contentType || "application/octet-stream",
                "Content-Disposition": `attachment; filename="${encodeURIComponent(attachment.filename)}"`,
                "Content-Length": file.bytes.length.toString(),
            },
        });
    } catch (error) {
        console.error("Attachment download error:", error);
        return NextResponse.json(
            { error: "Failed to download attachment" },
            { status: 500 }
        );
    }
}
