import prisma from '../db/prisma.js';
import { searchLiveFeedsAcrossAllSupermarkets } from '../scrapers/liveSearch.js';

export class ProductService {
  /**
   * Busca productos con filtros opcionales y búsqueda en vivo multi-supermercado
   */
  async searchProducts(params: {
    query?: string;
    categoryId?: string;
    supermarketId?: string;
    limit?: number;
    offset?: number;
    liveSync?: boolean;
  }) {
    const { query, categoryId, supermarketId, limit = 50, offset = 0, liveSync = true } = params;

    // Si el usuario introduce una búsqueda y liveSync está activo,
    // sincronizamos en segundo plano sin bloquear la respuesta instantánea de la base de datos local (35.000+ productos).
    if (liveSync && query && query.trim().length >= 2) {
      searchLiveFeedsAcrossAllSupermarkets(query.trim()).catch((err: any) => {
        console.warn('Background live sync:', err.message);
      });
    }

    const where: any = {};

    if (query && query.trim()) {
      where.OR = [
        { name: { contains: query.trim() } },
        { brand: { contains: query.trim() } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (supermarketId) {
      where.prices = {
        some: {
          supermarketId: supermarketId,
        },
      };
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        take: limit,
        skip: offset,
        include: {
          category: true,
          prices: {
            include: {
              supermarket: true,
            },
            orderBy: {
              price: 'asc',
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      }),
    ]);

    // Calcular para cada producto el precio más bajo, más alto y ahorro
    const enriched = products.map((prod) => {
      const sortedPrices = prod.prices.sort((a, b) => a.price - b.price);
      const minPrice = sortedPrices[0]?.price ?? null;
      const maxPrice = sortedPrices[sortedPrices.length - 1]?.price ?? null;
      const cheapestSupermarket = sortedPrices[0]?.supermarket?.name ?? null;
      const priceDifference = minPrice !== null && maxPrice !== null ? +(maxPrice - minPrice).toFixed(2) : 0;

      return {
        ...prod,
        cheapestPrice: minPrice,
        cheapestSupermarket,
        priceDifference,
        availableInSupermarkets: prod.prices.length,
      };
    });

    return {
      total,
      limit,
      offset,
      products: enriched,
    };
  }

  /**
   * Obtiene la comparativa detallada de precios de un producto en Soria
   */
  async getProductPriceComparison(productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        prices: {
          include: {
            supermarket: true,
          },
          orderBy: {
            price: 'asc',
          },
        },
      },
    });

    if (!product) return null;

    const sortedPrices = product.prices.sort((a, b) => a.price - b.price);
    const minPrice = sortedPrices[0]?.price ?? 0;

    const comparisons = sortedPrices.map((p, idx) => ({
      supermarketId: p.supermarketId,
      supermarketName: p.supermarket.name,
      chain: p.supermarket.chain,
      price: p.price,
      referencePrice: p.referencePrice,
      referenceUnit: p.referenceUnit,
      originalPrice: p.originalPrice,
      isOffer: p.isOffer,
      inStock: p.inStock,
      externalUrl: p.externalUrl,
      isCheapest: idx === 0,
      diffWithCheapest: +(p.price - minPrice).toFixed(2),
      scrapedAt: p.scrapedAt,
    }));

    return {
      product: {
        id: product.id,
        name: product.name,
        brand: product.brand,
        format: product.format,
        imageUrl: product.imageUrl,
        category: product.category,
      },
      comparisons,
      minPrice,
      maxPrice: sortedPrices[sortedPrices.length - 1]?.price ?? 0,
      savingsPotential: +(
        (sortedPrices[sortedPrices.length - 1]?.price ?? 0) - minPrice
      ).toFixed(2),
    };
  }

  async getAllCategories() {
    return prisma.category.findMany({
      orderBy: { aisleOrder: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  }

  async getAllSupermarkets() {
    return prisma.supermarket.findMany({
      orderBy: { chain: 'asc' },
      include: {
        _count: {
          select: { priceRecords: true },
        },
      },
    });
  }
}

export const productService = new ProductService();
