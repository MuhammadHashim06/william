import "dotenv/config";
import { prisma } from "@/lib/db";

async function main() {
    const result = await prisma.inboxCursor.updateMany({
        data: { deltaLink: null },
    });
    console.log("Cleared deltaLink on", result.count, "cursor(s)");
    await prisma.$disconnect();
}

main();
