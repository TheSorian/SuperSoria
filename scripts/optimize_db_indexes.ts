import prisma from '../src/db/prisma.js';

async function optimizeIndexes() {
  console.log('⚡ Creando índices de alto rendimiento en dev.db...');

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "PriceRecord_prod_super_idx" 
    ON "PriceRecord"("productId", "supermarketId", "price")
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "Product_brand_idx" 
    ON "Product"("brand")
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "PriceRecord_super_idx" 
    ON "PriceRecord"("supermarketId", "price")
  `);

  console.log('⚡ Ejecutando ANALYZE para optimizar el planificador de consultas de SQLite...');
  await prisma.$executeRawUnsafe(`ANALYZE`);

  console.log('✅ Base de datos optimizada con éxito.');
}

optimizeIndexes().finally(() => prisma.$disconnect());
