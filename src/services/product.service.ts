import prisma from '../db/prisma.js';
import { searchLiveFeedsAcrossAllSupermarkets } from '../scrapers/liveSearch.js';

/**
 * Expande una palabra a sus variantes en español:
 * 1. Singular y plural (huevos/huevo, galleta/galletas, patatas/patata)
 * 2. Sinónimos habituales (fresca/pasteurizada, yogurt/yogur, torrezno/panceta)
 * 3. Acentos y tildes (jamon/jamón, cafe/café, platano/plátano, atun/atún, limon/limón)
 */
export function getWordVariants(word: string): string[] {
  const norm = word.toLowerCase().trim();
  if (!norm) return [];

  const variants = new Set<string>();

  // 1. Singular y plural en español
  const stems = new Set<string>([norm]);
  if (norm.endsWith('es') && norm.length > 4) {
    stems.add(norm.slice(0, -2));
    stems.add(norm.slice(0, -1));
  } else if (norm.endsWith('s') && norm.length > 3) {
    stems.add(norm.slice(0, -1));
  } else if (norm.length > 3) {
    stems.add(norm + 's');
    stems.add(norm + 'es');
  }

  // Sinónimos comunes en compras españolas
  const synonyms: Record<string, string[]> = {
    fresca: ['fresca', 'pasteurizada', 'fresco'],
    fresco: ['fresco', 'fresca', 'pasteurizada'],
    yogurt: ['yogurt', 'yogur', 'yogures'],
    yogur: ['yogur', 'yogurt', 'yogures'],
    platano: ['platano', 'plátano', 'banana'],
    plátano: ['platano', 'plátano', 'banana'],
    torrezno: ['torrezno', 'torreznos', 'panceta'],
    torreznos: ['torrezno', 'torreznos', 'panceta'],
    oliva: ['oliva', 'olivas'],
    atun: ['atun', 'atún', 'bonito'],
    atún: ['atun', 'atún', 'bonito'],
  };

  for (const s of Array.from(stems)) {
    variants.add(s);
    if (synonyms[s]) {
      synonyms[s].forEach((syn) => variants.add(syn));
    }
  }

  // 2. Expandir acentos y tildes
  const charMap: Record<string, string[]> = {
    a: ['a', 'á'],
    e: ['e', 'é'],
    i: ['i', 'í'],
    o: ['o', 'ó'],
    u: ['u', 'ú', 'ü'],
    n: ['n', 'ñ'],
  };

  const finalVariants = new Set<string>();
  for (const v of variants) {
    finalVariants.add(v);
    const plain = v.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    finalVariants.add(plain);
    for (let i = 0; i < plain.length; i++) {
      const ch = plain[i];
      if (charMap[ch]) {
        for (const alt of charMap[ch]) {
          finalVariants.add(plain.slice(0, i) + alt + plain.slice(i + 1));
        }
      }
    }
  }

  return Array.from(finalVariants);
}

/**
 * Puntuación inteligente de relevancia para posicionar los alimentos básicos y marcas deseadas arriba
 */
