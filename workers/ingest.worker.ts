import "dotenv/config";
import { IngestionService } from "@/services/ingestion.service";

async function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

function errorToMessage(e: unknown): string {
    if (e instanceof Error) return e.message;
    return typeof e === "string" ? e : JSON.stringify(e);
}

async function main() {
    // simple loop for dev
    for (;;) {
        try {
            await IngestionService.runOnce();
            // eslint-disable-next-line no-console
            console.log(`[ingest] ok @ ${new Date().toISOString()}`);
        } catch (e: unknown) {
            // eslint-disable-next-line no-console
            console.error("[ingest] error", errorToMessage(e));
        }
        await sleep(30_000);
    }
}

main();
