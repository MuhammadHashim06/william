import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const inboxes = await prisma.inbox.findMany({
            orderBy: { emailAddress: 'asc' }
        });
        return NextResponse.json({ data: inboxes });
    } catch (error) {
        console.error("Inboxes fetch error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
