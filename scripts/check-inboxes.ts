
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const inboxes = await prisma.inbox.findMany();
  console.log(JSON.stringify(inboxes, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
