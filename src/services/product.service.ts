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
          OR: [
            { supermarketId: supermarketId },
            { supermarket: { chain: { equals: supermarketId } } },
          ],
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

    // Enriquecer cada producto con su precio más bajo y supermercado genérico
    const enriched = rawProducts.map((prod) => {
      const sortedPrices = prod.prices.sort((a, b) => a.price - b.price);
      const minPrice = sortedPrices[0]?.price ?? null;
      const maxPrice = sortedPrices[sortedPrices.length - 1]?.price ?? null;
      const cheapestSupermarket = sortedPrices[0]?.supermarket?.chain ?? null;
      const priceDifference = minPrice !== null && maxPrice !== null ? +(maxPrice - minPrice).toFixed(2) : 0;

      // Precios unificados por cadena genérica (Mercadona, Dia, Lidl, Alcampo, E.Leclerc, Lupa)
      const chainPricesMap = new Map<string, { chain: string; price: number; isOffer: boolean }>();
      for (const p of sortedPrices) {
        const ch = p.supermarket.chain;
        if (!chainPricesMap.has(ch) || chainPricesMap.get(ch)!.price > p.price) {
          chainPricesMap.set(ch, { chain: ch, price: p.price, isOffer: p.isOffer });
        }
      }

      return {
        ...prod,
        cheapestPrice: minPrice,
        cheapestSupermarket,
        chainPrices: Array.from(chainPricesMap.values()).sort((a, b) => a.price - b.price),
        priceDifference,
        availableInSupermarkets: chainPricesMap.size,
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

    // Agrupar precios por cadena genérica (Mercadona, Dia, Lidl, Alcampo, E.Leclerc, Lupa)
    const chainMap = new Map<string, any>();
    for (const p of sortedPrices) {
      const ch = p.supermarket.chain;
      if (!chainMap.has(ch) || chainMap.get(ch).price > p.price) {
        chainMap.set(ch, {
          supermarketId: p.supermarketId,
          supermarketName: ch,
          chain: ch,
          price: p.price,
          referencePrice: p.referencePrice,
          referenceUnit: p.referenceUnit,
          originalPrice: p.originalPrice,
          isOffer: p.isOffer,
          inStock: p.inStock,
          externalUrl: p.externalUrl,
          scrapedAt: p.scrapedAt,
        });
      }
    }

    const comparisons = Array.from(chainMap.values())
      .sort((a, b) => a.price - b.price)
      .map((c, idx) => ({
        ...c,
        isCheapest: idx === 0,
        diffWithCheapest: +(c.price - minPrice).toFixed(2),
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
    const raw = await prisma.supermarket.findMany({
      orderBy: { chain: 'asc' },
      include: {
        _count: {
          select: { priceRecords: true },
        },
      },
    });

    // Agrupar en los 6 supermercados genéricos de Soria
    const genericChains = [
      {
        id: 'mercadona',
        chain: 'Mercadona',
        name: 'Mercadona',
        icon: '🟢',
        color: '#028a47',
        bgClass: 'bg-emerald-600',
        lightBg: 'bg-emerald-50',
        borderClass: 'border-emerald-200',
        textClass: 'text-emerald-700',
        description: 'Supermercado líder en alimentación, frescos y marcas propias Hacendado y Bosque Verde.',
        website: 'https://tienda.mercadona.es/',
      },
      {
        id: 'dia',
        chain: 'Dia',
        name: 'Dia',
        icon: '🔴',
        color: '#d6140e',
        bgClass: 'bg-red-600',
        lightBg: 'bg-red-50',
        borderClass: 'border-red-200',
        textClass: 'text-red-700',
        description: 'Supermercado de proximidad con ofertas semanales Club Dia y marcas propias.',
        website: 'https://www.dia.es/',
      },
      {
        id: 'alcampo',
        chain: 'Alcampo',
        name: 'Alcampo',
        icon: '🐦',
        color: '#e11414',
        bgClass: 'bg-rose-600',
        lightBg: 'bg-rose-50',
        borderClass: 'border-rose-200',
        textClass: 'text-rose-700',
        description: 'Gran surtido de marcas líderes, gama económica Auchan y productos de Soria.',
        website: 'https://www.compraonline.alcampo.es/',
      },
      {
        id: 'eleclerc',
        chain: 'E.Leclerc',
        name: 'E.Leclerc',
        icon: '🏢',
        color: '#0066b3',
        bgClass: 'bg-indigo-600',
        lightBg: 'bg-indigo-50',
        borderClass: 'border-indigo-200',
        textClass: 'text-indigo-700',
        description: 'Hipermercado con compra online, marcas propias Marque Repère / Eliges y productos locales.',
        website: 'https://soria.e-leclerc.es/',
      },
      {
        id: 'lupa',
        chain: 'Lupa',
        name: 'Lupa',
        icon: '🐺',
        color: '#f59e0b',
        bgClass: 'bg-amber-500',
        lightBg: 'bg-amber-50',
        borderClass: 'border-amber-200',
        textClass: 'text-amber-700',
        description: 'Supermercado con carnicería y frescos tradicionales, charcutería y marca Alteza.',
        website: 'https://www.lupa.com/',
      },
      {
        id: 'lidl',
        chain: 'Lidl',
        name: 'Lidl',
        icon: '🔵',
        color: '#0050aa',
        bgClass: 'bg-blue-600',
        lightBg: 'bg-blue-50',
        borderClass: 'border-blue-200',
        textClass: 'text-blue-700',
        description: 'Precios competitivos, panadería horneada a diario y marcas Milbona y Cien.',
        website: 'https://www.lidl.es/',
      },
    ];

    return genericChains.map((gc) => {
      const branches = raw.filter((s) => s.chain.toLowerCase() === gc.chain.toLowerCase());
      const totalPrices = branches.reduce((sum, b) => sum + (b._count?.priceRecords || 0), 0);
      return {
        ...gc,
        branchCount: branches.length,
        priceRecordsCount: totalPrices,
        sampleBranchId: branches[0]?.id || gc.id,
      };
    });
  }
}

export const productService = new ProductService();
