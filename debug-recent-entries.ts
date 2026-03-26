
import { prisma } from "./src/lib/db";

async function main() {
    const recentThreads = await prisma.thread.findMany({
        orderBy: {
            createdAt: 'desc'
        },
        take: 5,
        include: {
            messages: {
                include: {
                    attachments: {
                        select: {
                            id: true,
                            filename: true,
                            mimeType: true,
                            status: true,
                            extractedJson: true,
                            extractionText: true
                        }
                    }
                }
            }
        }
    });

    console.log(JSON.stringify(recentThreads, null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
