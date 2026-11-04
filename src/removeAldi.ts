import prisma from './db/prisma.js';

async function removeAldi() {
  const prices = await prisma.priceRecord.deleteMany({ where: { supermarketId: 'aldi-soria' } });
  console.log('Precios de Aldi eliminados:', prices.count);

  const sm = await prisma.supermarket.deleteMany({ where: { id: 'aldi-soria' } });
  console.log('Supermercado Aldi eliminado:', sm.count);

  // Eliminar productos huérfanos que solo tenían precio en Aldi
  const orphanProducts = await prisma.product.deleteMany({
    where: {
      prices: {
        none: {},
      },
      listItems: {
        none: {},
      },
    },
  });
  console.log('Productos exclusivos de Aldi limpiados:', orphanProducts.count);

  await prisma.$disconnect();
}

removeAldi().catch(console.error);
