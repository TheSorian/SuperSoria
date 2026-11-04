import prisma from '../src/db/prisma.js';

async function checkCounts() {
  const supermarkets = await prisma.supermarket.findMany({
    include: {
      _count: {
        select: {
          priceRecords: true,
        },
      },
    },
  });

  console.log('Supermarkets and price counts:');
  for (const sm of supermarkets) {
    console.log(`- ${sm.name} (${sm.chain}): ${sm._count.priceRecords} precios`);
  }

  const totalProds = await prisma.product.count();
  const totalPrices = await prisma.priceRecord.count();
  console.log(`Total productos únicos: ${totalProds}`);
  console.log(`Total registros de precio: ${totalPrices}`);
}

checkCounts().then(() => prisma.$disconnect());
