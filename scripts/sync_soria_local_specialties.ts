import prisma from '../src/db/prisma.js';
import { randomUUID } from 'crypto';

interface LocalProductInput {
  id: string;
  name: string;
  brand: string;
  format: string;
  imageUrl: string;
  categoryId: string;
  prices: {
    supermarketId: string;
    price: number;
    referencePrice?: number;
    referenceUnit?: string;
    externalUrl?: string;
  }[];
}

const soriaSpecialties: LocalProductInput[] = [
  // 1. Torreznos de Soria
  {
    id: 'torrezno-soria-la-hoguera-bandeja-215g',
    name: 'Torrezno de Soria precocinado La Hoguera bandeja 215 g',
    brand: 'La Hoguera',
    format: 'Bandeja 215 g',
    imageUrl: 'https://www.compraonline.alcampo.es/images-v3/37ea0506-72ec-4543-93c8-a77bb916ec12/e49b767d-643a-427e-a27e-310efcfa0f9d/300x300.jpg',
    categoryId: 'carniceria-charcuteria',
    prices: [
      {
        supermarketId: 'eleclerc-las-casas',
        price: 3.75,
        referencePrice: 17.44,
        referenceUnit: 'Kg',
        externalUrl: 'https://soria.e-leclerc.es/detalle/-/Producto/torreznos-de-soria-la-hoguera---215g/8422598031815',
      },
      {
        supermarketId: 'eleclerc-express',
        price: 3.75,
        referencePrice: 17.44,
        referenceUnit: 'Kg',
        externalUrl: 'https://soria.e-leclerc.es/detalle/-/Producto/torreznos-de-soria-la-hoguera---215g/8422598031815',
      },
      {
        supermarketId: 'alcampo-camaretas',
        price: 4.84,
        referencePrice: 22.51,
        referenceUnit: 'Kg',
        externalUrl: 'https://www.compraonline.alcampo.es/products/la-hoguera-bandeja-con-torreznos-de-soria-precocinados-la-hoguera-215-g/54822',
      },
    ],
  },
  {
    id: 'torrezno-soria-la-hoguera-1kg',
    name: 'Torrezno de Soria Marca de Garantía La Hoguera 1 kg',
    brand: 'La Hoguera',
    format: 'Pieza al vacío 1 kg',
    imageUrl: 'https://soria.e-leclerc.es/documents/10180/10815/9400002467107_M.jpg',
    categoryId: 'carniceria-charcuteria',
    prices: [
      {
        supermarketId: 'eleclerc-las-casas',
        price: 16.95,
        referencePrice: 16.95,
        referenceUnit: 'Kg',
        externalUrl: 'https://soria.e-leclerc.es/detalle/-/Producto/torrezno-de-soria-la-hoguera-1kg/9400002467107',
      },
      {
        supermarketId: 'eleclerc-express',
        price: 16.95,
        referencePrice: 16.95,
        referenceUnit: 'Kg',
        externalUrl: 'https://soria.e-leclerc.es/detalle/-/Producto/torrezno-de-soria-la-hoguera-1kg/9400002467107',
      },
      {
        supermarketId: 'alcampo-camaretas',
        price: 20.90,
        referencePrice: 20.90,
        referenceUnit: 'Kg',
        externalUrl: 'https://www.compraonline.alcampo.es/products/torrezno-de-soria-precocinado-la-hoguera-trozo/55678-TROZO',
      },
    ],
  },
  {
    id: 'torrezno-soria-villar-bandeja-230g',
    name: 'Torrezno de Soria precocinado Villar bandeja 230 g',
    brand: 'Villar',
    format: 'Bandeja 230 g',
    imageUrl: 'https://www.compraonline.alcampo.es/images-v3/37ea0506-72ec-4543-93c8-a77bb916ec12/8250e7f9-ea8e-442c-bcd2-4ca409638800/300x300.jpg',
    categoryId: 'carniceria-charcuteria',
    prices: [
      {
        supermarketId: 'alcampo-camaretas',
        price: 5.72,
        referencePrice: 24.87,
        referenceUnit: 'Kg',
        externalUrl: 'https://www.compraonline.alcampo.es/products/villar-bandeja-con-torreznos-de-soria-precocinados-villar-230-g/800836',
      },
    ],
  },
  {
    id: 'torrezno-soria-moreno-saez-precocinado-230g',
    name: 'Torreznos de Soria precocinados Moreno Sáez 230 g',
    brand: 'Moreno Sáez',
    format: 'Bandeja 230 g',
    imageUrl: 'https://soria.e-leclerc.es/documents/10180/10815/8425553001120_M.jpg',
    categoryId: 'carniceria-charcuteria',
    prices: [
      {
        supermarketId: 'eleclerc-las-casas',
        price: 4.15,
        referencePrice: 18.04,
        referenceUnit: 'Kg',
        externalUrl: 'https://soria.e-leclerc.es/detalle/-/Producto/torreznos-de-soria-precocinados-230g/8425553001120',
      },
      {
        supermarketId: 'eleclerc-express',
        price: 4.15,
        referencePrice: 18.04,
        referenceUnit: 'Kg',
        externalUrl: 'https://soria.e-leclerc.es/detalle/-/Producto/torreznos-de-soria-precocinados-230g/8425553001120',
      },
    ],
  },
  {
    id: 'torrezno-soria-virutas-moreno-saez-350g',
    name: 'Virutas de Torrezno de Soria Moreno Sáez 350 g',
    brand: 'Moreno Sáez',
    format: 'Bandeja 350 g',
    imageUrl: 'https://soria.e-leclerc.es/documents/10180/10815/8425553001212_M.jpg',
    categoryId: 'carniceria-charcuteria',
    prices: [
      {
        supermarketId: 'eleclerc-las-casas',
        price: 5.79,
        referencePrice: 16.54,
        referenceUnit: 'Kg',
        externalUrl: 'https://soria.e-leclerc.es/detalle/-/Producto/virutas-de-torrezno-de-soria-350g/8425553001212',
      },
      {
        supermarketId: 'eleclerc-express',
        price: 5.79,
        referencePrice: 16.54,
        referenceUnit: 'Kg',
        externalUrl: 'https://soria.e-leclerc.es/detalle/-/Producto/virutas-de-torrezno-de-soria-350g/8425553001212',
      },
    ],
  },

  // 2. Embutidos y Jamón Duroc de San Pedro Manrique (La Hoguera)
  {
    id: 'la-hoguera-chorizo-sarta-dulce-280g',
    name: 'Chorizo sarta dulce extra La Hoguera 280 g',
    brand: 'La Hoguera',
    format: 'Pieza 280 g',
    imageUrl: 'https://soria.e-leclerc.es/documents/10180/10815/8422598030498_M.jpg',
    categoryId: 'carniceria-charcuteria',
    prices: [
      {
        supermarketId: 'eleclerc-las-casas',
        price: 3.29,
        referencePrice: 11.75,
        referenceUnit: 'Kg',
        externalUrl: 'https://soria.e-leclerc.es/detalle/-/Producto/chorizo-sarta-dulce-280g/8422598030498',
      },
      {
        supermarketId: 'eleclerc-express',
        price: 3.29,
        referencePrice: 11.75,
        referenceUnit: 'Kg',
        externalUrl: 'https://soria.e-leclerc.es/detalle/-/Producto/chorizo-sarta-dulce-280g/8422598030498',
      },
    ],
  },
  {
    id: 'la-hoguera-chorizo-sarta-duroc-280g',
    name: 'Chorizo sarta dulce Raza Duroc La Hoguera 280 g',
    brand: 'La Hoguera',
    format: 'Pieza 280 g',
    imageUrl: 'https://soria.e-leclerc.es/documents/10180/10815/8422598051080_M.jpg',
    categoryId: 'carniceria-charcuteria',
    prices: [
      {
        supermarketId: 'eleclerc-las-casas',
        price: 3.39,
        referencePrice: 12.11,
        referenceUnit: 'Kg',
        externalUrl: 'https://soria.e-leclerc.es/detalle/-/Producto/chorizo-sarta-dulce-duroc-280g/8422598051080',
      },
      {
        supermarketId: 'eleclerc-express',
        price: 3.39,
        referencePrice: 12.11,
        referenceUnit: 'Kg',
        externalUrl: 'https://soria.e-leclerc.es/detalle/-/Producto/chorizo-sarta-dulce-duroc-280g/8422598051080',
      },
    ],
  },
  {
    id: 'la-hoguera-jamon-serrano-duroc-100g',
    name: 'Jamón Serrano Reserva Raza Duroc lonchas La Hoguera 100 g',
    brand: 'La Hoguera',
    format: 'Sobre 100 g',
    imageUrl: 'https://soria.e-leclerc.es/documents/10180/10815/8422598051073_M.jpg',
    categoryId: 'carniceria-charcuteria',
    prices: [
      {
        supermarketId: 'eleclerc-las-casas',
        price: 2.99,
        referencePrice: 29.90,
        referenceUnit: 'Kg',
        externalUrl: 'https://soria.e-leclerc.es/detalle/-/Producto/jamon-serrano-raza-duroc-100g/8422598051073',
      },
      {
        supermarketId: 'eleclerc-express',
        price: 2.99,
        referencePrice: 29.90,
        referenceUnit: 'Kg',
        externalUrl: 'https://soria.e-leclerc.es/detalle/-/Producto/jamon-serrano-raza-duroc-100g/8422598051073',
      },
    ],
  },

  // 3. Foie y pato de Soria (Malvasía - Abejar)
  {
    id: 'malvasia-mousse-foie-pato-100g',
    name: 'Mousse de Foie de Pato Malvasía 100 g',
    brand: 'Malvasía',
    format: 'Lata 100 g',
    imageUrl: 'https://soria.e-leclerc.es/documents/10180/10815/8423785400551_M.jpg',
    categoryId: 'conservas-comidas',
    prices: [
      {
        supermarketId: 'eleclerc-las-casas',
        price: 4.75,
        referencePrice: 47.50,
        referenceUnit: 'Kg',
        externalUrl: 'https://soria.e-leclerc.es/detalle/-/Producto/mousse-de-foie-de-pato-100g/8423785400551',
      },
      {
        supermarketId: 'eleclerc-express',
        price: 4.75,
        referencePrice: 47.50,
        referenceUnit: 'Kg',
        externalUrl: 'https://soria.e-leclerc.es/detalle/-/Producto/mousse-de-foie-de-pato-100g/8423785400551',
      },
      {
        supermarketId: 'alcampo-camaretas',
        price: 4.89,
        referencePrice: 48.90,
        referenceUnit: 'Kg',
        externalUrl: 'https://www.compraonline.alcampo.es/products/malvasia-mousse-de-foie-de-pato-100-g/56578',
      },
    ],
  },
  {
    id: 'malvasia-foie-gras-entero-mi-cuit-100g',
    name: 'Foie Gras Entero de Pato Mi-Cuit Malvasía 100 g',
    brand: 'Malvasía',
    format: 'Pieza 100 g',
    imageUrl: 'https://soria.e-leclerc.es/documents/10180/10815/8423785100178_M.jpg',
    categoryId: 'carniceria-charcuteria',
    prices: [
      {
        supermarketId: 'eleclerc-las-casas',
        price: 15.95,
        referencePrice: 159.50,
        referenceUnit: 'Kg',
        externalUrl: 'https://soria.e-leclerc.es/detalle/-/Producto/foie-gras-entero-pato-mi-cuit-100g/8423785100178',
      },
      {
        supermarketId: 'eleclerc-express',
        price: 15.95,
        referencePrice: 159.50,
        referenceUnit: 'Kg',
        externalUrl: 'https://soria.e-leclerc.es/detalle/-/Producto/foie-gras-entero-pato-mi-cuit-100g/8423785100178',
      },
    ],
  },

  // 4. Mantequerías York / Dulces de Soria
  {
    id: 'mantequerias-york-mantequilla-dulce-250g',
    name: 'Mantequilla de Soria Dulce Mantequerías York 250 g',
    brand: 'Mantequerías York',
    format: 'Lata 250 g',
    imageUrl: 'https://soria.e-leclerc.es/documents/10180/10815/8424194000013_M.jpg',
    categoryId: 'lacteos-huevos',
    prices: [
      {
        supermarketId: 'eleclerc-las-casas',
        price: 6.79,
        referencePrice: 27.16,
        referenceUnit: 'Kg',
        externalUrl: 'https://soria.e-leclerc.es/detalle/-/Producto/mantequilla-de-soria-dulce-mantequerias-york-250grs/8424194000013',
      },
      {
        supermarketId: 'eleclerc-express',
        price: 6.79,
        referencePrice: 27.16,
        referenceUnit: 'Kg',
        externalUrl: 'https://soria.e-leclerc.es/detalle/-/Producto/mantequilla-de-soria-dulce-mantequerias-york-250grs/8424194000013',
      },
    ],
  },
];

