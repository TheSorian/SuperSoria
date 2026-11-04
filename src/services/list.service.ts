import prisma from '../db/prisma.js';

export class ListService {
  /**
   * Obtiene o crea una lista por shareCode o ID, agrupando productos por pasillo
   */
  async getListByCode(shareCode: string) {
    let list = await prisma.shoppingList.findFirst({
      where: {
        OR: [{ shareCode }, { id: shareCode }],
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
                prices: {
                  include: {
                    supermarket: true,
                  },
                  orderBy: { price: 'asc' },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!list) {
      list = await prisma.shoppingList.create({
        data: {
          title: 'Mi Lista de la Compra Soria',
          shareCode,
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  category: true,
                  prices: {
                    include: { supermarket: true },
                    orderBy: { price: 'asc' },
                  },
                },
              },
            },
          },
        },
      });
    }

    // Agrupar items por pasillo / categoría inteligente
    const categoriesMap: { [catId: string]: { categoryName: string; icon: string; aisleOrder: number; items: any[] } } = {};
    const unclassifiedItems: any[] = [];

    for (const item of list.items) {
      const category = item.product?.category;
      if (category) {
        if (!categoriesMap[category.id]) {
          categoriesMap[category.id] = {
            categoryName: category.name,
            icon: category.icon,
            aisleOrder: category.aisleOrder,
            items: [],
          };
        }
        categoriesMap[category.id].items.push(item);
      } else {
        unclassifiedItems.push(item);
      }
    }

    const groupedByAisle = Object.values(categoriesMap).sort((a, b) => a.aisleOrder - b.aisleOrder);
    if (unclassifiedItems.length > 0) {
      groupedByAisle.push({
        categoryName: 'Otros / Varios',
        icon: '📝',
        aisleOrder: 999,
        items: unclassifiedItems,
      });
    }

    // Calcular comparativa de coste total de la cesta por supermercado
    const basketEstimates = await this.estimateBasketCost(list.items);

    return {
      list,
      groupedByAisle,
      basketEstimates,
      totalItems: list.items.length,
      completedItems: list.items.filter((i) => i.checked).length,
    };
  }

  /**
   * Añade un ítem a la lista (asociado a un producto existente o custom)
   */
  async addItem(data: {
    listId: string;
    productId?: string;
    customName?: string;
    quantity?: number;
    notes?: string;
    targetSupermarketId?: string;
  }) {
    let name = data.customName;
    let productId = data.productId;

    // Si no se proporcionó productId pero sí un nombre, intentar vincularlo inteligentemente
    if (!productId && name) {
      const trimmed = name.trim();
      const firstWord = trimmed.split(' ')[0];
      const match = await prisma.product.findFirst({
        where: {
          OR: [
            { name: { contains: trimmed } },
            { name: { contains: firstWord } },
          ],
        },
      });
      if (match) {
        productId = match.id;
        if (!name) name = match.name;
      }
    } else if (productId && !name) {
      const prod = await prisma.product.findUnique({ where: { id: productId } });
      name = prod?.name;
    }

    return prisma.listItem.create({
      data: {
        listId: data.listId,
        productId: productId || null,
        customName: name || 'Artículo sin nombre',
        quantity: data.quantity || 1,
        notes: data.notes || null,
        targetSupermarketId: data.targetSupermarketId || null,
      },
      include: {
        product: {
          include: {
            category: true,
            prices: {
              include: { supermarket: true },
              orderBy: { price: 'asc' },
            },
          },
        },
      },
    });
  }

  /**
   * Cambia el estado marcado/tachado de un producto
   */
  async toggleItem(itemId: string) {
    const item = await prisma.listItem.findUnique({ where: { id: itemId } });
    if (!item) throw new Error('Ítem no encontrado');

    return prisma.listItem.update({
      where: { id: itemId },
      data: { checked: !item.checked },
    });
  }

  /**
   * Elimina un ítem
   */
  async deleteItem(itemId: string) {
    return prisma.listItem.delete({
      where: { id: itemId },
    });
  }

  /**
   * Estima el coste de la lista completa en los distintos supermercados de Soria y por cadenas
   */
  private async estimateBasketCost(items: any[]) {
    const supermarkets = await prisma.supermarket.findMany({ where: { active: true } });
    const chains = ['Mercadona', 'Dia', 'Lidl', 'Lupa', 'E.Leclerc', 'Alcampo'];

    const chainEstimates: {
      [chain: string]: {
        chain: string;
        total: number;
        itemsFound: number;
        totalItems: number;
        missingItems: string[];
      };
    } = {};

    for (const ch of chains) {
      chainEstimates[ch] = {
        chain: ch,
        total: 0,
        itemsFound: 0,
        totalItems: items.length,
        missingItems: [],
      };
    }

    let optimalTotal = 0;
    let optimalFound = 0;

    for (const item of items) {
      const prices = item.product?.prices || [];
      const itemQty = item.quantity || 1;

      // Buscar mejor precio por cada cadena en Soria
      for (const ch of chains) {
        const chPrices = prices.filter(
          (p: any) => p.supermarket && p.supermarket.chain.toLowerCase() === ch.toLowerCase()
        );
        if (chPrices.length > 0) {
          const bestPrice = Math.min(...chPrices.map((p: any) => p.price));
          chainEstimates[ch].total += +(bestPrice * itemQty).toFixed(2);
          chainEstimates[ch].itemsFound += 1;
        } else {
          chainEstimates[ch].missingItems.push(item.product?.name || item.customName);
        }
      }

      // Para la cesta óptima (comprando en el más barato de cada uno)
      if (prices.length > 0) {
        const minPrice = Math.min(...prices.map((p: any) => p.price));
        optimalTotal += +(minPrice * itemQty).toFixed(2);
        optimalFound += 1;
      }
    }

    const sortedChains = Object.values(chainEstimates)
      .map((c) => ({ ...c, total: +c.total.toFixed(2) }))
      .sort((a, b) => b.itemsFound - a.itemsFound || (a.total > 0 && b.total > 0 ? a.total - b.total : 0));

    const validTotals = sortedChains.filter((c) => c.itemsFound > 0).map((c) => c.total);
    const highestSingle = validTotals.length > 0 ? Math.max(...validTotals) : 0;
    const potentialSavings = +(highestSingle - optimalTotal).toFixed(2);

    return {
      byChain: sortedChains,
      optimal: {
        total: +optimalTotal.toFixed(2),
        itemsFound: optimalFound,
        totalItems: items.length,
        potentialSavings: potentialSavings > 0 ? potentialSavings : 0,
      },
    };
  }
}

export const listService = new ListService();
