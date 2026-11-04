import { scraperManager } from './index.js';
import prisma from '../db/prisma.js';

async function main() {
  console.log('🚀 Iniciando scraping de Mercadona Soria (CP 42001-42005)...');
  const result = await scraperManager.runScraper('mercadona-saavedra');
  console.log('📊 Resultado Mercadona:', result);
  await prisma.$disconnect();
}

main().catch(console.error);
