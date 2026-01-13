import "dotenv/config";
import { prisma } from "@/lib/db";
import { DraftService } from "@/services/draft.service";

async function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

async function main() {
    for (;;) {
        try {
            const threads = await prisma.thread.findMany({
                where: {
                    processingStatus: "CLASSIFIED",
                    needsReview: false,
                    drafts: { none: {} }, // <--- key line
                },
                orderBy: { updatedAt: "asc" },
                take: 10,
                select: { id: true },
            });
            for (const t of threads) {
                await DraftService.createDraftForThread(t.id);
            }
        } catch (e: unknown) {
            if (e instanceof Error) {
                console.error("[draft] error", e.message);
            } else {
                console.error("[draft] error", e);
            }
        }

        await sleep(10_000);
    }
}

main();
