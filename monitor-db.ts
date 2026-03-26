import "dotenv/config";
import { prisma, closeDb } from "./src/lib/db";

async function monitor() {
    console.log("Starting DB Monitor...");

    try {
        const startInbox = await prisma.inbox.count();
        const startThreads = await prisma.thread.count();
        const startMessages = await prisma.emailMessage.count();

        console.log(`Initial Counts -> Inboxes: ${startInbox}, Threads: ${startThreads}, Messages: ${startMessages}`);

        // Poll every 30 seconds for 10 minutes
        for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 30000));

            const inboxes = await prisma.inbox.count();
            const threads = await prisma.thread.count();
            const messages = await prisma.emailMessage.count();

            console.log(`[${new Date().toISOString()}] Counts -> Inboxes: ${inboxes}, Threads: ${threads}, Messages: ${messages}`);

            if (threads > startThreads || messages > startMessages) {
                console.log(">>> ACTIVITY DETECTED: Data is being written to the database.");
            }
        }
    } catch (e) {
        console.error("Monitor error:", e);
    } finally {
        await closeDb();
    }
}

monitor();
