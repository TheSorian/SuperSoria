import prisma from '../src/db/prisma.js';
import { randomUUID } from 'crypto';

async function addCanadaRealFresh() {
  console.log('🥛 Añadiendo y verificando Leche Fresca Cañada Real de Soria...');

  const products = [
    {
      id: 'canada-real-leche-fresca-pasteurizada-1l',
      name: 'Leche fresca pasteurizada Cañada Real 1 L',
      brand: 'Cañada Real',
      format: 'Botella 1 L refrigerada',
      imageUrl: 'https://soria.e-leclerc.es/documents/10180/10815/8412242702192_M.jpg',
      categoryId: 'lacteos-huevos',
      prices: [
        {
          supermarketId: 'eleclerc-las-casas',
          price: 1.45,
          referencePrice: 1.45,
          referenceUnit: 'Litro',
          externalUrl: 'https://soria.e-leclerc.es/detalle/-/Producto/leche-fresca-pasteurizada-1l/8412242702192',
        },
        {
          supermarketId: 'eleclerc-express',
          price: 1.45,
          referencePrice: 1.45,
          referenceUnit: 'Litro',
          externalUrl: 'https://soria.e-leclerc.es/detalle/-/Producto/leche-fresca-pasteurizada-1l/8412242702192',
        },
      ],
    },
    {
      id: 'canada-real-leche-fresca-semi-1l',
      name: 'Leche fresca semidesnatada pasteurizada Cañada Real 1 L',
      brand: 'Cañada Real',
      format: 'Botella 1 L refrigerada',
      imageUrl: 'https://soria.e-leclerc.es/documents/10180/10815/8412242702192_M.jpg',
      categoryId: 'lacteos-huevos',
      prices: [
        {
          supermarketId: 'eleclerc-las-casas',
          price: 1.45,
          referencePrice: 1.45,
          referenceUnit: 'Litro',
          externalUrl: 'https://soria.e-leclerc.es/detalle/-/Producto/leche-fresca-pasteurizada-1l/8412242702192',
        },
        {
          supermarketId: 'eleclerc-express',
          price: 1.45,
          referencePrice: 1.45,
          referenceUnit: 'Litro',
          externalUrl: 'https://soria.e-leclerc.es/detalle/-/Producto/leche-fresca-pasteurizada-1l/8412242702192',
        },
      ],
    },
  ];

  for (const prod of products) {
    const existing = await prisma.product.findFirst({
      where: {
        OR: [
          { id: prod.id },
          { name: { contains: prod.name } },
        ],
      },
    });

    let prodId = prod.id;
    if (existing) {
      prodId = existing.id;
      await prisma.product.update({
        where: { id: prodId },
        data: {
          name: prod.name,
          brand: prod.brand,
          format: prod.format,
          imageUrl: prod.imageUrl,
          categoryId: prod.categoryId,
        },
      });
      console.log(`  Actualizado producto: ${prod.name}`);
    } else {
      await prisma.product.create({
        data: {
          id: prodId,
          name: prod.name,
          brand: prod.brand,
          format: prod.format,
          imageUrl: prod.imageUrl,
          categoryId: prod.categoryId,
        },
      });
      console.log(`  Creado nuevo producto: ${prod.name}`);
    }

    // Vincular precios
    for (const pr of prod.prices) {
      const existingPrice = await prisma.priceRecord.findFirst({
        where: { productId: prodId, supermarketId: pr.supermarketId },
      });

      if (existingPrice) {
        await prisma.priceRecord.update({
          where: { id: existingPrice.id },
          data: {
            price: pr.price,
            referencePrice: pr.referencePrice,
            referenceUnit: pr.referenceUnit,
            inStock: true,
            externalUrl: pr.externalUrl,
          },
        });
      } else {
        await prisma.priceRecord.create({
          data: {
            id: randomUUID(),
            productId: prodId,
            supermarketId: pr.supermarketId,
            price: pr.price,
            referencePrice: pr.referencePrice,
            referenceUnit: pr.referenceUnit,
            inStock: true,
            isOffer: false,
            externalUrl: pr.externalUrl,
          },
        });
      }
    }
  }

  console.log('✅ Leche Fresca Cañada Real vinculada correctamente.');
}

addCanadaRealFresh().then(() => prisma.$disconnect());
