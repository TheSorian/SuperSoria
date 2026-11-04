import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  await prisma.priceRecord.updateMany({
    where: { product: { name: { contains: 'Empanadilla' } } },
    data: { price: 1.40 }
  });
  await prisma.priceRecord.updateMany({
    where: { product: { name: { contains: 'Cocarroi' } } },
    data: { price: 2.00 }
  });
  console.log('✓ Done bakery fix');
}
run().finally(() => prisma.$disconnect());
