import { prisma } from "../src/lib/db";
import { ExtractionService } from "../src/services/extraction.service";
import * as fs from 'fs';

async function main() {
    console.log("🧪 Testing Dual Extraction...");

    // 1. Find a recent message with body text
    const msg = await prisma.emailMessage.findFirst({
        where: {
            bodyText: { not: null },
            // preferably one that is part of a STAFFING thread
            thread: { department: 'STAFFING' }
        },
        orderBy: { receivedAt: 'desc' }
    });

    if (!msg) {
        console.error("❌ No suitable message found for testing.");
        return;
    }

    console.log(`📧 Found message: ${msg.id}`);

    // 2. Test Body Extraction
    console.log("\n🚀 Running extractFromBody...");
    try {
        const result = await ExtractionService.extractFromBody(msg.id);

        if (!result) {
            console.error("❌ Extraction returned null.");
            return;
        }

        console.log("✅ Extraction successful! Writing to extraction_result.json");
        fs.writeFileSync('extraction_result.json', JSON.stringify(result, null, 2));

    } catch (e) {
        console.error("❌ extraction failed:", e);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
