import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Starting database price cleanup and normalization...');

  // =========================================================================
  // 1. CLEAN CORRUPTED CROSS-MATCHES IN CAÑADA REAL
  // =========================================================================
  console.log('\n--- 1. Cleaning Cañada Real cross-matches ---');

  // cmw2abdkr0002sz274uqwcef1: Flan de huevo al baño María Cañada Real 2 x 110 g
  // Remove Dia and Lidl milk prices attached to it
  const del1 = await prisma.priceRecord.deleteMany({
    where: {
      productId: 'cmw2abdkr0002sz274uqwcef1',
      supermarket: { chain: { in: ['Dia', 'Lidl'] } }
    }
  });
  console.log(`Cleaned ${del1.count} wrong Dia/Lidl prices from Flan al baño María.`);

  // cmw2abdnw0006sz27vihojn3p: Flan de huevo y queso Cañada Real 2 x 110 g
  const del2 = await prisma.priceRecord.deleteMany({
    where: {
      productId: 'cmw2abdnw0006sz27vihojn3p',
      supermarket: { chain: { in: ['Dia', 'Lidl'] } }
    }
  });
  console.log(`Cleaned ${del2.count} wrong Dia/Lidl prices from Flan de queso.`);

  // cmw2aedz201bihg7j9szbv1jk: Pastilla de mantequilla dulce tradicional Cañada Real 120 g
  // Mercadona has no 120g Cañada Real (only 1.15€ pastilla de caldo)
  const del3 = await prisma.priceRecord.deleteMany({
    where: {
      productId: 'cmw2aedz201bihg7j9szbv1jk',
      supermarket: { chain: 'Mercadona' }
    }
  });
  console.log(`Cleaned ${del3.count} wrong Mercadona prices from Mantequilla Cañada Real 120g.`);

  // cmw2agkvz02fmhg7jsdv4v6zu: Queso fresco Cañada Real 500 g
  const del4 = await prisma.priceRecord.deleteMany({
    where: {
      productId: 'cmw2agkvz02fmhg7jsdv4v6zu',
      supermarket: { chain: 'Mercadona' }
    }
  });
  console.log(`Cleaned ${del4.count} wrong Mercadona prices from Queso fresco Cañada Real 500g.`);

  // Torreznos de Soria Dia 215g: remove Lidl 1.25€ (unrelated product)
  const del5 = await prisma.priceRecord.deleteMany({
    where: {
      productId: 'cmw2abg6h0032sz27tz02h6as',
      supermarket: { chain: 'Lidl' }
    }
  });
  console.log(`Cleaned ${del5.count} wrong Lidl prices from Torreznos Dia 215g.`);

  // Huevos Dia 12 uds: remove Mercadona (which was chicken meat)
  const del6 = await prisma.priceRecord.deleteMany({
    where: {
      productId: 'cmw2abdzk000isz27njv5fd2l',
      supermarket: { chain: 'Mercadona' }
    }
  });
  console.log(`Cleaned ${del6.count} wrong Mercadona prices from Huevos Dia.`);

  // =========================================================================
  // 2. FIX PACK VS SINGLE UNIT IN DAIRY & BEVERAGES
  // =========================================================================
  console.log('\n--- 2. Harmonizing Pack vs Single Brik prices ---');

  // Leche desnatada Pascual 1 L (48e78535-79b2-4003-90dc-80499dee34aa)
  // Mercadona had 7.74€ (pack of 6). Set to 1.29€ for 1 L brik
  await prisma.priceRecord.updateMany({
    where: {
      productId: '48e78535-79b2-4003-90dc-80499dee34aa',
      supermarket: { chain: 'Mercadona' }
    },
    data: { price: 1.29, referencePrice: 1.29, referenceUnit: 'l' }
  });

  // Leche semidesnatada Pascual 1 L (a200f898-7557-41ec-bf07-b1e38bd02439)
  // Mercadona had 8.10€ (pack of 6). Set to 1.35€ for 1 L brik
  await prisma.priceRecord.updateMany({
    where: {
      productId: 'a200f898-7557-41ec-bf07-b1e38bd02439',
      supermarket: { chain: 'Mercadona' }
    },
    data: { price: 1.35, referencePrice: 1.35, referenceUnit: 'l' }
  });

  // Leche entera Cañada Real (77873f06-5e4b-4182-8eee-7796ca1052eb)
  // Mercadona Palomar had 7.20€ (pack of 6). Set to 1.20€ for 1 L brik
  await prisma.priceRecord.updateMany({
    where: {
      productId: '77873f06-5e4b-4182-8eee-7796ca1052eb',
      supermarket: { chain: 'Mercadona' }
    },
    data: { price: 1.20, referencePrice: 1.20, referenceUnit: 'l' }
  });

  // Leche desnatada Cañada Real (32f18b6a-1744-4931-9a2c-5ab970f23762)
  // Mercadona Palomar had 6.60€ (pack of 6). Set to 1.10€ for 1 L brik
  await prisma.priceRecord.updateMany({
    where: {
      productId: '32f18b6a-1744-4931-9a2c-5ab970f23762',
      supermarket: { chain: 'Mercadona' }
    },
    data: { price: 1.10, referencePrice: 1.10, referenceUnit: 'l' }
  });

  // Leche semidesnatada Cañada Real (e95b4ea4-f6de-4c11-b0d9-c8daa00c68a5)
  // Set to 1.13€ for 1 L brik
  await prisma.priceRecord.updateMany({
    where: {
      productId: 'e95b4ea4-f6de-4c11-b0d9-c8daa00c68a5',
      supermarket: { chain: 'Mercadona' }
    },
    data: { price: 1.13, referencePrice: 1.13, referenceUnit: 'l' }
  });

  // Leche desnatada Dia Láctea pack 6 x 1 L (cmw2abdud000esz27x7nvq8nc)
  // Remove Lidl 0.82€ (1 single brik from lidl attached to 6-pack)
  await prisma.priceRecord.deleteMany({
    where: {
      productId: 'cmw2abdud000esz27x7nvq8nc',
      supermarket: { chain: 'Lidl' }
    }
  });

  // Leche semidesnatada sin lactosa Dia Láctea pack 6 x 1 L (cmw2abdr6000asz275m712lrw)
  // Dia had 1.29€ (single brik price), while Leclerc had 7.56€ (pack of 6).
  // Update Dia's price to pack price (6 * 1.29 = 7.74€) so it compares apples to apples!
  await prisma.priceRecord.updateMany({
    where: {
      productId: 'cmw2abdr6000asz275m712lrw',
      supermarket: { chain: 'Dia' }
    },
    data: { price: 7.74, referencePrice: 1.29, referenceUnit: 'l' }
  });

  // =========================================================================
  // 3. FIX OILS (Garrafa 5L vs Botella 1L)
  // =========================================================================
  console.log('\n--- 3. Harmonizing Oil bottle vs garrafa prices ---');

  // Aceite de oliva 0,4º Hacendado (cmw2ac07n0002hg7j4e543fze)
  // Standardize on 1 L bottle (3.60€)
  await prisma.priceRecord.updateMany({
    where: {
      productId: 'cmw2ac07n0002hg7j4e543fze',
      price: { gt: 10 }
    },
    data: { price: 3.60, referencePrice: 3.60, referenceUnit: 'l' }
  });

  // Aceite de oliva 1º Hacendado (cmw2ac0k2000ahg7jizqmdhu4)
  await prisma.priceRecord.updateMany({
    where: {
      productId: 'cmw2ac0k2000ahg7jizqmdhu4',
      price: { gt: 10 }
    },
    data: { price: 3.80, referencePrice: 3.80, referenceUnit: 'l' }
  });

  // Aceite de oliva virgen Hacendado (cmw2ac0pg000ehg7jwddeua7f)
  await prisma.priceRecord.updateMany({
    where: {
      productId: 'cmw2ac0pg000ehg7jwddeua7f',
      price: { gt: 10 }
    },
    data: { price: 4.10, referencePrice: 4.10, referenceUnit: 'l' }
  });

  // Aceite Eliges 1L (b8962328-09ef-4bee-a4c4-5340e1f9b045)
  // Standardize on 1 L (3.69€)
  await prisma.priceRecord.updateMany({
    where: {
      productId: 'b8962328-09ef-4bee-a4c4-5340e1f9b045',
      price: { gt: 10 }
    },
    data: { price: 3.69, referencePrice: 3.69, referenceUnit: 'Litro' }
  });

  // Aceite Eliges suave 1L (de381571-39cf-4ade-895f-0c8d21e81294)
  await prisma.priceRecord.updateMany({
    where: {
      productId: 'de381571-39cf-4ade-895f-0c8d21e81294',
      price: { gt: 10 }
    },
    data: { price: 3.69, referencePrice: 3.69, referenceUnit: 'Litro' }
  });

  // Aceite Coosur 1L (bf205ba6-d0ba-4158-8fca-d67d960fe706)
  await prisma.priceRecord.updateMany({
    where: {
      productId: 'bf205ba6-d0ba-4158-8fca-d67d960fe706',
      price: { lt: 3 }
    },
    data: { price: 5.49, referencePrice: 5.49, referenceUnit: 'l' }
  });

  // Coca-Cola 2L (cec5d7a9-49e1-46bf-8bcd-fa6052725a81): Dia had pack price 11.13€, set to 2.30€
  await prisma.priceRecord.updateMany({
    where: {
      productId: 'cec5d7a9-49e1-46bf-8bcd-fa6052725a81',
      price: { gt: 5 }
    },
    data: { price: 2.30, referencePrice: 1.15, referenceUnit: 'l' }
  });

  // Jamón bellota (1e418f11-7871-424f-81bb-4b0ea0ad428a): Mercadona had whole leg 476€ vs 15.12€ pack.
  // Standardize on pack 15.12€
  await prisma.priceRecord.updateMany({
    where: {
      productId: '1e418f11-7871-424f-81bb-4b0ea0ad428a',
      price: { gt: 100 }
    },
    data: { price: 15.12, referencePrice: 168.0, referenceUnit: 'kg' }
  });

  // Jamón serrano (5f47ad3b-dcca-40f9-98b2-f4496fefb2b8): Mercadona had whole ham 49€ vs Lidl 90g pack 2.59€.
  // Remove whole ham from 90g blister product:
  await prisma.priceRecord.deleteMany({
    where: {
      productId: '5f47ad3b-dcca-40f9-98b2-f4496fefb2b8',
      price: { gt: 20 }
    }
  });

  // =========================================================================
  // 4. FIX FRESH PRODUCE (FRUTAS, VERDURAS, PESCADERÍA, CARNE AL PESO)
  // =========================================================================
  console.log('\n--- 4. Normalizing Fresh Produce Piece vs Kg ---');

  // List of bulk fresh produce where Mercadona stored single piece price (e.g. 0.23€)
  // while format is 1 kg or reference is per kg.
  // We normalize to price per kg so the comparison is exact!
  const bulkProduceFixes = [
    { name: 'Tomate ensalada', kgPrice: 2.60, format: '1 kg' },
    { name: 'Tomate rosa', kgPrice: 3.40, format: '1 kg' },
    { name: 'Tomate negro', kgPrice: 2.70, format: '1 kg' },
    { name: 'Berenjena', kgPrice: 2.20, format: '1 kg' },
    { name: 'Berenjena rayada', kgPrice: 2.50, format: '1 kg' },
    { name: 'Mango', kgPrice: 2.90, format: '1 kg' },
    { name: 'Piña', kgPrice: 2.00, format: '1 kg' },
    { name: 'Chirimoya', kgPrice: 3.40, format: '1 kg' },
    { name: 'Granada', kgPrice: 3.00, format: '1 kg' },
    { name: 'Melocotón amarillo', kgPrice: 3.30, format: '1 kg' },
    { name: 'Melón piel de sapo', kgPrice: 2.20, format: '1 kg' },
    { name: 'Ciruela roja', kgPrice: 3.50, format: '1 kg' },
    { name: 'Ciruela amarilla', kgPrice: 3.80, format: '1 kg' },
    { name: 'Manzana Golden', kgPrice: 2.00, format: '1 kg' },
    { name: 'Pomelo', kgPrice: 3.30, format: '1 kg' },
    { name: 'Banana', kgPrice: 1.25, format: '1 kg' },
    { name: 'Limón', kgPrice: 2.60, format: '1 kg' },
    { name: 'Chorizo oreado', kgPrice: 6.90, format: '1 kg' },
    { name: 'Filetes de dorada', kgPrice: 22.50, format: '1 kg' },
    { name: 'Dorada limpia', kgPrice: 12.50, format: '1 kg' },
    { name: 'Porciones de merluza', kgPrice: 26.95, format: '1 kg' },
    { name: 'Lubina limpia', kgPrice: 13.00, format: '1 kg' },
    { name: 'Secreto de cerdo', kgPrice: 6.20, format: '1 kg' },
    { name: 'Solomillo de cerdo', kgPrice: 7.80, format: '1 kg' },
  ];

  for (const fix of bulkProduceFixes) {
    const prod = await prisma.product.findFirst({
      where: {
        name: fix.name,
        categoryId: { in: ['frutas-verduras', 'pescaderia', 'carniceria-charcuteria'] }
      },
      include: { prices: { include: { supermarket: true } } }
    });

    if (prod) {
      await prisma.product.update({
        where: { id: prod.id },
        data: { format: fix.format }
      });

      // Update Mercadona price to the per-kg price if it was stored as single piece
      for (const pr of prod.prices) {
        if (pr.supermarket.chain === 'Mercadona' && pr.price < fix.kgPrice * 0.7) {
          await prisma.priceRecord.update({
            where: { id: pr.id },
            data: {
              price: fix.kgPrice,
              referencePrice: fix.kgPrice,
              referenceUnit: 'kg'
            }
          });
          console.log(`  ✓ Updated ${fix.name} Mercadona price from ${pr.price}€ -> ${fix.kgPrice}€/kg`);
        }
      }
    }
  }

  // =========================================================================
  // 5. AUTOMATIC CHECK: Any remaining fresh produce where price < 1.0
  // and referencePrice is between 1.5 and 30 per kg
  // =========================================================================
  const remainingAnomalies = await prisma.product.findMany({
    where: {
      categoryId: { in: ['frutas-verduras', 'pescaderia', 'carniceria-charcuteria'] }
    },
    include: {
      prices: {
        include: { supermarket: true }
      }
    }
  });

  for (const p of remainingAnomalies) {
    if (p.prices.length > 1) {
      const pPrices = p.prices.map(pr => pr.price);
      const minP = Math.min(...pPrices);
      const maxP = Math.max(...pPrices);

      if (minP > 0 && maxP / minP >= 2.5) {
        for (const pr of p.prices) {
          // If this price is suspiciously low (< 1€) and has a refPrice > 1.5€/kg
          if (pr.price < 1.0 && pr.referencePrice && pr.referencePrice >= 1.5 && pr.referenceUnit?.toLowerCase().includes('kg')) {
            console.log(`  [Auto-normalizing] ${p.name} (${pr.supermarket.chain}): ${pr.price}€ -> ${pr.referencePrice}€/kg`);
            await prisma.priceRecord.update({
              where: { id: pr.id },
              data: {
                price: pr.referencePrice,
                referencePrice: pr.referencePrice,
                referenceUnit: 'kg'
              }
            });
          }
        }
      }
    }
  }

  console.log('\n✅ Cleanup and normalization completed successfully.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
