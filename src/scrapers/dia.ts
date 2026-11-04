import { ISupermarketScraper, ScrapedProduct } from './types.js';

export class DiaScraper implements ISupermarketScraper {
  name = 'Dia';
  supermarketId = 'dia-aguirre'; // Tienda céntrica de Soria
  postalCode = '42001';
  baseUrl = 'https://www.dia.es/api/v1/search-back/search';

  async search(query: string, page = 1): Promise<ScrapedProduct[]> {
    const products: ScrapedProduct[] = [];
    try {
      const url = `${this.baseUrl}?q=${encodeURIComponent(query)}&page=${page}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/json',
          Cookie: `postal_code=${this.postalCode};`,
        },
      });

      if (!res.ok) {
        throw new Error(`Dia API failed with status ${res.status}`);
      }

      const data = await res.json();
      const items = data.search_items || [];

      for (const item of items) {
        const price = item.prices?.price || 0;
        if (!price) continue;

        const refPrice = item.prices?.price_per_unit ?? null;
        const refUnit = item.prices?.measure_unit || null;
        const original = item.prices?.strikethrough_price && item.prices.strikethrough_price > price
          ? item.prices.strikethrough_price
          : null;

        const img = item.image
          ? item.image.startsWith('http')
            ? item.image
            : `https://www.dia.es${item.image}`
          : null;

        const extUrl = item.url
          ? item.url.startsWith('http')
            ? item.url
            : `https://www.dia.es${item.url}`
          : null;

        products.push({
          externalId: `dia-${item.object_id || item.sku_id}`,
          name: item.display_name,
          brand: item.brand || 'Dia',
          format: null,
          price: price,
          referencePrice: refPrice,
          referenceUnit: refUnit,
          originalPrice: original,
          isOffer: !!item.prices?.is_promo_price || (original !== null && original > price),
          inStock: (item.units_in_stock ?? 1) > 0,
          imageUrl: img,
          categoryHint: `${item.l1_category_description || ''} > ${item.l2_category_description || ''}`,
          externalUrl: extUrl,
          supermarketId: this.supermarketId,
        });
      }
    } catch (err: any) {
      console.error('Error en DiaScraper:', err.message);
    }

    return products;
  }

  async scrapePopular(limit = 10): Promise<ScrapedProduct[]> {
    const commonQueries = [
      'leche',
      'huevos',
      'pan',
      'aceite oliva',
      'arroz',
      'pasta',
      'torreznos',
      'mantequilla',
      'pollo',
      'tomate',
      'manzanas',
      'patatas',
      'detergente',
      'cerveza',
      'yogur',
    ];

    const allProducts: ScrapedProduct[] = [];
    const queries = commonQueries.slice(0, limit);

    for (const q of queries) {
      try {
        const found = await this.search(q, 1);
        allProducts.push(...found.slice(0, 5)); // 5 mejores resultados por término
      } catch (e: any) {
        console.warn(`Dia query error for '${q}':`, e.message);
      }
    }

    return allProducts;
  }
}
