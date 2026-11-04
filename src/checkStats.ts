import prisma from './db/prisma.js';

async function check() {
  const logs = await prisma.scrapeLog.findMany();
  console.log('Logs count:', logs.length);
  logs.forEach(l => console.log(`[${l.supermarket}] Status: ${l.status}, Found: ${l.itemsFound}, Updated: ${l.itemsUpdated}`));
  const count = await prisma.product.count();
  console.log('Product count:', count);
  const priceCount = await prisma.priceRecord.count();
  console.log('Price count:', priceCount);
  await prisma.$disconnect();
}

check().catch(console.error);
