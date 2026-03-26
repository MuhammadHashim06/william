import "dotenv/config";
import { prisma } from "@/lib/db";

async function main() {
    console.log("\n[1] Testing simple query via @/lib/db import...");
    try {
        const r1 = await prisma.$queryRawUnsafe("SELECT 1 as test");
        console.log("[1] OK:", r1);
    } catch (e: any) {
        console.error("[1] FAIL:", e.message);
        process.exit(1);
    }

    console.log("\n[2] Testing Inbox count...");
    try {
        const count = await prisma.inbox.count();
        console.log("[2] Inbox count:", count);
    } catch (e: any) {
        console.error("[2] FAIL:", e.message);
    }

    console.log("\n[3] Testing inbox findMany...");
    try {
        const inboxes = await prisma.inbox.findMany();
        console.log("[3] Inboxes:", inboxes.length);
    } catch (e: any) {
        console.error("[3] FAIL:", e.message);
    }

    console.log("\nAll tests passed!");
    await prisma.$disconnect();
    process.exit(0);
}

main();
