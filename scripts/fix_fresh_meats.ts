import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🥩 Normalizing fresh meat items (kg comparison)...');

  const meatFixes = [
    {
      id: 'cmw2ahf7302wehg7jk0g49u7v',
      name: 'Pollo entero',
      kgPriceMercadona: 3.50,
      format: '1 kg'
    },
    {
      id: 'cmw2ahba702u8hg7jstqi5i2q',
      name: 'Solomillo de pavo',
      kgPriceMercadona: 8.00,
      format: '1 kg'
    },
    {
      id: 'cmw2ahfxn02wuhg7jx48aszty',
      name: 'Alas de pollo adobadas',
      kgPriceMercadona: 5.60,
      format: '1 kg'
    },
    {
      id: 'cmw2ahpa7031ihg7j8qhs9hku',
      name: 'Panceta de cerdo',
      kgPriceMercadona: 5.50,
      format: '1 kg'
    },
    {
      id: 'cmw2ahva5034mhg7jttipn41a',
      name: 'Medio conejo troceado',
      kgPriceMercadona: 9.60,
      format: '1 kg'
    }
  ];

  for (const fix of meatFixes) {
    await prisma.product.update({
      where: { id: fix.id },
      data: { format: fix.format }
    });

    await prisma.priceRecord.updateMany({
      where: {
        productId: fix.id,
        supermarket: { chain: 'Mercadona' }
      },
      data: {
        price: fix.kgPriceMercadona,
        referencePrice: fix.kgPriceMercadona,
        referenceUnit: 'kg'
      }
    });

    console.log(`  ✓ Normalized "${fix.name}" to ${fix.kgPriceMercadona} €/kg in Mercadona`);
  }

  // Torreznos Moreno Sáez: keep only the 400g tray (4.89€)
  await prisma.priceRecord.deleteMany({
    where: {
      productId: 'cmw2aj0sx03mshg7jbzh7dh7c',
      price: { gt: 6 }
    }
  });
  console.log('  ✓ Cleaned duplicate price in Torreznos Moreno Sáez');

  console.log('✅ Fresh meats successfully normalized to €/kg.');
}

main().finally(() => prisma.$disconnect());
