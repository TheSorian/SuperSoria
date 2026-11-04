import prisma from '../db/prisma.js';
import { mapToCategoryId } from './categoryMapper.js';
import { ScrapedProduct } from './types.js';
import { randomUUID } from 'crypto';

export class FastBatchImporter {
  private existingProductMap = new Map<string, string>();
  private existingPriceMap = new Map<string, string>(); // "productId:supermarketId" -> priceRecordId
  private isInitialized = false;

  async init() {
    if (this.isInitialized) return;
    console.log('⚡ Cargando índice en memoria de productos y precios existentes...');
    const t0 = Date.now();

    const [products, prices] = await Promise.all([
      prisma.product.findMany({ select: { id: true, name: true } }),
      prisma.priceRecord.findMany({ select: { id: true, productId: true, supermarketId: true } }),
    ]);

    for (const p of products) {
      this.existingProductMap.set(p.name.trim().toLowerCase(), p.id);
    }

    for (const pr of prices) {
      this.existingPriceMap.set(`${pr.productId}:${pr.supermarketId}`, pr.id);
    }

    this.isInitialized = true;
    console.log(`✅ Índice cargado en ${Date.now() - t0}ms: ${products.length} productos, ${prices.length} precios.`);
  }

  /**
   * Guarda un lote grande de productos en milisegundos usando inserción masiva
   */
  async saveBatch(products: ScrapedProduct[]): Promise<{ saved: number; newProducts: number; newPrices: number }> {
    await this.init();
    if (!products || products.length === 0) return { saved: 0, newProducts: 0, newPrices: 0 };

    const newProductsToCreate: any[] = [];
    const newPricesToCreate: any[] = [];
    const pricesToUpdate: any[] = [];

    for (const p of products) {
      if (!p.name || typeof p.price !== 'number' || isNaN(p.price) || p.price <= 0) continue;

      const normName = p.name.trim().toLowerCase();
      let productId = this.existingProductMap.get(normName);

      if (!productId) {
        productId = randomUUID();
        const categoryId = mapToCategoryId(p.name, p.categoryHint);
        
        newProductsToCreate.push({
          id: productId,
          name: p.name.trim(),
          brand: p.brand || null,
          format: p.format || null,
          imageUrl: p.imageUrl || null,
          categoryId: categoryId,
        });

        this.existingProductMap.set(normName, productId);
      }

      const priceKey = `${productId}:${p.supermarketId}`;
      const existingPriceId = this.existingPriceMap.get(priceKey);

      if (existingPriceId) {
        pricesToUpdate.push({
          id: existingPriceId,
          price: p.price,
          referencePrice: p.referencePrice || null,
          referenceUnit: p.referenceUnit || null,
          originalPrice: p.originalPrice || null,
          isOffer: Boolean(p.isOffer),
          inStock: p.inStock !== false,
          externalUrl: p.externalUrl || null,
        });
      } else {
        const priceId = randomUUID();
        newPricesToCreate.push({
          id: priceId,
          productId: productId,
          supermarketId: p.supermarketId,
          price: p.price,
          referencePrice: p.referencePrice || null,
          referenceUnit: p.referenceUnit || null,
          originalPrice: p.originalPrice || null,
          isOffer: Boolean(p.isOffer),
          inStock: p.inStock !== false,
          externalUrl: p.externalUrl || null,
        });
        this.existingPriceMap.set(priceKey, priceId);
      }
    }

    // Ejecutar transacciones por lotes
    const t0 = Date.now();

    // 1. Inserción masiva de productos nuevos
    if (newProductsToCreate.length > 0) {
      const CHUNK = 500;
      for (let i = 0; i < newProductsToCreate.length; i += CHUNK) {
        const slice = newProductsToCreate.slice(i, i + CHUNK);
        await prisma.product.createMany({ data: slice });
      }
    }

    // 2. Inserción masiva de precios nuevos
    if (newPricesToCreate.length > 0) {
      const CHUNK = 500;
      for (let i = 0; i < newPricesToCreate.length; i += CHUNK) {
        const slice = newPricesToCreate.slice(i, i + CHUNK);
        await prisma.priceRecord.createMany({ data: slice });
      }
    }

    // 3. Actualización de precios existentes (en chunks dentro de una transacción)
    if (pricesToUpdate.length > 0) {
      const CHUNK = 100;
      for (let i = 0; i < pricesToUpdate.length; i += CHUNK) {
        const slice = pricesToUpdate.slice(i, i + CHUNK);
        await prisma.$transaction(
          slice.map((pr) =>
            prisma.priceRecord.update({
              where: { id: pr.id },
              data: {
                price: pr.price,
                referencePrice: pr.referencePrice,
                referenceUnit: pr.referenceUnit,
                originalPrice: pr.originalPrice,
                isOffer: pr.isOffer,
                inStock: pr.inStock,
                externalUrl: pr.externalUrl,
              },
            })
          )
        );
      }
    }

    const elapsed = Date.now() - t0;
    return {
      saved: newProductsToCreate.length + newPricesToCreate.length + pricesToUpdate.length,
      newProducts: newProductsToCreate.length,
      newPrices: newPricesToCreate.length,
    };
  }
}

export const fastBatchImporter = new FastBatchImporter();
