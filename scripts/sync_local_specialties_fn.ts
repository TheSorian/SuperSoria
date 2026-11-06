import prisma from '../src/db/prisma.js';
import { randomUUID } from 'crypto';

export async function syncLocalSpecialties() {
  console.log('🌾 Verificando especialidades y productos de Soria (Cañada Real, La Hoguera, Moreno Sáez)...');

  // Asegurar Leche Fresca Cañada Real en Alcampo, E.Leclerc y Mercadona
  const freshMilk = [
    {
      id: 'leche-fresca-entera-canada-real-1l',
      name: 'Leche fresca entera pasteurizada Cañada Real botella 1 L',
      brand: 'Cañada Real',
      format: 'Botella 1 L',
      imageUrl: 'https://www.compraonline.alcampo.es/images-v3/37ea0506-72ec-4543-93c8-a77bb916ec12/03588f98-6bb2-4ca8-95fe-d8d578ebc6ce/300x300.jpg',
      categoryId: 'lacteos-huevos',
      prices: [
        { supermarketId: 'alcampo-camaretas', price: 1.25, referencePrice: 1.25, referenceUnit: 'L' },
        { supermarketId: 'eleclerc-las-casas', price: 1.30, referencePrice: 1.30, referenceUnit: 'L' },
        { supermarketId: 'eleclerc-express', price: 1.30, referencePrice: 1.30, referenceUnit: 'L' },
      ],
    },
    {
      id: 'leche-fresca-semidesnatada-canada-real-1l',
      name: 'Leche fresca semidesnatada pasteurizada Cañada Real botella 1 L',
      brand: 'Cañada Real',
      format: 'Botella 1 L',
      imageUrl: 'https://www.compraonline.alcampo.es/images-v3/37ea0506-72ec-4543-93c8-a77bb916ec12/6245d654-706f-42ae-8097-6a75f28c290a/300x300.jpg',
      categoryId: 'lacteos-huevos',
      prices: [
        { supermarketId: 'alcampo-camaretas', price: 1.25, referencePrice: 1.25, referenceUnit: 'L' },
        { supermarketId: 'eleclerc-las-casas', price: 1.30, referencePrice: 1.30, referenceUnit: 'L' },
        { supermarketId: 'eleclerc-express', price: 1.30, referencePrice: 1.30, referenceUnit: 'L' },
      ],
    },
    {
      id: 'leche-fresca-entera-mercadona-hacendado-1l',
      name: 'Leche fresca entera Hacendado pasteurizada botella 1 L',
      brand: 'Hacendado',
      format: 'Botella 1 L',
      imageUrl: 'https://prod-mercadona.imgix.net/images/42f9b16558e8b233a763c39ebdf16f06.jpg?fit=crop&h=300&w=300',
      categoryId: 'lacteos-huevos',
      prices: [
        { supermarketId: 'mercadona-saavedra', price: 1.15, referencePrice: 1.15, referenceUnit: 'L' },
        { supermarketId: 'mercadona-palomar', price: 1.15, referencePrice: 1.15, referenceUnit: 'L' },
      ],
    },
    {
      id: 'leche-fresca-semi-mercadona-hacendado-1l',
      name: 'Leche fresca semidesnatada Hacendado pasteurizada botella 1 L',
      brand: 'Hacendado',
      format: 'Botella 1 L',
      imageUrl: 'https://prod-mercadona.imgix.net/images/3a9a7a6c92e921d7b1a6c0e3a6c3f3f2.jpg?fit=crop&h=300&w=300',
      categoryId: 'lacteos-huevos',
      prices: [
        { supermarketId: 'mercadona-saavedra', price: 1.15, referencePrice: 1.15, referenceUnit: 'L' },
        { supermarketId: 'mercadona-palomar', price: 1.15, referencePrice: 1.15, referenceUnit: 'L' },
      ],
    },
  ];

  for (const item of freshMilk) {
    let prod = await prisma.product.findUnique({ where: { id: item.id } });
    if (!prod) {
      prod = await prisma.product.findFirst({ where: { name: item.name } });
    }

    let prodId = prod?.id;
    if (!prod) {
      prodId = item.id;
      await prisma.product.create({
        data: {
          id: prodId,
          name: item.name,
          brand: item.brand,
          format: item.format,
          imageUrl: item.imageUrl,
          categoryId: item.categoryId,
        },
      });
    }

    for (const pr of item.prices) {
      const existing = await prisma.priceRecord.findFirst({
        where: { productId: prodId, supermarketId: pr.supermarketId },
      });

      if (!existing) {
        await prisma.priceRecord.create({
          data: {
            id: randomUUID(),
            productId: prodId!,
            supermarketId: pr.supermarketId,
            price: pr.price,
            referencePrice: pr.referencePrice,
            referenceUnit: pr.referenceUnit,
            inStock: true,
          },
        });
      }
    }
  }

  console.log('✅ Especialidades de Soria verificadas.');
}
