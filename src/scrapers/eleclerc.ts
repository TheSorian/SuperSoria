import * as cheerio from 'cheerio';
import { ISupermarketScraper, ScrapedProduct } from './types.js';

export class ELeclercScraper implements ISupermarketScraper {
  name = 'E.Leclerc Soria';
  supermarketId = 'eleclerc-las-casas'; // Hipermercado Polígono Las Casas, Soria
  baseUrl = 'https://soria.e-leclerc.es';

  private headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Content-Type': 'application/x-www-form-urlencoded',
    Origin: 'https://soria.e-leclerc.es',
    Referer: 'https://soria.e-leclerc.es/',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9',
  };

  /**
   * Búsqueda en tiempo real en la tienda online oficial de E.Leclerc Soria (https://soria.e-leclerc.es/)
   */
  async search(query: string): Promise<ScrapedProduct[]> {
    const products: ScrapedProduct[] = [];
    const qClean = query.trim();
    if (!qClean || qClean.length < 2) return products;

    try {
      const searchUrl =
        'https://soria.e-leclerc.es/resultados?p_p_id=ProductosFoodPortlet_WAR_comerzziaportletsfood&p_p_lifecycle=1&p_p_state=normal&p_p_mode=view&_ProductosFoodPortlet_WAR_comerzziaportletsfood_accion=buscar&_ProductosFoodPortlet_WAR_comerzziaportletsfood_operacion=consultar';

      const body = new URLSearchParams({
        textoBuscador: qClean,
        filtersBuscador: '',
      });

      const res = await fetch(searchUrl, {
        method: 'POST',
        headers: this.headers,
        body: body.toString(),
        redirect: 'follow',
      });

      if (!res.ok) {
        throw new Error(`E.Leclerc Soria HTTP ${res.status}`);
      }

      const html = await res.text();
      const $ = cheerio.load(html);

      $('.articulo').each((_i, el) => {
        const product = this.parseArticuloElement($, el);
        if (product) {
          products.push(product);
        }
      });
    } catch (err: any) {
      console.warn('Error en búsqueda en vivo de E.Leclerc Soria:', err.message);
    }

    return products;
  }

  /**
   * Extrae los productos de la sección oficial de "Productos Sorianos" de E.Leclerc Soria
   */
  async scrapeSorianos(): Promise<ScrapedProduct[]> {
    const products: ScrapedProduct[] = [];
    try {
      const url = 'https://soria.e-leclerc.es/sorianos';
      const res = await fetch(url, { headers: this.headers });
      if (!res.ok) return products;

      const html = await res.text();
      const $ = cheerio.load(html);

      $('.articulo').each((_i, el) => {
        const product = this.parseArticuloElement($, el, 'Productos de Soria > Alianzas Locales');
        if (product) {
          products.push(product);
        }
      });
    } catch (err: any) {
      console.warn('Error al extraer productos sorianos de E.Leclerc:', err.message);
    }
    return products;
  }

  /**
   * Carga los productos más populares y la sección soriana de E.Leclerc Soria
   */
  async scrapePopular(limit = 60): Promise<ScrapedProduct[]> {
    const all: ScrapedProduct[] = [];
    const seenIds = new Set<string>();

    // 1. Primero productos sorianos oficiales
    const sorianos = await this.scrapeSorianos();
    for (const p of sorianos) {
      if (!seenIds.has(p.externalId)) {
        seenIds.add(p.externalId);
        all.push(p);
      }
    }

    // 2. Búsqueda de términos básicos de la cesta de la compra
    const terms = [
      'leche',
      'aceite de oliva',
      'pan',
      'huevos',
      'torrezno',
      'mantequilla',
      'queso',
      'yogur',
      'arroz',
      'pasta',
      'pollo',
      'tomate',
      'cerveza',
      'atun',
      'cafe',
    ];

    for (const term of terms) {
      if (all.length >= limit) break;
      try {
        const found = await this.search(term);
        for (const p of found.slice(0, 5)) {
          if (!seenIds.has(p.externalId) && p.price > 0) {
            seenIds.add(p.externalId);
            all.push(p);
          }
        }
      } catch (e: any) {
        console.warn(`Error buscando popular E.Leclerc '${term}':`, e.message);
      }
    }

    return all;
  }

  /**
   * Parsea un nodo .articulo de E.Leclerc Soria
   */
  private parseArticuloElement($: cheerio.CheerioAPI, el: any, defaultCategory?: string): ScrapedProduct | null {
    const rawName = $(el).find('.nombre a').text().trim();
    if (!rawName) return null;

    const brand = $(el).find('.marca').text().trim() || null;
    const rawPrice = $(el).find('.precio span').text().trim();
    const priceMatch = rawPrice.replace(',', '.').match(/(\d+\.?\d*)/);
    const price = priceMatch ? parseFloat(priceMatch[1]) : null;

    // Si no tiene precio visible en la ficha, descartar
    if (!price || isNaN(price) || price <= 0) return null;

    // Precio de referencia y unidad (ej: "19,71 €/Litro" o "4,60 €/Kilo")
    const refText = $(el).find('.texto-porKilo').text().trim();
    let referencePrice: number | null = null;
    let referenceUnit: string | null = null;

    if (refText) {
      const refMatch = refText.replace(',', '.').match(/(\d+\.?\d*)\s*€\/?(\w+)?/i);
      if (refMatch) {
        referencePrice = parseFloat(refMatch[1]);
        referenceUnit = refMatch[2] || null;
      }
    }

    // Imagen
    let img = $(el).find('img').attr('src') || null;
    if (img && !img.startsWith('http')) {
      img = `https://soria.e-leclerc.es${img}`;
    }

    // Enlace
    let link = $(el).find('.nombre a').attr('href') || null;
    if (link && !link.startsWith('http')) {
      link = `https://soria.e-leclerc.es${link}`;
    }

    // ID externo
    const idAttr = $(el).attr('id') || '';
    const codeMatch = idAttr.match(/_articulo_(\w+)/);
    const externalId = codeMatch ? `eleclerc-${codeMatch[1]}` : `eleclerc-${rawName.slice(0, 25).replace(/\s+/g, '_')}`;

    // Oferta
    const tagOfertas = $(el).find('.wrapper-tag-ofertas, .wrap-tagger').text().trim();
    const isOffer = tagOfertas.length > 0;

    return {
      externalId,
      name: rawName,
      brand: brand || 'E.Leclerc / Marca',
      format: null,
      price: price,
      referencePrice: referencePrice,
      referenceUnit: referenceUnit,
      originalPrice: null,
      isOffer: isOffer,
      inStock: true,
      imageUrl: img,
      categoryHint: defaultCategory || null,
      externalUrl: link || 'https://soria.e-leclerc.es',
      supermarketId: this.supermarketId,
    };
  }
}
