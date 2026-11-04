import { scraperManager } from './index.js';
import prisma from '../db/prisma.js';

async function main() {
  console.log('🚀 Sincronizando catálogos completos para Soria desde feeds y bases locales...');

  const targets = [
    { id: 'dia-aguirre', name: 'Dia Soria', limit: 250 },
    { id: 'lidl-valladolid', name: 'Lidl Soria', limit: 250 },
    { id: 'alcampo-camaretas', name: 'Alcampo Soria / Camaretas', limit: 250 },
    { id: 'aldi-soria', name: 'Aldi Soria', limit: 250 },
    { id: 'lupa-granados', name: 'Lupa Supermercados Soria', limit: 100 },
    { id: 'eleclerc-las-casas', name: 'E.Leclerc Hipermercado Soria', limit: 100 },
  ];

  for (const t of targets) {
    console.log(`\n⏳ Sincronizando ${t.name}...`);
    const res = await scraperManager.runScraper(t.id, t.limit);
    console.log(`✅ ${t.name}: ${res.productsSaved} productos guardados en ${res.durationMs}ms`);
  }

  const [totalProducts, totalPrices] = await Promise.all([
    prisma.product.count(),
    prisma.priceRecord.count(),
  ]);

  console.log('\n🏁 Sincronización completada con éxito.');
  console.log(`📊 Total en Base de Datos de Soria: ${totalProducts} productos | ${totalPrices} precios.`);
  await prisma.$disconnect();
}

main().catch(console.error);
