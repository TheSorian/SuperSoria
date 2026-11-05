import prisma from '../src/db/prisma.js';

async function main() {
  const [products, prices] = await Promise.all([
    prisma.product.count(),
    prisma.priceRecord.count(),
  ]);
  console.log('Total Products in DB:', products);
  console.log('Total Price Records in DB:', prices);
}

main().then(() => prisma.$disconnect());
