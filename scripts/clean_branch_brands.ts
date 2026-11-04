import prisma from '../src/db/prisma.js';

async function cleanBranchBrands() {
  console.log('🧹 Limpiando marcas que tenían el sufijo de la tienda (Dia Soria, Lidl Soria, etc.)...');

  const replacements = [
    { from: 'Dia Soria', to: 'Dia' },
    { from: 'Lidl Soria', to: 'Lidl' },
    { from: 'Mercadona Soria', to: 'Mercadona' },
    { from: 'E.Leclerc Soria', to: 'E.Leclerc' },
    { from: 'Lupa Soria', to: 'Lupa' },
    { from: 'Alcampo Soria', to: 'Alcampo' },
  ];

  for (const r of replacements) {
    const res = await prisma.product.updateMany({
      where: { brand: r.from },
      data: { brand: r.to },
    });
    console.log(`  ✓ ${r.from} -> ${r.to}: ${res.count} productos actualizados.`);
  }

  console.log('✨ Marcas limpiadas.');
}

cleanBranchBrands().finally(() => prisma.$disconnect());
