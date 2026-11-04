import prisma from '../src/db/prisma.js';
async function run() {
  const cats = await prisma.category.findMany();
  console.log(cats.map(c => ({ id: c.id, name: c.name })));
}
run().finally(() => prisma.$disconnect());
