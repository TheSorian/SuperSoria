import prisma from '../db/prisma.js';
import { MercadonaScraper } from './mercadona.js';
import { DiaScraper } from './dia.js';
import { ELeclercScraper } from './eleclerc.js';
import { LupaScraper } from './lupa.js';
import { QueFaltaFeedScraper } from './quefaltaFeed.js';
import { mapToCategoryId } from './categoryMapper.js';
import { ISupermarketScraper, ScrapedProduct, ScraperResult } from './types.js';

export class ScraperManager {
  private scrapers: Map<string, ISupermarketScraper> = new Map();

  constructor() {
    // 1. Mercadona Soria
    this.registerScraper(new MercadonaScraper());

    // 2. Dia Soria (Alimentado con el feed completo de Dia)
    this.registerScraper(new QueFaltaFeedScraper('Dia', 'dia-aguirre', 'dia_products'));

    // 3. Lidl Soria (Alimentado con el feed de Lidl)
    this.registerScraper(new QueFaltaFeedScraper('Lidl', 'lidl-valladolid', 'lidl_products'));

    // 4. Alcampo Soria / Camaretas (Alimentado con el feed de Alcampo)
    this.registerScraper(new QueFaltaFeedScraper('Alcampo', 'alcampo-camaretas', 'alcampo_products'));

    // 5. Lupa Supermercados Soria (Plaza Mariano Granados y provincia)
    this.registerScraper(new LupaScraper());

    // 6. Hipermercado E.Leclerc Soria (Polígono Las Casas y Mariano Vicén)
    this.registerScraper(new ELeclercScraper());
  }

  registerScraper(scraper: ISupermarketScraper) {
    this.scrapers.set(scraper.supermarketId, scraper);
  }

  getScraper(supermarketId: string): ISupermarketScraper | undefined {
    return this.scrapers.get(supermarketId);
  }

  getAllScrapers(): ISupermarketScraper[] {
    return Array.from(this.scrapers.values());
  }

  /**
   * Persiste un lote de productos y sus precios en la base de datos
   */
  async saveScrapedProducts(products: ScrapedProduct[]): Promise<number> {
    let savedCount = 0;

    for (const p of products) {
      try {
        const categoryId = mapToCategoryId(p.name, p.categoryHint);

        // Buscar producto similar existente o crearlo
        let product = await prisma.product.findFirst({
          where: {
            OR: [
              { name: { equals: p.name } },
              { name: { contains: p.name.slice(0, 30) } },
            ],
          },
        });

        if (!product) {
          product = await prisma.product.create({
            data: {
              name: p.name,
              brand: p.brand,
              format: p.format,
              imageUrl: p.imageUrl,
              categoryId: categoryId,
            },
          });
        } else if (p.imageUrl && !product.imageUrl) {
          await prisma.product.update({
            where: { id: product.id },
            data: { imageUrl: p.imageUrl },
          });
        }

        // Crear o actualizar registro de precio para el supermercado
        const existingPrice = await prisma.priceRecord.findFirst({
          where: {
            productId: product.id,
            supermarketId: p.supermarketId,
          },
        });

        if (existingPrice) {
          await prisma.priceRecord.update({
            where: { id: existingPrice.id },
            data: {
              price: p.price,
              referencePrice: p.referencePrice,
              referenceUnit: p.referenceUnit,
              originalPrice: p.originalPrice,
              isOffer: p.isOffer,
              inStock: p.inStock,
              externalUrl: p.externalUrl,
              scrapedAt: new Date(),
            },
          });
        } else {
          await prisma.priceRecord.create({
            data: {
              productId: product.id,
              supermarketId: p.supermarketId,
              price: p.price,
              referencePrice: p.referencePrice,
              referenceUnit: p.referenceUnit,
              originalPrice: p.originalPrice,
              isOffer: p.isOffer,
              inStock: p.inStock,
              externalUrl: p.externalUrl,
            },
          });
        }

        savedCount++;
      } catch (err: any) {
        console.warn(`Error guardando producto ${p.name}:`, err.message);
      }
    }

    return savedCount;
  }

  /**
   * Ejecuta el scraper de un supermercado concreto
   */
  async runScraper(supermarketId: string, limit = 200): Promise<ScraperResult> {
    const startTime = Date.now();
    const scraper = this.scrapers.get(supermarketId);

    if (!scraper) {
      throw new Error(`Scraper no encontrado para supermarketId: ${supermarketId}`);
    }

    const log = await prisma.scrapeLog.create({
      data: {
        supermarket: scraper.name,
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    const errors: string[] = [];
    let productsFound = 0;
    let productsSaved = 0;

    try {
      console.log(`[Scraper] Iniciando captura para ${scraper.name} en Soria...`);
      const products = await scraper.scrapePopular(limit);
      productsFound = products.length;

      productsSaved = await this.saveScrapedProducts(products);

      await prisma.scrapeLog.update({
        where: { id: log.id },
        data: {
          status: 'SUCCESS',
          itemsFound: productsFound,
          itemsUpdated: productsSaved,
          finishedAt: new Date(),
          message: `Captura completada con éxito. ${productsSaved} precios actualizados.`,
        },
      });

      console.log(`[Scraper] Finalizado ${scraper.name}: ${productsSaved}/${productsFound} productos guardados.`);
    } catch (err: any) {
      errors.push(err.message);
      await prisma.scrapeLog.update({
        where: { id: log.id },
        data: {
          status: 'ERROR',
          message: err.message,
          finishedAt: new Date(),
        },
      });
      console.error(`[Scraper] Error en ${scraper.name}:`, err.message);
    }

    return {
      supermarket: scraper.name,
      productsFound,
      productsSaved,
      errors,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Ejecuta todos los scrapers registrados
   */
  async runAll(limitPerSuper = 200): Promise<ScraperResult[]> {
    const results: ScraperResult[] = [];
    for (const scraper of this.scrapers.values()) {
      const res = await this.runScraper(scraper.supermarketId, limitPerSuper);
      results.push(res);
    }
    return results;
  }
}

export const scraperManager = new ScraperManager();
