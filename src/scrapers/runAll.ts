import { scraperManager } from './index.js';
import prisma from '../db/prisma.js';

async function main() {
  console.log('🛒 Ejecutando scraping integral para todos los supermercados de Soria...');
  const results = await scraperManager.runAll();
  console.log('🏁 Resumen general:');
  console.table(results);
  await prisma.$disconnect();
}

main().catch(console.error);
