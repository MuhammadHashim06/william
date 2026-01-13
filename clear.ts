import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(process.env.DATABASE_URL!),
});

const SAMPLE_SIZE = 30;

async function main() {
    const threads = await prisma.$queryRaw<
        Array<{
            id: string;
            department: string;
            stage: string;
            subject: string | null;
            bodyPreview: string | null;
            inbox: string;
        }>
    >`
    SELECT
      t.id,
      t.department,
      t.stage,
      em.subject,
      em.bodyPreview,
      i.emailAddress AS inbox
    FROM Thread t
    JOIN Inbox i ON i.id = t.inboxId
    JOIN EmailMessage em ON em.threadId = t.id
    WHERE em.id = (
      SELECT em2.id
      FROM EmailMessage em2
      WHERE em2.threadId = t.id
      ORDER BY em2.receivedAt DESC
      LIMIT 1
    )
    ORDER BY RAND()
    LIMIT ${SAMPLE_SIZE};
  `;

    console.log("===== CLASSIFICATION SAMPLE =====\n");

    threads.forEach((t, idx) => {
        console.log(`--- SAMPLE ${idx + 1} ---`);
        console.log(`Inbox      : ${t.inbox}`);
        console.log(`Department : ${t.department}`);
        console.log(`Stage      : ${t.stage}`);
        console.log(`Subject    : ${t.subject ?? "(no subject)"}`);
        console.log(
            `Body       : ${
                t.bodyPreview
                    ? t.bodyPreview.slice(0, 300).replace(/\s+/g, " ")
                    : "(no body preview)"
            }`
        );
        console.log();
    });

    console.log("===== END SAMPLE =====");
}

main()
    .then(async () => prisma.$disconnect())
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
