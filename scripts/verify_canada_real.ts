import prisma from '../src/db/prisma.js';

async function test() {
  const products = await prisma.product.findMany({
    where: {
      brand: 'Cañada Real',
    },
    include: {
      prices: {
        include: { supermarket: true },
      },
    },
  });

  console.log('Productos Cañada Real encontrados:', products.length);
  for (const p of products) {
    console.log(`\n📦 ${p.name}`);
    for (const pr of p.prices) {
      console.log(`   🏷️  ${pr.supermarket.name} (${pr.supermarket.chain}): ${pr.price} €`);
    }
  }
}

test().finally(() => prisma.$disconnect());
