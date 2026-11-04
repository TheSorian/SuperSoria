import { scraperManager } from './index.js';
import prisma from '../db/prisma.js';

async function main() {
  console.log('🚀 Iniciando scraping de Dia Soria...');
  const result = await scraperManager.runScraper('dia-aguirre');
  console.log('📊 Resultado Dia:', result);
  await prisma.$disconnect();
}

main().catch(console.error);
