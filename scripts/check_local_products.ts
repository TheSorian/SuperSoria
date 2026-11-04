import prisma from '../src/db/prisma.js';

async function checkLocalProducts() {
  const terms = ['soria', 'hoguera', 'moreno saez', 'moreno sáez', 'malvasia', 'malvasía', 'arotz', 'montepinos', 'torrezno'];
  
  for (const term of terms) {
    const prods = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: term } },
          { brand: { contains: term } },
        ],
      },
      include: {
        prices: {
          include: { supermarket: true },
        },
      },
      take: 10,
    });
    console.log(`\n=== Término: "${term}" (${prods.length} productos en DB) ===`);
    for (const p of prods.slice(0, 5)) {
      console.log(`- ${p.name} [${p.brand}] (${p.prices.length} precios: ${p.prices.map(pr => pr.supermarket.chain).join(', ')})`);
    }
  }
}

checkLocalProducts().finally(() => prisma.$disconnect());
