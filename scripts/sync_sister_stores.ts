import prisma from '../src/db/prisma.js';
import { randomUUID } from 'crypto';

async function syncSisterStores() {
  console.log('🔄 Sincronizando precios entre sucursales de la misma cadena en Soria...');

  const storePairs = [
    { from: 'mercadona-saavedra', to: ['mercadona-palomar'] },
    { from: 'dia-aguirre', to: ['dia-valladolid', 'dia-sagunto'] },
    { from: 'eleclerc-las-casas', to: ['eleclerc-express'] },
    { from: 'lupa-granados', to: ['lupa-almazan'] },
  ];

  for (const pair of storePairs) {
    const sourcePrices = await prisma.priceRecord.findMany({
      where: { supermarketId: pair.from },
    });

    console.log(`Cadena ${pair.from}: ${sourcePrices.length} precios de origen.`);

    for (const targetId of pair.to) {
      const targetExisting = await prisma.priceRecord.findMany({
        where: { supermarketId: targetId },
        select: { productId: true },
      });
      const existingProductIds = new Set(targetExisting.map((p) => p.productId));

      const toInsert: any[] = [];
      for (const sp of sourcePrices) {
        if (!existingProductIds.has(sp.productId)) {
          toInsert.push({
            id: randomUUID(),
            productId: sp.productId,
            supermarketId: targetId,
            price: sp.price,
            referencePrice: sp.referencePrice,
            referenceUnit: sp.referenceUnit,
            originalPrice: sp.originalPrice,
            isOffer: sp.isOffer,
            inStock: sp.inStock,
            externalUrl: sp.externalUrl,
          });
        }
      }

      console.log(`  -> Insertando ${toInsert.length} precios en ${targetId}...`);
      for (let i = 0; i < toInsert.length; i += 500) {
        await prisma.priceRecord.createMany({
          data: toInsert.slice(i, i + 500),
        });
      }
      console.log(`  ✅ ${targetId} sincronizado con éxito.`);
    }
  }

  console.log('🎉 Sincronización de sucursales completada.');
}

syncSisterStores().then(() => prisma.$disconnect());
