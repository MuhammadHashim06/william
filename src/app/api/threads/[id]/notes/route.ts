import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
    const session = (await cookies()).get("session")?.value;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { id } = await ctx.params;
        const json = await req.json();
        const { description } = json;

        if (!description || description.trim() === "") {
            return NextResponse.json({ error: "Description is required" }, { status: 400 });
        }

        const payload = await decrypt(session);
        const userId = payload.user.id;

        const note = await prisma.note.create({
            data: {
                threadId: id,
                createdByUserId: userId,
                description: description.trim()
            },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        displayName: true,
                        initials: true
                    }
                }
            }
        });

        return NextResponse.json({ data: note });
    } catch (error) {
        console.error("Create note error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
