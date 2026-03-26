import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const ids = [
        "cmlyrbeay005dsouha5ovm9mq",
        "cmlyrbf2k005jsouhy9h124nn",
        "cmlyrbfxa005rsouh0kavsg36",
    ];

    for (const id of ids) {
        const thread = await prisma.thread.findUnique({
            where: { id },
            select: {
                id: true,
                subject: true,
                processingStatus: true,
                graphConversationId: true,
                createdAt: true,
                inboxId: true,
                _count: { select: { messages: true } },
            },
        });
        console.log("\n=== Thread:", id, "===");
        console.log(JSON.stringify(thread, null, 2));
    }

    // Also check: are there ANY threads with status NEW and 0 messages?
    const allNewEmpty = await prisma.thread.findMany({
        where: {
            processingStatus: "NEW",
        },
        select: {
            id: true,
            subject: true,
            createdAt: true,
            _count: { select: { messages: true } },
        },
    });

    console.log("\n=== All NEW threads ===");
    for (const t of allNewEmpty) {
        console.log(`  ${t.id} | msgs=${t._count.messages} | subj=${t.subject} | created=${t.createdAt.toISOString()}`);
    }

    await prisma.$disconnect();
}

main();
