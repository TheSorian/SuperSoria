import prisma from '../src/db/prisma.js';
import { FastBatchImporter } from '../src/scrapers/fastBatchImporter.js';
import { crawlLupaSupermercados } from '../src/scrapers/expandLeclercAndLupa.js';
import { main as crawlELeclercSoria } from './scrape_full_eleclerc_soria_fn.js';
import { syncSisterStores } from './sync_sister_stores_fn.js';
import { syncLocalSpecialties } from './sync_local_specialties_fn.js';
import { fixCategories } from './fix_categories_fn.js';
import { exportRelease } from './export_release_fn.js';

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

async function syncFeeds(importer: FastBatchImporter) {
  console.log('\n============================================================');
  console.log('📥 1. SINCRONIZANDO FEEDS DE DIA, LIDL, ALCAMPO Y MERCADONA');
  console.log('============================================================');

  const PAGE_SIZE = 1000;

  for (const feed of FEEDS) {
    let offset = 0;
    let totalSaved = 0;

    console.log(`\n⏳ Sincronizando catálogo de: ${feed.name}...`);

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
          console.warn(`[${feed.name}] Fin de descarga o HTTP ${res.status} en offset ${offset}`);
          break;
        }

        const rows: any[] = await res.json();
        if (!rows || rows.length === 0) break;

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

        await importer.saveBatch(mapped as any);
        totalSaved += mapped.length;
        offset += rows.length;

        if (rows.length < PAGE_SIZE) break;
      } catch (err: any) {
        console.warn(`Aviso en ${feed.name}:`, err.message);
        break;
      }
    }

    console.log(`✅ ${feed.name}: ${totalSaved} registros procesados.`);
  }
}

async function runDailySyncAll() {
  const t0 = Date.now();
  console.log('🌾 ==============================================================');
  console.log('🌾 SUPERSORIA - ACTUALIZACIÓN DIARIA DE TODOS LOS SUPERMERCADOS');
  console.log('🌾 Soria Capital & Provincia (Mercadona, Dia, Alcampo, Leclerc, Lupa, Lidl)');
  console.log('🌾 ==============================================================\n');

  const importer = new FastBatchImporter();
  await importer.init();

  // 1. Feeds nacionales (Dia, Lidl, Alcampo, Mercadona)
  try {
    await syncFeeds(importer);
  } catch (err: any) {
    console.error('Error en sincronización de feeds:', err.message);
  }

  // 2. Lupa Supermercados Soria (Plaza Mariano Granados & Almazán)
  try {
    console.log('\n============================================================');
    console.log('🐺 2. RASTREANDO LUPA SUPERMERCADOS (Plaza Mariano Granados)');
    console.log('============================================================');
    await crawlLupaSupermercados(importer);
  } catch (err: any) {
    console.error('Error en rastreo de Lupa:', err.message);
  }

  // 3. E.Leclerc Soria (Polígono Las Casas y Mariano Vicén)
  try {
    console.log('\n============================================================');
    console.log('🏢 3. RASTREANDO HIPERMERCADO E.LECLERC SORIA');
    console.log('============================================================');
    await crawlELeclercSoria(importer);
  } catch (err: any) {
    console.error('Error en rastreo de E.Leclerc:', err.message);
  }

  // 4. Especialidades y productos de Soria (Torreznos, Cañada Real, etc.)
  try {
    console.log('\n============================================================');
    console.log('🧈 4. SINCRONIZANDO ESPECIALIDADES DE SORIA Y CAÑADA REAL');
    console.log('============================================================');
    await syncLocalSpecialties();
  } catch (err: any) {
    console.error('Error en especialidades de Soria:', err.message);
  }

  // 5. Sincronizar sucursales hermanas en Soria
  try {
    console.log('\n============================================================');
    console.log('🔄 5. SINCRONIZANDO SUCURSALES DE SORIA (Palomar, Valladolid, Express)');
    console.log('============================================================');
    await syncSisterStores();
  } catch (err: any) {
    console.error('Error en sincronización de sucursales:', err.message);
  }

  // 6. Recategorización semántica (Hogar / Limpieza y Cuidado Personal)
  try {
    console.log('\n============================================================');
    console.log('🗂️ 6. AUDITORÍA DE CATEGORÍAS (Limpieza y Cuidado Personal)');
    console.log('============================================================');
    await fixCategories();
  } catch (err: any) {
    console.error('Error en recategorización:', err.message);
  }

  // 7. Exportación del paquete comprimido y metadatos para release
  try {
    console.log('\n============================================================');
    console.log('📦 7. EXPORTANDO PAQUETE DE BASE DE DATOS Y METADATOS');
    console.log('============================================================');
    await exportRelease();
  } catch (err: any) {
    console.error('Error en exportRelease:', err.message);
  }

  const durationMin = ((Date.now() - t0) / 1000 / 60).toFixed(1);
  console.log('\n=============================================================');
  console.log(`🎉 ¡ACTUALIZACIÓN DIARIA COMPLETA FINALIZADA EN ${durationMin} MINUTOS!`);
  console.log('=============================================================\n');

  await prisma.$disconnect();
}

runDailySyncAll().catch((e) => {
  console.error('Fallo crítico en actualización diaria:', e);
  process.exit(1);
});
