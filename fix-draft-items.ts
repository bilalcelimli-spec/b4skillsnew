import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.item.updateMany({
    where: {
      status: 'DRAFT',
    },
    data: {
      status: 'ACTIVE',
    },
  });
  console.log(`Updated ${result.count} items from DRAFT to ACTIVE.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
