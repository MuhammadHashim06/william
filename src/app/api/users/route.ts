import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function verifyAdmin() {
    const session = (await cookies()).get("session")?.value;
    if (!session) return false;
    try {
        const payload = await decrypt(session);
        return payload?.user?.role === "ADMIN";
    } catch {
        return false;
    }
}

export async function GET() {
    if (!(await verifyAdmin())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                email: true,
                displayName: true,
                initials: true,
                role: true,
                createdAt: true,
            }
        }); // Exclude password
        return NextResponse.json(users);
    } catch (error) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    if (!(await verifyAdmin())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const json = await req.json();
        const { email, password, displayName, initials, role } = json;

        if (!email || !password || !displayName || !initials) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        const newUser = await prisma.user.create({
            data: {
                email,
                password, // Storing as plain text per current project state
                displayName,
                initials,
                role: role || "USER",
            },
        });

        // @ts-ignore
        const { password: _, ...userWithoutPassword } = newUser;
        return NextResponse.json(userWithoutPassword);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: "Email or Initials already exists" }, { status: 409 });
        }
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
