import { ScrapedProduct } from './types.js';
import { scraperManager } from './index.js';

const SUPABASE_URL = 'https://gkffvigcnsesbaihycay.supabase.co';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZmZ2aWdjbnNlc2JhaWh5Y2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDY3MzUsImV4cCI6MjA5NTgyMjczNX0.zJ6DZFTxszQHex1UVJjCxBF9BSVmMRpfr_QAeqjpSdo';

interface FeedConfig {
  supermarketId: string;
  tableName: string;
  name: string;
}

const FEEDS: FeedConfig[] = [
  { supermarketId: 'dia-aguirre', tableName: 'dia_products', name: 'Dia' },
  { supermarketId: 'lidl-valladolid', tableName: 'lidl_products', name: 'Lidl' },
  { supermarketId: 'alcampo-camaretas', tableName: 'alcampo_products', name: 'Alcampo' },
  { supermarketId: 'aldi-soria', tableName: 'aldi_products', name: 'Aldi' },
  { supermarketId: 'mercadona-saavedra', tableName: 'mercadona_products', name: 'Mercadona' },
];

/**
 * Busca en tiempo real en todos los feeds de los supermercados de Soria
 * y guarda automáticamente los resultados nuevos en la base de datos local.
 */
export async function searchLiveFeedsAcrossAllSupermarkets(query: string): Promise<number> {
  const qClean = query.trim();
  if (!qClean || qClean.length < 2) return 0;

  const q = encodeURIComponent(`*${qClean}*`);
  const fetchPromises = FEEDS.map(async (f) => {
    try {
      const url = `${SUPABASE_URL}/rest/v1/${f.tableName}?display_name=ilike.${q}&select=*&limit=30`;
      const res = await fetch(url, {
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${ANON_KEY}`,
        },
      });

      if (!res.ok) return [];

      const rows: any[] = await res.json();
      const products: ScrapedProduct[] = [];

      for (const row of rows) {
        const price = typeof row.unit_price === 'number' ? row.unit_price : parseFloat(row.unit_price);
        if (!price || isNaN(price)) continue;

        const name = row.display_name || row.name;
        if (!name) continue;

        const original = typeof row.prev_unit_price === 'number' ? row.prev_unit_price : null;
        const isOffer = (original !== null && original > price) || !!row.promo_price || !!row.is_lidl_plus_offer;

        products.push({
          externalId: `${f.tableName}-${row.id || row.retailer_product_id}`,
          name: name,
          brand: row.brand || f.name,
          format: row.packaging || row.price_format || null,
          price: price,
          referencePrice: typeof row.price_per_unit === 'number' ? row.price_per_unit : null,
          referenceUnit: row.price_per_unit_unit || null,
          originalPrice: original,
          isOffer: isOffer,
          inStock: row.available !== false,
          imageUrl: row.thumbnail || row.illustration_url || null,
          categoryHint: row.category_name || (Array.isArray(row.categoryPath) ? row.categoryPath.join(' > ') : null),
          externalUrl: row.raw?.url ? (row.raw.url.startsWith('http') ? row.raw.url : `https://${f.name.toLowerCase()}.es${row.raw.url}`) : null,
          supermarketId: f.supermarketId,
        });
      }

      return products;
    } catch (e: any) {
      console.warn(`Error buscando en feed ${f.name}:`, e.message);
      return [];
    }
  });

  const resultsByFeed = await Promise.all(fetchPromises);
  const allFound = resultsByFeed.flat();

  if (allFound.length > 0) {
    return await scraperManager.saveScrapedProducts(allFound);
  }

  return 0;
}
