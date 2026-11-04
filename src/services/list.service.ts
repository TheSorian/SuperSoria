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
    if (data.productId && !name) {
      const prod = await prisma.product.findUnique({ where: { id: data.productId } });
      name = prod?.name;
    }

    return prisma.listItem.create({
      data: {
        listId: data.listId,
        productId: data.productId || null,
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
   * Estima el coste de la lista completa en los distintos supermercados de Soria
   */
  private async estimateBasketCost(items: any[]) {
    const supermarkets = await prisma.supermarket.findMany({ where: { active: true } });
    const estimates: {
      [smId: string]: {
        supermarketId: string;
        name: string;
        chain: string;
        total: number;
        itemsFound: number;
        totalItems: number;
      };
    } = {};

    for (const sm of supermarkets) {
      estimates[sm.id] = {
        supermarketId: sm.id,
        name: sm.name,
        chain: sm.chain,
        total: 0,
        itemsFound: 0,
        totalItems: items.length,
      };
    }

    for (const item of items) {
      const prices = item.product?.prices || [];
      for (const sm of supermarkets) {
        const smPrice = prices.find((p: any) => p.supermarketId === sm.id);
        if (smPrice) {
          estimates[sm.id].total += +(smPrice.price * item.quantity).toFixed(2);
          estimates[sm.id].itemsFound += 1;
        }
      }
    }

    return Object.values(estimates)
      .map((e) => ({
        ...e,
        total: +e.total.toFixed(2),
      }))
      .sort((a, b) => (a.itemsFound > 0 && b.itemsFound > 0 ? a.total - b.total : b.itemsFound - a.itemsFound));
  }
}

export const listService = new ListService();
