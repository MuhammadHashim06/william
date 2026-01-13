import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("Missing DATABASE_URL");

const adapter = new PrismaMariaDb(databaseUrl);
export const prisma = new PrismaClient({ adapter });

function makeKey(prefix: string, email: string, maxLen: number) {
    const base = (prefix + email)
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

    // hard cap to avoid MySQL index issues + schema constraints
    return base.slice(0, maxLen);
}

function splitEmails(envVal: string | undefined): string[] {
    return (envVal ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
}

async function main() {
    // 1) Users (needed for actor header testing)
    // Admin user
    await prisma.user.upsert({
        where: { email: "admin@tdp.com" },
        update: {
            displayName: "Admin",
            initials: "AD",
            role: "ADMIN",
            password: "password123", // Default password
        },
        create: {
            email: "admin@tdp.com",
            displayName: "Admin",
            initials: "AD",
            role: "ADMIN",
            password: "password123", // Default password
        },
    });

    // Optional: normal user (useful for ownership tests)
    await prisma.user.upsert({
        where: { email: "user@tdp.com" },
        update: {
            displayName: "User",
            initials: "US",
            role: "USER",
            password: "password123", // Default password
        },
        create: {
            email: "user@tdp.com",
            displayName: "User",
            initials: "US",
            role: "USER",
            password: "password123", // Default password
        },
    });

    // 2) Shared inboxes (operational)
    const sharedInboxes = splitEmails(process.env.GRAPH_SHARED_INBOXES);

    for (const email of sharedInboxes) {
        const key = makeKey("", email, 40);

        await prisma.inbox.upsert({
            where: {
                emailAddress_isEscalation: { emailAddress: email, isEscalation: false },
            },
            update: { key, emailAddress: email, isEscalation: false },
            create: { key, emailAddress: email, isEscalation: false },
        });
    }

    // 3) Escalation inboxes (internal-only targets)
    const escalationInboxes = [
        process.env.GRAPH_ESCALATION_STAFFING,
        process.env.GRAPH_ESCALATION_SERVICES,
        process.env.GRAPH_ESCALATION_BILLING,
    ].filter(Boolean) as string[];

    for (const email of escalationInboxes) {
        const key = makeKey("ESCALATION_", email, 60);

        await prisma.inbox.upsert({
            where: {
                emailAddress_isEscalation: { emailAddress: email, isEscalation: true },
            },
            update: { key, emailAddress: email, isEscalation: true },
            create: { key, emailAddress: email, isEscalation: true },
        });
    }

    console.log("Seed complete:", {
        sharedInboxes: sharedInboxes.length,
        escalationInboxes: escalationInboxes.length,
    });
}

main()
    .then(async () => prisma.$disconnect())
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
