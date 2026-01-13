
import dotenv from 'dotenv';
dotenv.config();

console.log('DB_URL:', process.env.DATABASE_URL ? 'FOUND' : 'MISSING');

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('Connecting...');
    try {
        const count = await prisma.user.count();
        console.log('User count:', count);

        // Check if case model is exposed
        // @ts-ignore
        if (prisma.case) {
            console.log('Case model found on prisma client');
        } else {
            console.log('Case model MISSING on prisma client');
            console.log('Keys:', Object.keys(prisma));
        }

    } catch (e) {
        console.error('Connection failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
