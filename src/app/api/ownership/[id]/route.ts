import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
    const session = (await cookies()).get("session")?.value;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { id } = await ctx.params;
        const { ownerUserId } = await req.json();

        const thread = await prisma.thread.update({
            where: { id },
            data: { ownerUserId: ownerUserId || null },
            include: {
                owner: {
                    select: { id: true, displayName: true, initials: true }
                }
            }
        });

        // Log the change
        const payload = await decrypt(session);
        const initials = payload.user.initials;
        const description = ownerUserId ? `Assigned to ${thread.owner?.displayName}` : "Thread unassigned";

        await prisma.auditLog.create({
            data: {
                threadId: id,
                actorUserId: payload.user.id,
                action: "OWNER_CHANGED",
                payload: { text: description, initials }
            }
        });

        // Create Automated Note
        await prisma.note.create({
            data: {
                threadId: id,
                createdByUserId: payload.user.id,
                description: `[${initials}] ${description}`
            }
        });

        return NextResponse.json({ data: thread });
    } catch (error) {
        console.error("Ownership update error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