async function syncSoriaSpecialties() {
  console.log('🐗 Sincronizando especialidades y productos icónicos de Soria...');

  for (const item of soriaSpecialties) {
    const existing = await prisma.product.findFirst({
      where: {
        OR: [
          { id: item.id },
          { name: { contains: item.name } },
        ],
      },
    });

    let prodId = item.id;
    if (existing) {
      prodId = existing.id;
      await prisma.product.update({
        where: { id: prodId },
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
          id: prodId,
          name: item.name,
          brand: item.brand,
          format: item.format,
          imageUrl: item.imageUrl,
          categoryId: item.categoryId,
        },
      });
      console.log(`  + Creado: ${item.name}`);
    }

    // Vincular precios en cada súper
    for (const pr of item.prices) {
      const existingPrice = await prisma.priceRecord.findFirst({
        where: { productId: prodId, supermarketId: pr.supermarketId },
      });

      if (existingPrice) {
        await prisma.priceRecord.update({
          where: { id: existingPrice.id },
          data: {
            price: pr.price,
            referencePrice: pr.referencePrice,
            referenceUnit: pr.referenceUnit,
            externalUrl: pr.externalUrl,
            inStock: true,
            scrapedAt: new Date(),
          },
        });
        console.log(`    -> Precio actualizado en ${pr.supermarketId}: ${pr.price} €`);
      } else {
        await prisma.priceRecord.create({
          data: {
            id: randomUUID(),
            productId: prodId,
            supermarketId: pr.supermarketId,
            price: pr.price,
            referencePrice: pr.referencePrice,
            referenceUnit: pr.referenceUnit,
            externalUrl: pr.externalUrl,
            inStock: true,
          },
        });
        console.log(`    -> Precio registrado en ${pr.supermarketId}: ${pr.price} €`);
      }
    }
  }

  // Eliminar restos de productos que no son de Soria pero tenían "Torreznos" de Madrid
  const removedForeign = await prisma.product.deleteMany({
    where: {
      name: { contains: 'LA MADRILEÑA Torreznos' },
    },
  });
  if (removedForeign.count > 0) {
    console.log(`🧹 Eliminados ${removedForeign.count} productos no sorianos residuales.`);
  }

  console.log('✅ Especialidades de Soria sincronizadas.');
}

syncSoriaSpecialties()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
