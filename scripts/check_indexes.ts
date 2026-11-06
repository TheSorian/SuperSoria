import prisma from '../src/db/prisma.js';

async function main() {
  const indexes: any[] = await prisma.$queryRawUnsafe(`SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index'`);
  console.log('INDEXES IN DB:');
  for (const idx of indexes) {
    console.log(`- ${idx.name} on ${idx.tbl_name}: ${idx.sql}`);
  }
}

main().finally(() => prisma.$disconnect());
