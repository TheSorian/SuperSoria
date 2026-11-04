import { Router, Request, Response } from 'express';
import { productService } from '../services/product.service.js';
import { listService } from '../services/list.service.js';
import { scraperManager } from '../scrapers/index.js';
import prisma from '../db/prisma.js';

export const router = Router();

// --- SUPERMERCADOS ---
router.get('/supermarkets', async (_req: Request, res: Response) => {
  try {
    const list = await productService.getAllSupermarkets();
    res.json({ success: true, count: list.length, supermarkets: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- CATEGORÍAS ---
router.get('/categories', async (_req: Request, res: Response) => {
  try {
    const categories = await productService.getAllCategories();
    res.json({ success: true, count: categories.length, categories });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- PRODUCTOS Y COMPARADOR ---
router.get('/products', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string | undefined;
    const categoryId = req.query.category as string | undefined;
    const supermarketId = req.query.supermarket as string | undefined;
    const limit = parseInt(req.query.limit as string) || 40;
    const offset = parseInt(req.query.offset as string) || 0;

    const data = await productService.searchProducts({
      query,
      categoryId,
      supermarketId,
      limit,
      offset,
    });

    res.json({ success: true, ...data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/products/:id/compare', async (req: Request, res: Response) => {
  try {
    const comparison = await productService.getProductPriceComparison(req.params.id);
    if (!comparison) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }
    res.json({ success: true, comparison });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- LISTAS DE LA COMPRA ---
router.get('/lists/:shareCode', async (req: Request, res: Response) => {
  try {
    const result = await listService.getListByCode(req.params.shareCode);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/lists/:shareCode/items', async (req: Request, res: Response) => {
  try {
    const listData = await listService.getListByCode(req.params.shareCode);
    const { productId, customName, quantity, notes, targetSupermarketId } = req.body;

    const newItem = await listService.addItem({
      listId: listData.list.id,
      productId,
      customName,
      quantity: quantity ? parseFloat(quantity) : 1,
      notes,
      targetSupermarketId,
    });

    res.status(201).json({ success: true, item: newItem });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/items/:id/toggle', async (req: Request, res: Response) => {
  try {
    const updated = await listService.toggleItem(req.params.id);
    res.json({ success: true, item: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/items/:id', async (req: Request, res: Response) => {
  try {
    await listService.deleteItem(req.params.id);
    res.json({ success: true, message: 'Ítem eliminado correctamente' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- SCRAPERS Y REGISTRO ---
router.post('/scrapers/run', async (req: Request, res: Response) => {
  try {
    const { supermarketId } = req.body;
    if (supermarketId) {
      const result = await scraperManager.runScraper(supermarketId);
      return res.json({ success: true, result });
    } else {
      // Lanzar en segundo plano para no bloquear
      scraperManager.runAll().catch(console.error);
      return res.json({
        success: true,
        message: 'Scraping general lanzado en segundo plano para todos los supermercados de Soria.',
      });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/scrapers/logs', async (_req: Request, res: Response) => {
  try {
    const logs = await prisma.scrapeLog.findMany({
      orderBy: { startedAt: 'desc' },
      take: 20,
    });
    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- ESTADÍSTICAS GLOBALES ---
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [supermarketsCount, productsCount, pricesCount, offersCount, listsCount] = await Promise.all([
      prisma.supermarket.count({ where: { active: true } }),
      prisma.product.count(),
      prisma.priceRecord.count(),
      prisma.priceRecord.count({ where: { isOffer: true } }),
      prisma.shoppingList.count(),
    ]);

    res.json({
      success: true,
      stats: {
        supermarkets: supermarketsCount,
        products: productsCount,
        pricesTracked: pricesCount,
        activeOffers: offersCount,
        lists: listsCount,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
