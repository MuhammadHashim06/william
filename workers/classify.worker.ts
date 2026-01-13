// import "dotenv/config";
// import { prisma } from "@/lib/db";
// import { classifyThread } from "@/services/classification.service";

// async function sleep(ms: number) {
//     return new Promise((r) => setTimeout(r, ms));
// }

// async function main() {
//     for (;;) {
//         try {
//             const threads = await prisma.thread.findMany({
//                 where: { processingStatus: "NEW" },
//                 orderBy: { createdAt: "asc" },
//                 take: 10,
//             });

//             for (const thread of threads) {
//                 await classifyThread(thread.id);
//             }
//         } catch (e: unknown) {
//             if (e instanceof Error) {
//                 console.error("[classify] error", e.message);
//             } else {
//                 console.error("[classify] error", e);
//             }
//         }
//         await sleep(10_000);
//     }
// }

// main();


import "dotenv/config";
import { prisma } from "@/lib/db";
import { classifyThread } from "@/services/classification.service";

async function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

async function main() {
    for (; ;) {
        try {
            // Only classify threads whose attachments are no longer PENDING
            // (i.e., extraction worker has finished, either EXTRACTED or FAILED).
            const threads = await prisma.thread.findMany({
                where: {
                    processingStatus: "NEW",
                    messages: {
                        none: {
                            attachments: { some: { status: "PENDING" } },
                        },
                    },
                },
                orderBy: { createdAt: "asc" },
                take: 10,
                select: { id: true },
            });

            for (const thread of threads) {
                await classifyThread(thread.id);
            }
        } catch (e: unknown) {
            if (e instanceof Error) console.error("[classify] error", e.message);
            else console.error("[classify] error", e);
        }

        await sleep(10_000);
    }
}

main();
