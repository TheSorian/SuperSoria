import prisma from '../src/db/prisma.js';
import { randomUUID } from 'crypto';

const alcampoCanadaRealProducts = [
  {
    id: 'canada-real-leche-fresca-pasteurizada-1l',
    name: 'Leche fresca entera pasteurizada Cañada Real 1 L',
    brand: 'Cañada Real',
    format: 'Botella 1 L refrigerada',
    imageUrl: 'https://www.compraonline.alcampo.es/images-v3/37ea0506-72ec-4543-93c8-a77bb916ec12/e37144b4-11af-4b96-aa37-d038cadc042c/300x300.jpg',
    categoryId: 'lacteos-huevos',
    alcampoPrice: 1.44,
    alcampoRefPrice: 1.44,
    alcampoRefUnit: 'Litro',
    alcampoUrl: 'https://www.compraonline.alcampo.es/products/ca%C3%B1ada-real-leche-de-vaca-entera-fresca-pasteurizada-y-que-no-necesita-ser-hervida-botella-de-1-l/90850',
  },
  {
    id: 'canada-real-leche-entera-1l',
    name: 'Leche entera de Soria Cañada Real 1 L',
    brand: 'Cañada Real',
    format: 'Brik 1 L',
    imageUrl: 'https://www.compraonline.alcampo.es/images-v3/37ea0506-72ec-4543-93c8-a77bb916ec12/bc0adf2b-28ce-4b07-ae6e-94c3bee08ec3/300x300.jpg',
    categoryId: 'lacteos-huevos',
    alcampoPrice: 1.18,
    alcampoRefPrice: 1.18,
    alcampoRefUnit: 'Litro',
    alcampoUrl: 'https://www.compraonline.alcampo.es/products/ca%C3%B1ada-real-leche-entera-de-soria-1-l/53156',
  },
  {
    id: 'canada-real-leche-semi-1l',
    name: 'Leche semidesnatada de Soria Cañada Real 1 L',
    brand: 'Cañada Real',
    format: 'Brik 1 L',
    imageUrl: 'https://www.compraonline.alcampo.es/images-v3/37ea0506-72ec-4543-93c8-a77bb916ec12/d976d715-8f2a-4f0d-ab25-1ff5906fcd1b/300x300.jpg',
    categoryId: 'lacteos-huevos',
    alcampoPrice: 1.11,
    alcampoRefPrice: 1.11,
    alcampoRefUnit: 'Litro',
    alcampoUrl: 'https://www.compraonline.alcampo.es/products/ca%C3%B1ada-real-leche-semidesnatada-de-soria-1-l/53149',
  },
  {
    id: 'canada-real-leche-desnatada-1l',
    name: 'Leche desnatada de Soria Cañada Real 1 L',
    brand: 'Cañada Real',
    format: 'Brik 1 L',
    imageUrl: 'https://www.compraonline.alcampo.es/images-v3/37ea0506-72ec-4543-93c8-a77bb916ec12/295f8763-23ce-4790-8bef-32fe6f48ac64/300x300.jpg',
    categoryId: 'lacteos-huevos',
    alcampoPrice: 1.08,
    alcampoRefPrice: 1.08,
    alcampoRefUnit: 'Litro',
    alcampoUrl: 'https://www.compraonline.alcampo.es/products/ca%C3%B1ada-real-leche-de-vaca-desnatada-1-l/725417',
  },
  {
    id: 'canada-real-leche-desnatada-pack-6x1l',
    name: 'Pack Leche desnatada de Soria Cañada Real 6 x 1 L',
    brand: 'Cañada Real',
    format: 'Pack 6 x 1 L',
    imageUrl: 'https://www.compraonline.alcampo.es/images-v3/37ea0506-72ec-4543-93c8-a77bb916ec12/ced0da71-57c7-43a5-b14e-a3469ef8c6c7/300x300.jpg',
    categoryId: 'lacteos-huevos',
    alcampoPrice: 6.48,
    alcampoRefPrice: 1.08,
    alcampoRefUnit: 'Litro',
    alcampoUrl: 'https://www.compraonline.alcampo.es/products/ca%C3%B1ada-real-leche-de-vaca-desnatada-con-origen-soria-6-x-1-l/725454',
  },
  {
    id: 'canada-real-mantequilla-dulce-soria-220g',
    name: 'Lata de mantequilla dulce de Soria Cañada Real 220 g',
    brand: 'Cañada Real',
    format: 'Lata 220 g',
    imageUrl: 'https://www.compraonline.alcampo.es/images-v3/37ea0506-72ec-4543-93c8-a77bb916ec12/c5587baf-1773-4082-b77d-4c7537f2d7f6/300x300.jpg',
    categoryId: 'lacteos-huevos',
    alcampoPrice: 6.46,
    alcampoRefPrice: 29.36,
    alcampoRefUnit: 'Kg',
    alcampoUrl: 'https://www.compraonline.alcampo.es/products/ca%C3%B1ada-real-lata-de-mantequilla-dulce-de-soria-ca%C3%B1ana-real-220-g/51464',
  },
  {
    id: 'canada-real-mantequilla-soria-con-sal-250g',
    name: 'Lata de mantequilla de Soria con sal Cañada Real 250 g',
    brand: 'Cañada Real',
    format: 'Lata 250 g',
    imageUrl: 'https://www.compraonline.alcampo.es/images-v3/37ea0506-72ec-4543-93c8-a77bb916ec12/413eca4a-74e6-4024-a620-f2458a3f5df1/300x300.jpg',
    categoryId: 'lacteos-huevos',
    alcampoPrice: 4.78,
    alcampoRefPrice: 19.12,
    alcampoRefUnit: 'Kg',
    alcampoUrl: 'https://www.compraonline.alcampo.es/products/ca%C3%B1ada-real-lata-de-mantequilla-de-soria-con-sal-ca%C3%B1ada-real-250-g/51487',
  },
  {
    id: 'canada-real-mantequilla-soria-sin-sal-250g',
    name: 'Lata de mantequilla de Soria sin sal Cañada Real 250 g',
    brand: 'Cañada Real',
    format: 'Lata 250 g',
    imageUrl: 'https://www.compraonline.alcampo.es/images-v3/37ea0506-72ec-4543-93c8-a77bb916ec12/1afa6e6e-f2c4-4607-8ba2-69cefa56c848/300x300.jpg',
    categoryId: 'lacteos-huevos',
    alcampoPrice: 4.78,
    alcampoRefPrice: 19.12,
    alcampoRefUnit: 'Kg',
    alcampoUrl: 'https://www.compraonline.alcampo.es/products/ca%C3%B1ada-real-lata-de-mantequilla-de-soria-sin-sal-ca%C3%B1ada-real-250-g/51475',
  },
  {
    id: 'canada-real-mantequilla-soria-sin-sal-500g',
    name: 'Lata de mantequilla de Soria sin sal Cañada Real 500 g',
    brand: 'Cañada Real',
    format: 'Lata 500 g',
    imageUrl: 'https://www.compraonline.alcampo.es/images-v3/37ea0506-72ec-4543-93c8-a77bb916ec12/3ecfe2e8-f8ff-4e21-9a41-3ad7682f4f32/300x300.jpg',
    categoryId: 'lacteos-huevos',
    alcampoPrice: 7.83,
    alcampoRefPrice: 15.66,
    alcampoRefUnit: 'Kg',
    alcampoUrl: 'https://www.compraonline.alcampo.es/products/ca%C3%B1ada-real-lata-de-mantequilla-de-soria-sin-sal-ca%C3%B1ada-real-500-g/51484',
  },
  {
    id: 'canada-real-mantequilla-pastilla-dulce-120g',
    name: 'Pastilla de mantequilla dulce tradicional de Soria Cañada Real 120 g',
    brand: 'Cañada Real',
    format: 'Pastilla 120 g',
    imageUrl: 'https://www.compraonline.alcampo.es/images-v3/37ea0506-72ec-4543-93c8-a77bb916ec12/2656bc38-7462-4c11-a833-014f8108842f/300x300.jpg',
    categoryId: 'lacteos-huevos',
    alcampoPrice: 3.98,
    alcampoRefPrice: 33.17,
    alcampoRefUnit: 'Kg',
    alcampoUrl: 'https://www.compraonline.alcampo.es/products/ca%C3%B1ada-real-pastilla-de-mantequilla-dulce-tradicional-de-soria-ca%C3%B1ada-real-120-g/52115',
  },
  {
    id: 'canada-real-natillas-vainilla-140g',
    name: 'Natillas de huevo a la vainilla natural Cañada Real 140 g',
    brand: 'Cañada Real',
    format: 'Tarrina 140 g',
    imageUrl: 'https://www.compraonline.alcampo.es/images-v3/37ea0506-72ec-4543-93c8-a77bb916ec12/b00ac067-e14a-41a9-b3aa-f24dd9978228/300x300.jpg',
    categoryId: 'lacteos-huevos',
    alcampoPrice: 1.24,
    alcampoRefPrice: 8.86,
    alcampoRefUnit: 'Kg',
    alcampoUrl: 'https://www.compraonline.alcampo.es/products/ca%C3%B1ada-real-natillas-de-huevo-a-la-vainilla-natural-ca%C3%B1ada-real-140-g/54145',
  },
  {
    id: 'canada-real-cuajada-oveja-250g',
    name: 'Cuajada de oveja Cañada Real 250 g',
    brand: 'Cañada Real',
    format: 'Tarrina 250 g',
    imageUrl: 'https://www.compraonline.alcampo.es/images-v3/37ea0506-72ec-4543-93c8-a77bb916ec12/a093c5b9-5bac-4698-b8f7-8c646f89d857/300x300.jpg',
    categoryId: 'lacteos-huevos',
    alcampoPrice: 1.23,
    alcampoRefPrice: 8.79,
    alcampoRefUnit: 'Kg',
    alcampoUrl: 'https://www.compraonline.alcampo.es/products/ca%C3%B1ada-real-cuajada-de-oveja-ca%C3%B1ada-real-250-g/50389',
  },
  {
    id: 'canada-real-flan-huevo-2x110g',
    name: 'Flan de huevo al baño María Cañada Real 2 x 110 g',
    brand: 'Cañada Real',
    format: 'Pack 2 x 110 g',
    imageUrl: 'https://www.compraonline.alcampo.es/images-v3/37ea0506-72ec-4543-93c8-a77bb916ec12/d5198218-8c87-4b47-85ef-3a565b809a3e/300x300.jpg',
    categoryId: 'lacteos-huevos',
    alcampoPrice: 1.72,
    alcampoRefPrice: 7.82,
    alcampoRefUnit: 'Kg',
    alcampoUrl: 'https://www.compraonline.alcampo.es/products/ca%C3%B1ada-real-flan-de-huevo-al-ba%C3%B1o-maria-ca%C3%B1ada-real-2-x-110-g/51223',
  },
  {
    id: 'canada-real-flan-queso-2x110g',
    name: 'Flan de huevo y queso Cañada Real 2 x 110 g',
    brand: 'Cañada Real',
    format: 'Pack 2 x 110 g',
    imageUrl: 'https://www.compraonline.alcampo.es/images-v3/37ea0506-72ec-4543-93c8-a77bb916ec12/2f7e3e0e-3887-4402-ac61-b5c696691251/300x300.jpg',
    categoryId: 'lacteos-huevos',
    alcampoPrice: 2.50,
    alcampoRefPrice: 11.36,
    alcampoRefUnit: 'Kg',
    alcampoUrl: 'https://www.compraonline.alcampo.es/products/ca%C3%B1ada-real-flan-de-huevo-y-queso-ca%C3%B1ada-real-2-x-110-g/90823',
  },
  {
    id: 'canada-real-queso-fresco-500g',
    name: 'Queso fresco Cañada Real 500 g',
    brand: 'Cañada Real',
    format: 'Pieza 500 g',
    imageUrl: 'https://www.compraonline.alcampo.es/images-v3/37ea0506-72ec-4543-93c8-a77bb916ec12/03a19b9c-dd2b-44dc-b04c-4e91a9d1f0ec/300x300.jpg',
    categoryId: 'lacteos-huevos',
    alcampoPrice: 3.99,
    alcampoRefPrice: 7.98,
    alcampoRefUnit: 'Kg',
    alcampoUrl: 'https://www.compraonline.alcampo.es/products/ca%C3%B1ada-real-queso-fresco-ca%C3%B1ada-real-500g/50455',
  },
];

