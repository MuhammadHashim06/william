import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

console.log("[db] db.ts loaded from:", import.meta.url);
console.log("[db] Using PrismaMariaDb adapter (matching seed.ts implementation)");

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error("[db] DATABASE_URL is not defined");

// Exact match with seed.ts which is proven to work
const adapter = new PrismaMariaDb(dbUrl);

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Optional graceful shutdown
 */
export async function closeDb() {
    try {
        await prisma.$disconnect();
    } catch { }
}
