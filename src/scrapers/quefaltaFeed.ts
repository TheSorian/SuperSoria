import { ISupermarketScraper, ScrapedProduct } from './types.js';

const SUPABASE_URL = 'https://gkffvigcnsesbaihycay.supabase.co';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZmZ2aWdjbnNlc2JhaWh5Y2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDY3MzUsImV4cCI6MjA5NTgyMjczNX0.zJ6DZFTxszQHex1UVJjCxBF9BSVmMRpfr_QAeqjpSdo';

export class QueFaltaFeedScraper implements ISupermarketScraper {
  name: string;
  supermarketId: string;
  tableName: string;

  constructor(name: string, supermarketId: string, tableName: string) {
    this.name = name;
    this.supermarketId = supermarketId;
    this.tableName = tableName;
  }

  async search(query: string): Promise<ScrapedProduct[]> {
    const q = encodeURIComponent(`*${query}*`);
    const url = `${SUPABASE_URL}/rest/v1/${this.tableName}?display_name=ilike.${q}&limit=50`;
    return this.fetchAndMap(url);
  }

  async scrapePopular(limit = 300): Promise<ScrapedProduct[]> {
    // Obtenemos un lote representativo ordenado por popularidad o categoría
    const url = `${SUPABASE_URL}/rest/v1/${this.tableName}?select=*&unit_price=not.is.null&limit=${limit}&order=unit_price.asc`;
    return this.fetchAndMap(url);
  }

  private async fetchAndMap(url: string): Promise<ScrapedProduct[]> {
    try {
      const res = await fetch(url, {
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${ANON_KEY}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Error en feed ${this.tableName}: HTTP ${res.status}`);
      }

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
          externalId: `${this.tableName}-${row.id || row.retailer_product_id}`,
          name: name,
          brand: row.brand || this.name,
          format: row.packaging || row.price_format || null,
          price: price,
          referencePrice: typeof row.price_per_unit === 'number' ? row.price_per_unit : null,
          referenceUnit: row.price_per_unit_unit || null,
          originalPrice: original,
          isOffer: isOffer,
          inStock: row.available !== false,
          imageUrl: row.thumbnail || row.illustration_url || null,
          categoryHint: row.category_name || (Array.isArray(row.categoryPath) ? row.categoryPath.join(' > ') : null),
          externalUrl: row.raw?.url ? (row.raw.url.startsWith('http') ? row.raw.url : `https://${this.name.toLowerCase()}.es${row.raw.url}`) : null,
          supermarketId: this.supermarketId,
        });
      }

      return products;
    } catch (err: any) {
      console.error(`Error en QueFaltaFeedScraper (${this.name}):`, err.message);
      return [];
    }
  }
}
