import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🍎 Normalizing loose fresh produce (piezas a granel -> precio por kg)...');

  // Find all products in frutas-verduras where format is "Pieza" or name indicates a loose fruit/vegetable
  const prods = await prisma.product.findMany({
    where: {
      categoryId: 'frutas-verduras',
    },
    include: {
      prices: {
        include: { supermarket: true }
      }
    }
  });

  console.log(`Analyzing ${prods.length} products in frutas-verduras...`);

  let normalizedCount = 0;

  for (const p of prods) {
    const isLooseFormat = p.format === 'Pieza' || p.format === 'pieza' || p.format === 'granel' || !p.format;
    
    // Check if this product is actual fresh produce (not packaged snacks, nuts, spices, chocolates)
    const lowerName = p.name.toLowerCase();
    const isPackagedProcessed = 
      lowerName.includes('frito') || 
      lowerName.includes('polvo') || 
      lowerName.includes('snack') || 
      lowerName.includes('tostado') || 
      lowerName.includes('chocolate') || 
      lowerName.includes('galleta') || 
      lowerName.includes('champu') || 
      lowerName.includes('crema') || 
      lowerName.includes('congelado') || 
      lowerName.includes('tarro') || 
      lowerName.includes('bote') || 
      lowerName.includes('bolsa') || 
      lowerName.includes('bandeja');

    for (const pr of p.prices) {
      // If reference unit is kg and referencePrice exists
      if (pr.referencePrice && pr.referenceUnit?.toLowerCase().includes('kg')) {
        // If format is explicitly "Pieza", or if price < 1.0 while referencePrice > 1.4 (typical single fruit piece)
        const isSinglePiece = (p.format === 'Pieza' && pr.price < pr.referencePrice * 0.7) ||
                             (!isPackagedProcessed && pr.price < 1.0 && pr.referencePrice >= 1.2 && pr.price < pr.referencePrice * 0.5);

        if (isSinglePiece) {
          await prisma.priceRecord.update({
            where: { id: pr.id },
            data: {
              price: pr.referencePrice,
              referencePrice: pr.referencePrice,
              referenceUnit: 'kg'
            }
          });
          normalizedCount++;
          if (normalizedCount <= 30) {
            console.log(`  ✓ Normalized [${p.id}] "${p.name}": ${pr.price} €/pieza -> ${pr.referencePrice} €/kg (${pr.supermarket.chain})`);
          }
        }
      }
    }

    // If format was "Pieza" and we normalized to kg, update product format to "1 kg (a granel)"
    if (p.format === 'Pieza' && !isPackagedProcessed) {
      await prisma.product.update({
        where: { id: p.id },
        data: { format: '1 kg (a granel)' }
      });
    }
  }

  console.log(`\n✅ Finished: Normalized ${normalizedCount} loose fruit & vegetable prices to standard price per kg.`);
}

main().finally(() => prisma.$disconnect());