async function main() {
  console.log('🧀 Sincronizando productos oficiales de Cañada Real desde Alcampo Soria (Camaretas)...');

  for (const item of alcampoCanadaRealProducts) {
    const existing = await prisma.product.findFirst({
      where: {
        OR: [
          { id: item.id },
          { name: { contains: item.brand } && { contains: item.format.split(' ')[0] } },
        ],
      },
    });

    let productId = item.id;
    if (existing) {
      productId = existing.id;
      await prisma.product.update({
        where: { id: productId },
        data: {
          name: item.name,
          brand: item.brand,
          format: item.format,
          imageUrl: item.imageUrl || existing.imageUrl,
          categoryId: item.categoryId,
        },
      });
      console.log(`  ✓ Actualizado: ${item.name}`);
    } else {
      await prisma.product.create({
        data: {
          id: productId,
          name: item.name,
          brand: item.brand,
          format: item.format,
          imageUrl: item.imageUrl,
          categoryId: item.categoryId,
        },
      });
      console.log(`  + Creado: ${item.name}`);
    }

    // Vincular precio en Alcampo Camaretas
    const existingPrice = await prisma.priceRecord.findFirst({
      where: {
        productId: productId,
        supermarketId: 'alcampo-camaretas',
      },
    });

    if (existingPrice) {
      await prisma.priceRecord.update({
        where: { id: existingPrice.id },
        data: {
          price: item.alcampoPrice,
          referencePrice: item.alcampoRefPrice,
          referenceUnit: item.alcampoRefUnit,
          externalUrl: item.alcampoUrl,
          inStock: true,
          scrapedAt: new Date(),
        },
      });
      console.log(`    -> Precio Alcampo Camaretas actualizado: ${item.alcampoPrice} €`);
    } else {
      await prisma.priceRecord.create({
        data: {
          id: randomUUID(),
          productId: productId,
          supermarketId: 'alcampo-camaretas',
          price: item.alcampoPrice,
          referencePrice: item.alcampoRefPrice,
          referenceUnit: item.alcampoRefUnit,
          externalUrl: item.alcampoUrl,
          inStock: true,
        },
      });
      console.log(`    -> Precio Alcampo Camaretas registrado: ${item.alcampoPrice} €`);
    }
  }

  // Also remove Madrid-specific local products from alcampo-camaretas if any exist
  const removedMadrid = await prisma.priceRecord.deleteMany({
    where: {
      supermarketId: 'alcampo-camaretas',
      product: {
        OR: [
          { name: { contains: 'COLMENAREÑA' } },
          { name: { contains: 'Colmenareña' } },
          { name: { contains: 'Priégola' } },
          { name: { contains: 'PRIÉGOLA' } },
        ],
      },
    },
  });
  console.log(`🧹 Eliminados ${removedMadrid.count} registros de precios de Madrid (Colmenareña, Priégola) de Alcampo Camaretas.`);

  console.log('✅ Cañada Real sincronizado exitosamente con Alcampo Camaretas.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