function calculateRelevance(product: any, queryTokens: string[], originalQuery: string): number {
  let score = 0;
  const nameLower = product.name.toLowerCase();
  const brandLower = (product.brand || '').toLowerCase();
  const qLower = originalQuery.toLowerCase();
  const qPlain = qLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const namePlain = nameLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 1. Si el nombre empieza exactamente con la búsqueda (ej: "Leche entera...", "Aceite de oliva...")
  if (namePlain.startsWith(qPlain)) {
    score += 160;
  } else if (namePlain.includes(' ' + qPlain) || namePlain.includes(qPlain)) {
    score += 90;
  }

  // 2. Si la marca coincide directamente
  if (brandLower.includes(qPlain)) {
    score += 80;
  }

  // 3. Tokens individuales que coincidan como palabra completa
  for (const token of queryTokens) {
    const tPlain = token.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const regex = new RegExp(`\\b${tPlain}\\b`, 'i');
    if (regex.test(namePlain)) {
      score += 45;
    }
  }

  // 4. Si tiene imagen y está en más supermercados (producto básico común)
  if (product.imageUrl) score += 20;
  score += (product.prices?.length || 0) * 15;

  // 5. Penalizar nombres que empiecen por dígitos o símbolos raros cuando no se buscaron números
  if (/^[0-9%#$]/.test(product.name) && !/\d/.test(originalQuery)) {
    score -= 40;
  }

  // 6. Penalización si es un producto derivado o accesorio donde la palabra es secundaria
  // Ej: busca "leche" y sale helado con sabor a dulce de leche o bombones
  if (
    qPlain === 'leche' &&
    (namePlain.includes('helado') ||
      namePlain.includes('chocolate') ||
      namePlain.includes('bombones') ||
      namePlain.includes('turron') ||
      namePlain.includes('tarrina'))
  ) {
    score -= 80;
  }

  return score;
}

export class ProductService {
  /**
   * Busca productos con filtros opcionales y búsqueda inteligente multi-supermercado
   */
  async searchProducts(params: {
    query?: string;
    brand?: string;
    categoryId?: string;
    supermarketId?: string;
    limit?: number;
    offset?: number;
    liveSync?: boolean;
  }) {
    const { query, brand, categoryId, supermarketId, limit = 50, offset = 0, liveSync = true } = params;

    const where: any = {};
    const hasQuery = Boolean(query && query.trim());
    const queryTokens = hasQuery ? query!.trim().split(/\s+/).filter(Boolean) : [];

    // Búsqueda inteligente multi-palabra con expansión de sinónimos, singular/plural y acentos
    if (hasQuery) {
      where.AND = queryTokens.map((token) => {
        const variants = getWordVariants(token);
        return {
          OR: variants.flatMap((v) => [
            { name: { contains: v } },
            { brand: { contains: v } },
          ]),
        };
      });
    }

    if (brand && brand.trim()) {
      where.brand = { contains: brand.trim() };
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

    let total = await prisma.product.count({ where });

    // Si hay muy pocos resultados (< 3) y liveSync está activo, ejecutamos sincronización en vivo
    if (liveSync && hasQuery && total < 3) {
      try {
        await Promise.race([
          searchLiveFeedsAcrossAllSupermarkets(query!.trim()),
          new Promise((resolve) => setTimeout(resolve, 3500)),
        ]);
        total = await prisma.product.count({ where });
      } catch (err: any) {
        console.warn('Live sync fallback:', err.message);
      }
    } else if (liveSync && hasQuery) {
      // Si ya hay resultados suficientes, sincronizamos en segundo plano sin esperar
      searchLiveFeedsAcrossAllSupermarkets(query!.trim()).catch((err: any) => {
        console.warn('Background live sync:', err.message);
      });
    }

    // Ventana de búsqueda para ordenar inteligentemente
    const fetchLimit = hasQuery ? Math.max(limit * 3, 150) : Math.max(limit * 2, 80);

    const rawProducts = await prisma.product.findMany({
      where,
      take: fetchLimit,
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

    // Enriquecer cada producto con su precio más bajo y supermercado
    const enriched = rawProducts.map((prod) => {
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

    // Ordenación por relevancia
    let sortedProducts: typeof enriched = [];

    if (hasQuery) {
      sortedProducts = enriched
        .map((p) => ({ p, score: calculateRelevance(p, queryTokens, query!.trim()) }))
        .sort((a, b) => b.score - a.score)
        .map((x) => x.p);
    } else {
      // Si no hay búsqueda, priorizar alimentos básicos con foto y presencia en supermercados
      sortedProducts = enriched
        .map((p) => {
          let score = 0;
          if (p.imageUrl) score += 100;
          if (!/^[0-9%#$]/.test(p.name)) score += 50;
          score += p.availableInSupermarkets * 15;
          return { p, score };
        })
        .sort((a, b) => b.score - a.score)
        .map((x) => x.p);
    }

    const pagedProducts = sortedProducts.slice(offset, offset + limit);

    return {
      total,
      limit,
      offset,
      products: pagedProducts,
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
