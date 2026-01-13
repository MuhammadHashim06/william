import { prisma } from '../src/lib/db';

async function main() {
    console.log('Starting Case backfill...');
    console.log('DB URL found:', !!process.env.DATABASE_URL);
    // @ts-ignore
    // console.log('Prisma keys:', Object.keys(prisma));

    // Find all threads that do NOT have a caseId
    const threads = await prisma.thread.findMany({
        where: {
            caseId: null
        }
    });

    console.log(`Found ${threads.length} threads without a case.`);

    for (const thread of threads) {
        // Create a new case for this thread
        // We'll use the thread's subject as the Case Title
        // And the thread's owner as the Case Creator (if exists)

        console.log(`Processing Thread ${thread.id}: ${thread.subject}`);

        try {
            const newCase = await prisma.case.create({
                data: {
                    title: thread.subject || 'Untitled Case',
                    description: `Auto-generated case from Thread ID: ${thread.id}`,
                    status: 'OPEN',
                    priority: 'MEDIUM', // Default priority
                    createdByUserId: thread.ownerUserId, // Assign to thread owner if exist
                    // Link the thread immediately
                    threads: {
                        connect: { id: thread.id }
                    }
                }
            });

            console.log(`  -> Created Case #${newCase.caseNumber} (ID: ${newCase.id})`);
        } catch (error) {
            console.error(`  -> Failed to create case for thread ${thread.id}:`);
        }
    }

    console.log('Backfill completed.');
}

main()
    .catch((e) => {
        console.error('CRITICAL ERROR:');
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
