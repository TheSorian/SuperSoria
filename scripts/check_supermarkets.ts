import prisma from '../src/db/prisma.js';

async function checkSupermarkets() {
  const supers = await prisma.supermarket.findMany();
  console.log('Supermarkets in DB:');
  for (const s of supers) {
    const count = await prisma.priceRecord.count({ where: { supermarketId: s.id } });
    console.log(`- [${s.id}] ${s.name} (${s.chain}) -> ${count} prices`);
  }
}

checkSupermarkets().then(() => prisma.$disconnect());
