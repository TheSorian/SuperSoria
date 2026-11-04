import { scraperManager } from './index.js';
import prisma from '../db/prisma.js';

const SUPABASE_URL = 'https://gkffvigcnsesbaihycay.supabase.co';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZmZ2aWdjbnNlc2JhaWh5Y2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDY3MzUsImV4cCI6MjA5NTgyMjczNX0.zJ6DZFTxszQHex1UVJjCxBF9BSVmMRpfr_QAeqjpSdo';

interface TargetTable {
  name: string;
  tableName: string;
  supermarketId: string;
  maxRecords: number;
}

const TARGETS: TargetTable[] = [
  { name: 'Lidl Soria', tableName: 'lidl_products', supermarketId: 'lidl-valladolid', maxRecords: 1500 },
  { name: 'Dia Soria', tableName: 'dia_products', supermarketId: 'dia-aguirre', maxRecords: 2000 },
  { name: 'Alcampo Soria / Camaretas', tableName: 'alcampo_products', supermarketId: 'alcampo-camaretas', maxRecords: 2500 },
  { name: 'Mercadona Soria', tableName: 'mercadona_products', supermarketId: 'mercadona-saavedra', maxRecords: 3000 },
];

async function importTablePaginated(target: TargetTable) {
  const PAGE_SIZE = 500;
  let offset = 0;
  let totalSaved = 0;

  console.log(`\n📦 Iniciando importación masiva para ${target.name} (${target.tableName})...`);

  while (offset < target.maxRecords) {
    const limit = Math.min(PAGE_SIZE, target.maxRecords - offset);
    const url = `${SUPABASE_URL}/rest/v1/${target.tableName}?select=*&unit_price=not.is.null&limit=${limit}&offset=${offset}&order=id.asc`;

    try {
      const res = await fetch(url, {
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${ANON_KEY}`,
        },
      });

      if (!res.ok) {
        console.warn(`Error en lote offset=${offset}: HTTP ${res.status}`);
        break;
      }

      const rows: any[] = await res.json();
      if (!rows || rows.length === 0) break;

      const mapped = rows
        .map((row) => {
          const price = typeof row.unit_price === 'number' ? row.unit_price : parseFloat(row.unit_price);
          if (!price || isNaN(price)) return null;

          const name = row.display_name || row.name;
          if (!name) return null;

          const original = typeof row.prev_unit_price === 'number' ? row.prev_unit_price : null;
          const isOffer = (original !== null && original > price) || !!row.promo_price || !!row.is_lidl_plus_offer;

          return {
            externalId: `${target.tableName}-${row.id || row.retailer_product_id}`,
            name: name,
            brand: row.brand || target.name,
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
                : `https://${target.name.toLowerCase()}.es${row.raw.url}`
              : null,
            supermarketId: target.supermarketId,
          };
        })
        .filter(Boolean);

      const saved = await scraperManager.saveScrapedProducts(mapped as any);
      totalSaved += saved;
      console.log(`  ↪ Guardados ${saved} productos (Offset: ${offset}, Total acumulado: ${totalSaved})`);

      offset += rows.length;
      if (rows.length < limit) break;
    } catch (err: any) {
      console.error(`Error importando ${target.name}:`, err.message);
      break;
    }
  }

  console.log(`✅ ${target.name} completado: ${totalSaved} productos volcados.`);
}

async function main() {
  console.log('🚀 INICIANDO IMPORTACIÓN MASIVA DE CATÁLOGOS COMPLETOS PARA SORIA');
  console.log('-----------------------------------------------------------------');

  for (const target of TARGETS) {
    await importTablePaginated(target);
  }

  // Actualizar también Lupa y E.Leclerc
  console.log('\n📦 Actualizando catálogo completo de Lupa y E.Leclerc Soria...');
  await scraperManager.runScraper('lupa-granados', 100);
  await scraperManager.runScraper('eleclerc-las-casas', 100);

  const [totalProducts, totalPrices] = await Promise.all([
    prisma.product.count(),
    prisma.priceRecord.count(),
  ]);

  console.log('\n🎉 ¡IMPORTACIÓN MASIVA COMPLETADA CON ÉXITO!');
  console.log(`📊 Total en Base de Datos de Soria: ${totalProducts} productos | ${totalPrices} precios.`);
  await prisma.$disconnect();
}

main().catch(console.error);
