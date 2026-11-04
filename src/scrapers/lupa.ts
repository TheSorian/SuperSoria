import * as cheerio from 'cheerio';
import { ISupermarketScraper, ScrapedProduct } from './types.js';

export class LupaScraper implements ISupermarketScraper {
  name = 'Lupa Supermercados';
  supermarketId = 'lupa-granados'; // Plaza Mariano Granados, Soria
  baseUrl = 'https://www.lupaonline.com';

  private headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9',
  };

  /**
   * Búsqueda en tiempo real en la tienda online oficial de Lupa Supermercados
   */
  async search(query: string): Promise<ScrapedProduct[]> {
    const products: ScrapedProduct[] = [];
    const qClean = query.trim();
    if (!qClean) return products;

    try {
      const url = `https://www.lupaonline.com/santander/catalogsearch/result/?q=${encodeURIComponent(qClean)}`;
      const res = await fetch(url, { headers: this.headers });

      if (!res.ok) {
        throw new Error(`Lupa HTTP ${res.status}`);
      }

      const html = await res.text();
      const $ = cheerio.load(html);

      $('.product-item-info').each((_i, el) => {
        const name = $(el).find('.product-item-link').text().trim();
        const priceRaw = $(el).find('[data-price-type="finalPrice"] .price, .price').first().text().trim();
        const priceNum = parseFloat(priceRaw.replace('€', '').replace(',', '.').trim());
        const img = $(el).find('.product-image-photo').attr('src') || null;
        const link = $(el).find('.product-item-link').attr('href') || null;

        if (name && !isNaN(priceNum) && priceNum > 0) {
          // Extraer marca aproximada si está presente o usar Alteza / Lupa
          const brandMatch = name.match(/^(Alteza|Selex|Crowe|Monder|Pascual|Danone|Gullón|Central Lechera Asturiana|Moreno Sáez|La Hoguera)\b/i);
          const brand = brandMatch ? brandMatch[1] : 'Lupa / Marca';

          products.push({
            externalId: `lupa-${link ? link.split('/').filter(Boolean).pop() : name.slice(0, 20)}`,
            name: name,
            brand: brand,
            format: null,
            price: priceNum,
            referencePrice: null,
            referenceUnit: null,
            originalPrice: null,
            isOffer: false,
            inStock: true,
            imageUrl: img,
            categoryHint: null,
            externalUrl: link || 'https://www.lupaonline.com',
            supermarketId: this.supermarketId,
          });
        }
      });
    } catch (err: any) {
      console.warn('Error en búsqueda en vivo de Lupa:', err.message);
    }

    return products;
  }

  async scrapePopular(_limit = 50): Promise<ScrapedProduct[]> {
    // Búsqueda de los términos más comunes en Lupa para poblar catálogo
    const terms = ['leche', 'aceite', 'pan', 'huevos', 'arroz', 'pasta', 'mantequilla', 'tomate', 'pollo', 'cerveza', 'queso', 'torrezno'];
    const all: ScrapedProduct[] = [];

    for (const t of terms) {
      try {
        const found = await this.search(t);
        all.push(...found.slice(0, 5));
      } catch (e: any) {
        console.warn(`Error en popular Lupa para '${t}':`, e.message);
      }
    }

    return all;
  }
}
