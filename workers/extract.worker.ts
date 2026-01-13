import "dotenv/config";
import { ExtractionService } from "@/services/extraction.service";

async function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

async function main() {
    for (; ;) {
        try {
            const res = await ExtractionService.runOnce(10);

            // if nothing to do, sleep a bit
            if (res.processed === 0) {
                await sleep(5_000);
                continue;
            }
        } catch (e: unknown) {
            if (e instanceof Error) console.error("[extract] error", e.message);
            else console.error("[extract] error", e);
        }

        await sleep(2_000);
    }
}

main();
