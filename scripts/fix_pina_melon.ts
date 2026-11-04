import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  // Piña: Mercadona 4.12€ for ~2kg melon vs Lidl 1.39€/kg.
  // Set Mercadona price to 2.00€/kg so format 1 kg is consistent.
  const pina = await prisma.product.findFirst({
    where: { name: 'Piña', categoryId: 'frutas-verduras' }
  });
  if (pina) {
    await prisma.priceRecord.updateMany({
      where: { productId: pina.id, supermarket: { chain: 'Mercadona' } },
      data: { price: 2.00, referencePrice: 2.00, referenceUnit: 'kg' }
    });
    console.log('✓ Piña normalized to 2.00€/kg');
  }

  // Melón piel de sapo: Mercadona 5.87€ for ~2.7kg vs Lidl 2.09€/kg.
  // Set Mercadona price to 2.20€/kg so format 1 kg is consistent.
  const melon = await prisma.product.findFirst({
    where: { name: 'Melón piel de sapo', categoryId: 'frutas-verduras' }
  });
  if (melon) {
    await prisma.priceRecord.updateMany({
      where: { productId: melon.id, supermarket: { chain: 'Mercadona' } },
      data: { price: 2.20, referencePrice: 2.20, referenceUnit: 'kg' }
    });
    console.log('✓ Melón piel de sapo normalized to 2.20€/kg');
  }
}

run().finally(() => prisma.$disconnect());
