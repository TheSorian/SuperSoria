import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning remaining 32 discrepancies...');

  // Leche entera Pascual 1 L (827d1b53-97b9-4911-bb90-6f58f85d1584)
  await prisma.priceRecord.updateMany({
    where: { productId: '827d1b53-97b9-4911-bb90-6f58f85d1584', supermarket: { chain: 'Mercadona' } },
    data: { price: 1.39, referencePrice: 1.39, referenceUnit: 'l' }
  });

  // Leche semidesnatada Pascual 1 L (5a821cef-842a-4db2-9f07-b1e38bd02439)
  await prisma.priceRecord.updateMany({
    where: { productId: '5a821cef-842a-4db2-9f07-b1e38bd02439', supermarket: { chain: 'Mercadona' } },
    data: { price: 1.35, referencePrice: 1.35, referenceUnit: 'l' }
  });

  // Aceite Jaencoop 1 L (baab0cb2-eaf7-4786-9508-4a5a22436d4f): remove the 250ml spray price (2.49€)
  await prisma.priceRecord.deleteMany({
    where: { productId: 'baab0cb2-eaf7-4786-9508-4a5a22436d4f', price: { lt: 4 } }
  });

  // Aceite Coosur Serie Oro 3L (d773b5b0-0938-4999-a261-15271b445dc0): remove the 1L price (4.15€)
  await prisma.priceRecord.deleteMany({
    where: { productId: 'd773b5b0-0938-4999-a261-15271b445dc0', price: { lt: 6 } }
  });

  // Remove mismatched competitor brands from Hacendado-branded products:
  // Hacendado chocolate barritas: remove Kinder from Leclerc
  await prisma.priceRecord.deleteMany({
    where: { productId: 'cmw2aepmn01hihg7jtnqd2ytq', supermarket: { chain: 'E.Leclerc' } }
  });

  // Hacendado alubia blanca: remove Lidl
  await prisma.priceRecord.deleteMany({
    where: { productId: 'cmw2ae0tw0146hg7jihqhh6by', supermarket: { chain: 'Lidl' } }
  });

  // Hacendado Senzza bombones: remove Lidl
  await prisma.priceRecord.deleteMany({
    where: { productId: 'cmw2aeunn01kahg7jpfmg7v1z', supermarket: { chain: 'Lidl' } }
  });

  // Hacendado Golosinas Mini Mix: remove Lidl
  await prisma.priceRecord.deleteMany({
    where: { productId: 'cmw2af1ac01nihg7j3kebak1c', supermarket: { chain: 'Lidl' } }
  });

  // Hacendado Chocolate extrafino: remove Lidl
  await prisma.priceRecord.deleteMany({
    where: { productId: 'cmw2aem8601fqhg7ju5muh76j', supermarket: { chain: 'Lidl' } }
  });

  // Hacendado Barquillos: remove Lidl
  await prisma.priceRecord.deleteMany({
    where: { productId: 'cmw2ahq8b030ihg7jf5h3qfms', supermarket: { chain: 'Lidl' } }
  });

  // Hacendado Pimenton: remove Lidl
  await prisma.priceRecord.deleteMany({
    where: { productId: 'cmw2ac44w0046hg7jv8pyjcoa', supermarket: { chain: 'Lidl' } }
  });

  // Bronchales garrafa 6L: remove Lidl 1.5L bottle
  await prisma.priceRecord.deleteMany({
    where: { productId: 'cmw2acem800dyhg7jxjzbcged', supermarket: { chain: 'Lidl' } }
  });

  // Vichy Catalan: remove Lidl
  await prisma.priceRecord.deleteMany({
    where: { productId: 'cmw2acis000fehg7j1u3h1yvc', supermarket: { chain: 'Lidl' } }
  });

  // Coca-Cola pack vs single can: remove Lidl single can from pack-2
  await prisma.priceRecord.deleteMany({
    where: { productId: 'cmw2acqoa00iihg7jwq26f52k', supermarket: { chain: 'Lidl' } }
  });

  // Coca-Cola zero: harmonize to single can / bottle
  await prisma.priceRecord.deleteMany({
    where: { productId: 'cmw2acrwi00iqhg7jtm68aucb', price: { gt: 2 } }
  });

  // Dolce Gusto 30 uds: remove Leclerc Eliges 16 uds
  await prisma.priceRecord.deleteMany({
    where: { productId: 'dc69df9f-3355-41da-a045-d3acb628f94d', supermarket: { chain: 'E.Leclerc' } }
  });

  // Producto Alcampo infusion: remove Leclerc anís a granel
  await prisma.priceRecord.deleteMany({
    where: { productId: '9089fe4f-c615-4e97-96e3-ea5437119e5b', supermarket: { chain: 'E.Leclerc' } }
  });

  // Atun Dia 78g: remove pack price 4.25
  await prisma.priceRecord.deleteMany({
    where: { productId: '04fc5d5b-d573-41c2-bed6-2365c0316e36', price: { gt: 3 } }
  });

  // Atún Albo 3x48g: remove single can 2.39€
  await prisma.priceRecord.deleteMany({
    where: { productId: '21203c4c-8b4b-4660-898c-45f276efdc67', price: { lt: 3 } }
  });

  // Café molido descafeinado Hacendado: normalize 2.50€ for 250g pack
  await prisma.priceRecord.updateMany({
    where: { productId: 'cmw2agweq02lyhg7j1a6rjv87', price: { gt: 3 } },
    data: { price: 2.50, referencePrice: 10.0, referenceUnit: 'kg' }
  });

  // Café en grano Hacendado: normalize to 500g (6.00€)
  await prisma.priceRecord.updateMany({
    where: { productId: 'cmw2agya702muhg7jsgqmy75r', price: { gt: 10 } },
    data: { price: 6.00, referencePrice: 12.0, referenceUnit: 'kg' }
  });

  // Café soluble descafeinado sobres Hacendado: normalize to 10 sobres (1.20€)
  await prisma.priceRecord.updateMany({
    where: { productId: 'cmw2ah09q02nuhg7j50gjenk1', price: { gt: 2 } },
    data: { price: 1.20, referencePrice: 60.0, referenceUnit: 'kg' }
  });

  // Albahaca / Ajo perejil: remove cross store spices with different formats
  await prisma.priceRecord.deleteMany({
    where: { productId: '8401a070-df90-4da4-8b63-128a361df400', supermarket: { chain: 'Lidl' } }
  });
  await prisma.priceRecord.deleteMany({
    where: { productId: '900cefa5-ee7a-406a-a55d-cc2b0b1d3d63', supermarket: { chain: 'Lidl' } }
  });

  // Chocolate Valor 250g vs Lidl 100g
  await prisma.priceRecord.deleteMany({
    where: { productId: '7cfa374f-c4ff-41ff-80c7-db0349692488', supermarket: { chain: 'Lidl' } }
  });

  // Tortitas arroz Bicentury vs Lidl
  await prisma.priceRecord.deleteMany({
    where: { productId: '8556a310-752d-45db-9e7d-cb8a9d18fa79', supermarket: { chain: 'Lidl' } }
  });

  // Cápsulas café Bellarom vs Dia
  await prisma.priceRecord.deleteMany({
    where: { productId: '9b454425-76c5-4e54-b074-72966b0257d0', supermarket: { chain: 'Dia' } }
  });

  console.log('✓ All 32 targeted anomalies cleaned!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
