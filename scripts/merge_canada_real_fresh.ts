import prisma from '../src/db/prisma.js';

async function merge() {
  console.log('🥛 Unificando productos de Leche Fresca Cañada Real...');

  // Encontrar todas las leches frescas de Cañada Real
  const prods = await prisma.product.findMany({
    where: {
      brand: 'Cañada Real',
      name: { contains: 'fresca' },
    },
    include: {
      prices: true,
    },
  });

  console.log('Encontrados:', prods.map(p => ({ id: p.id, name: p.name, priceCount: p.prices.length })));

  // Buscamos la leche fresca entera
  const wholeMilkCandidates = prods.filter(p => !p.name.includes('semi') && !p.name.includes('Semi'));
  console.log('Whole milk candidates:', wholeMilkCandidates.map(p => ({ id: p.id, name: p.name })));

  // Elegimos un ID canónico: canada-real-leche-fresca-pasteurizada-1l
  const canonicalId = 'canada-real-leche-fresca-pasteurizada-1l';
  
  // Aseguramos que existe el producto canónico
  const canonical = await prisma.product.upsert({
    where: { id: canonicalId },
    update: {
      name: 'Leche fresca pasteurizada entera Cañada Real 1 L',
      brand: 'Cañada Real',
      format: 'Botella 1 L refrigerada',
      imageUrl: 'https://www.compraonline.alcampo.es/images-v3/37ea0506-72ec-4543-93c8-a77bb916ec12/e37144b4-11af-4b96-aa37-d038cadc042c/300x300.jpg',
      categoryId: 'lacteos-huevos',
    },
    create: {
      id: canonicalId,
      name: 'Leche fresca pasteurizada entera Cañada Real 1 L',
      brand: 'Cañada Real',
      format: 'Botella 1 L refrigerada',
      imageUrl: 'https://www.compraonline.alcampo.es/images-v3/37ea0506-72ec-4543-93c8-a77bb916ec12/e37144b4-11af-4b96-aa37-d038cadc042c/300x300.jpg',
      categoryId: 'lacteos-huevos',
    },
  });

  // Reasignar todos los precios de los otros candidatos al canónico
  for (const p of wholeMilkCandidates) {
    if (p.id !== canonicalId) {
      console.log(`Moviendo precios de ${p.id} -> ${canonicalId}`);
      for (const pr of p.prices) {
        // Ignorar precios erróneos como 0.26
        if (pr.price < 0.5) {
          console.log(`  Descartando precio residual ${pr.price} €`);
          await prisma.priceRecord.delete({ where: { id: pr.id } });
          continue;
        }

        const existing = await prisma.priceRecord.findFirst({
          where: { productId: canonicalId, supermarketId: pr.supermarketId },
        });

        if (existing) {
          await prisma.priceRecord.update({
            where: { id: existing.id },
            data: {
              price: pr.price,
              referencePrice: pr.referencePrice,
              referenceUnit: pr.referenceUnit,
              externalUrl: pr.externalUrl,
              inStock: true,
              scrapedAt: new Date(),
            },
          });
          // Borrar el duplicado en p
          await prisma.priceRecord.delete({ where: { id: pr.id } });
        } else {
          await prisma.priceRecord.update({
            where: { id: pr.id },
            data: { productId: canonicalId },
          });
        }
      }
      // Borrar el producto duplicado
      await prisma.product.delete({ where: { id: p.id } });
    }
  }

  // Establecer precios finales verificados para la entera
  const officialPrices = [
    {
      supermarketId: 'alcampo-camaretas',
      price: 1.44,
      referencePrice: 1.44,
      referenceUnit: 'Litro',
      url: 'https://www.compraonline.alcampo.es/products/ca%C3%B1ada-real-leche-de-vaca-entera-fresca-pasteurizada-y-que-no-necesita-ser-hervida-botella-de-1-l/90850',
    },
    {
      supermarketId: 'eleclerc-las-casas',
      price: 1.45,
      referencePrice: 1.45,
      referenceUnit: 'Litro',
      url: 'https://soria.e-leclerc.es/detalle/-/Producto/leche-fresca-pasteurizada-1l/8412242702192',
    },
    {
      supermarketId: 'eleclerc-express',
      price: 1.45,
      referencePrice: 1.45,
      referenceUnit: 'Litro',
      url: 'https://soria.e-leclerc.es/detalle/-/Producto/leche-fresca-pasteurizada-1l/8412242702192',
    },
  ];

  for (const op of officialPrices) {
    const pRecord = await prisma.priceRecord.findFirst({
      where: { productId: canonicalId, supermarketId: op.supermarketId },
    });

    if (pRecord) {
      await prisma.priceRecord.update({
        where: { id: pRecord.id },
        data: {
          price: op.price,
          referencePrice: op.referencePrice,
          referenceUnit: op.referenceUnit,
          externalUrl: op.url,
          inStock: true,
          scrapedAt: new Date(),
        },
      });
    } else {
      await prisma.priceRecord.create({
        data: {
          productId: canonicalId,
          supermarketId: op.supermarketId,
          price: op.price,
          referencePrice: op.referencePrice,
          referenceUnit: op.referenceUnit,
          externalUrl: op.url,
          inStock: true,
        },
      });
    }
  }

  console.log('✨ Unificación completada.');
}

merge().finally(() => prisma.$disconnect());
