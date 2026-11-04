import { fastBatchImporter } from './fastBatchImporter.js';
import prisma from '../db/prisma.js';

const SUPABASE_URL = 'https://gkffvigcnsesbaihycay.supabase.co';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZmZ2aWdjbnNlc2JhaWh5Y2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDY3MzUsImV4cCI6MjA5NTgyMjczNX0.zJ6DZFTxszQHex1UVJjCxBF9BSVmMRpfr_QAeqjpSdo';

interface TargetFeed {
  name: string;
  tableName: string;
  supermarketId: string;
}

const FEEDS: TargetFeed[] = [
  { name: 'Lidl Soria', tableName: 'lidl_products', supermarketId: 'lidl-valladolid' },
  { name: 'Dia Soria', tableName: 'dia_products', supermarketId: 'dia-aguirre' },
  { name: 'Mercadona Soria', tableName: 'mercadona_products', supermarketId: 'mercadona-saavedra' },
  { name: 'Alcampo Soria / Camaretas', tableName: 'alcampo_products', supermarketId: 'alcampo-camaretas' },
];

async function importFeedEntirely(feed: TargetFeed) {
  const PAGE_SIZE = 1000;
  let offset = 0;
  let totalSaved = 0;
  let newProductsCount = 0;
  let newPricesCount = 0;

  console.log(`\n============================================================`);
  console.log(`📥 DESCARGANDO CATÁLOGO COMPLETO DE: ${feed.name.toUpperCase()}`);
  console.log(`============================================================`);

  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/${feed.tableName}?select=*&unit_price=not.is.null&limit=${PAGE_SIZE}&offset=${offset}&order=id.asc`;

    try {
      const res = await fetch(url, {
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${ANON_KEY}`,
        },
      });

      if (!res.ok) {
        console.warn(`[${feed.name}] Fin de descarga o error HTTP ${res.status} en offset ${offset}`);
        break;
      }

      const rows: any[] = await res.json();
      if (!rows || rows.length === 0) {
        console.log(`[${feed.name}] No hay más registros en offset ${offset}. ¡Descarga finalizada!`);
        break;
      }

      const mapped = rows
        .map((row) => {
          const price = typeof row.unit_price === 'number' ? row.unit_price : parseFloat(row.unit_price);
          if (!price || isNaN(price) || price <= 0) return null;

          const name = row.display_name || row.name;
          if (!name) return null;

          const original = typeof row.prev_unit_price === 'number' ? row.prev_unit_price : null;
          const isOffer = (original !== null && original > price) || !!row.promo_price || !!row.is_lidl_plus_offer;

          return {
            externalId: `${feed.tableName}-${row.id || row.retailer_product_id}`,
            name: name,
            brand: row.brand || feed.name,
            format: row.packaging || row.price_format || null,
            price: price,
            referencePrice: typeof row.price_per_unit === 'number' ? row.price_per_unit : null,
            referenceUnit: row.price_per_unit_unit || null,
            originalPrice: original,
            isOffer: isOffer,
            inStock: row.available !== false,
            imageUrl: row.thumbnail || row.illustration_url || null,
            categoryHint: row.category_name || (Array.isArray(row.categoryPath) ? row.categoryPath.join(' > ') : null),
            externalUrl: row.raw?.url
              ? row.raw.url.startsWith('http')
                ? row.raw.url
                : `https://${feed.name.toLowerCase()}.es${row.raw.url}`
              : null,
            supermarketId: feed.supermarketId,
          };
        })
        .filter(Boolean);

      const result = await fastBatchImporter.saveBatch(mapped as any);
      totalSaved += mapped.length;
      newProductsCount += result.newProducts;
      newPricesCount += result.newPrices;

      console.log(
        `  📦 [${feed.name}] Lote procesado: +${mapped.length} items (Total descargados: ${totalSaved} | Nuevos productos: ${newProductsCount})`
      );

      offset += rows.length;
      if (rows.length < PAGE_SIZE) {
        break;
      }
    } catch (err: any) {
      console.error(`Error importando ${feed.name}:`, err.message);
      break;
    }
  }

  console.log(`✅ ${feed.name} COMPLETADO: ${totalSaved} productos volcados.`);
}

async function main() {
  const tStart = Date.now();
  console.log('🚀 INICIANDO DESCARGA COMPLETA DE TODOS LOS PRODUCTOS DE SORIA');
  console.log('-------------------------------------------------------------');

  await fastBatchImporter.init();

  for (const feed of FEEDS) {
    await importFeedEntirely(feed);
  }

  const [totalProducts, totalPrices] = await Promise.all([
    prisma.product.count(),
    prisma.priceRecord.count(),
  ]);

  const elapsedSec = ((Date.now() - tStart) / 1000).toFixed(1);
  console.log('\n=============================================================');
  console.log(`🎉 ¡DESCARGA Y VOLCADO COMPLETO FINALIZADO EN ${elapsedSec}s!`);
  console.log(`📊 TOTAL EN TU BASE DE DATOS LOCAL:`);
  console.log(`   • Productos únicos en Soria:  ${totalProducts}`);
  console.log(`   • Precios reales registrados: ${totalPrices}`);
  console.log('=============================================================');

  await prisma.$disconnect();
}

main().catch(console.error);
