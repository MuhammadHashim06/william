import { prisma } from "@/lib/db";
import { login } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        // Simple validation
        if (!email || !password) {
            return NextResponse.json(
                { error: "Email and password are required" },
                { status: 400 }
            );
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: { email },
        });

        // Check user and password (simple check for now as per seed)
        // In a real app, you MUST hash passwords. This assumes plain text for this specific test case based on seed.
        if (!user || user.password !== password) {
            return NextResponse.json(
                { error: "Invalid credentials" },
                { status: 401 }
            );
        }

        // Login (create session)
        await login({
            id: user.id,
            email: user.email,
            role: user.role,
            displayName: user.displayName,
            initials: user.initials
        });

        return NextResponse.json({ success: true, user: { id: user.id, email: user.email, name: user.displayName } });
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
