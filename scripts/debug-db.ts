
import 'dotenv/config';
import { prisma } from '@/lib/db';

async function main() {
    console.log('--- DB Debug Script ---');
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('ERROR: DATABASE_URL is not defined');
        return;
    }
    console.log('DATABASE_URL:', dbUrl.replace(/:[^:@]*@/, ':****@')); // Mask password

    console.log('Attempting to connect...');
    const start = Date.now();
    try {
        await prisma.$connect();
        console.log(`Connected in ${Date.now() - start}ms`);

        console.log('Running test query (Thread count)...');
        const count = await prisma.thread.count();
        console.log(`Test query successful. Thread count: ${count}`);

    } catch (e: any) {
        console.error('Connection FAILED:', e);
        if (e.message) console.error('Error message:', e.message);
    } finally {
        await prisma.$disconnect();
        console.log('Disconnected');
    }
}

main();
