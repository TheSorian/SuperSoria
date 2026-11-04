import { ISupermarketScraper, ScrapedProduct } from './types.js';

export class MercadonaScraper implements ISupermarketScraper {
  name = 'Mercadona';
  supermarketId = 'mercadona-saavedra';
  postalCode = '42001'; // Código postal de Soria
  baseUrl = 'https://tienda.mercadona.es/api/v1_1';

  async search(query: string): Promise<ScrapedProduct[]> {
    const qLower = query.toLowerCase().trim();
    const all = await this.scrapePopular(6); // Busca en las principales categorías
    return all.filter((p) => p.name.toLowerCase().includes(qLower) || p.brand?.toLowerCase().includes(qLower));
  }

  async scrapeCategories(maxCategories = 10): Promise<ScrapedProduct[]> {
    const products: ScrapedProduct[] = [];

    try {
      const res = await fetch(`${this.baseUrl}/categories/?postal_code=${this.postalCode}`);
      if (!res.ok) {
        throw new Error(`Mercadona categories failed with HTTP ${res.status}`);
      }
      const data = await res.json();
      const topCategories = data.results || [];

      let categoriesProcessed = 0;

      for (const topCat of topCategories) {
        if (categoriesProcessed >= maxCategories) break;
        const subCats = topCat.categories || [];

        for (const sub of subCats) {
          try {
            const subRes = await fetch(`${this.baseUrl}/categories/${sub.id}/?postal_code=${this.postalCode}`);
            if (!subRes.ok) continue;
            const subData = await subRes.json();

            const nested = subData.categories || [];
            for (const n of nested) {
              const prods = n.products || [];
              for (const p of prods) {
                const price = parseFloat(p.price_instructions?.unit_price || '0');
                if (!price || isNaN(price)) continue;

                const refPrice = p.price_instructions?.reference_price
                  ? parseFloat(p.price_instructions.reference_price)
                  : null;

                products.push({
                  externalId: `mercadona-${p.id}`,
                  name: p.display_name,
                  brand: 'Hacendado / Mercadona',
                  format: p.packaging || p.price_instructions?.unit_name || null,
                  price: price,
                  referencePrice: refPrice,
                  referenceUnit: p.price_instructions?.reference_format || 'ud',
                  originalPrice: p.price_instructions?.previous_unit_price
                    ? parseFloat(p.price_instructions.previous_unit_price)
                    : null,
                  isOffer: !!p.price_instructions?.previous_unit_price,
                  inStock: p.status !== 'out_of_stock',
                  imageUrl: p.thumbnail || null,
                  categoryHint: `${topCat.name} > ${sub.name}`,
                  externalUrl: p.share_url || `https://tienda.mercadona.es/product/${p.id}`,
                  supermarketId: this.supermarketId,
                });
              }
            }
          } catch (err: any) {
            console.warn(`Error al consultar subcategoría Mercadona ${sub.id}:`, err.message);
          }
        }
        categoriesProcessed++;
      }
    } catch (err: any) {
      console.error('Error general en MercadonaScraper:', err.message);
    }

    return products;
  }

  async scrapePopular(limit = 6): Promise<ScrapedProduct[]> {
    return this.scrapeCategories(limit);
  }
}
