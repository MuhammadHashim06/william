
import { prisma } from "../src/lib/db";
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    console.log("🔍 Fetching extracted attachments...");

    const attachments = await prisma.attachment.findMany({
        where: {
            status: 'EXTRACTED',
            extractedJson: {
                not: null
            }
        },
        select: {
            id: true,
            filename: true,
            mimeType: true,
            extractedJson: true,
            createdAt: true,
            message: {
                select: {
                    subject: true,
                    receivedAt: true,
                    thread: {
                        select: {
                            id: true,
                            department: true
                        }
                    }
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    console.log(`✅ Found ${attachments.length} extracted attachments.`);

    const OUTPUT_FILE = path.join(process.cwd(), 'extracted_data_dump.json');

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(attachments, null, 2));

    console.log(`💾 Data saved to: ${OUTPUT_FILE}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
