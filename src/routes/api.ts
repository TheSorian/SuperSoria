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
    const brand = req.query.brand as string | undefined;
    const categoryId = req.query.category as string | undefined;
    const supermarketId = req.query.supermarket as string | undefined;
    const limit = parseInt(req.query.limit as string) || 40;
    const offset = parseInt(req.query.offset as string) || 0;

    const data = await productService.searchProducts({
      query,
      brand,
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

// --- MARCAS POPULARES DE SORIA ---
router.get('/brands', async (_req: Request, res: Response) => {
  try {
    const brands = await prisma.product.groupBy({
      by: ['brand'],
      where: {
        brand: { not: null },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 80,
    });

    const cleanBrands = brands
      .filter((b) => b.brand && b.brand.trim() !== '')
      .map((b) => ({
        name: b.brand,
        count: b._count.id,
      }));

    res.json({ success: true, count: cleanBrands.length, brands: cleanBrands });
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

// Actualizar o registrar precio manualmente (ej: E.Leclerc en tienda o corrección de usuario)
router.post('/products/:id/price', async (req: Request, res: Response) => {
  try {
    const { supermarketId, chain, price, isOffer } = req.body;
    const numPrice = parseFloat(price);
    if (!numPrice || isNaN(numPrice)) {
      return res.status(400).json({ success: false, error: 'Precio inválido' });
    }

    const smQuery = chain || supermarketId;
    const smMatch = await prisma.supermarket.findFirst({
      where: {
        OR: [
          { id: smQuery },
          { chain: { equals: smQuery } },
        ],
      },
    });
    const targetSupermarketId = smMatch?.id || smQuery;

    const existing = await prisma.priceRecord.findFirst({
      where: { productId: req.params.id, supermarketId: targetSupermarketId },
    });

    let record;
    if (existing) {
      record = await prisma.priceRecord.update({
        where: { id: existing.id },
        data: { price: numPrice, isOffer: Boolean(isOffer), scrapedAt: new Date() },
      });
    } else {
      record = await prisma.priceRecord.create({
        data: {
          productId: req.params.id,
          supermarketId: targetSupermarketId,
          price: numPrice,
          isOffer: Boolean(isOffer),
        },
      });
    }

    res.json({ success: true, record });
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

router.patch('/items/:id/quantity', async (req: Request, res: Response) => {
  try {
    const { delta, quantity } = req.body;
    const item = await prisma.listItem.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ success: false, error: 'Ítem no encontrado' });

    let newQty = quantity !== undefined ? parseFloat(quantity) : item.quantity + (parseFloat(delta) || 0);
    if (newQty < 1) newQty = 1;

    const updated = await prisma.listItem.update({
      where: { id: req.params.id },
      data: { quantity: newQty },
    });
    res.json({ success: true, item: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/items/:id/equivalent', async (req: Request, res: Response) => {
  try {
    const { chain, alternativeProductId } = req.body;
    const item = await prisma.listItem.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ success: false, error: 'Ítem no encontrado' });

    let notesObj: any = {};
    try {
      if (item.notes) notesObj = JSON.parse(item.notes);
    } catch {
      notesObj = {};
    }
    if (!notesObj.manualEquivalents) notesObj.manualEquivalents = {};
    if (alternativeProductId === null) {
      delete notesObj.manualEquivalents[chain];
    } else {
      notesObj.manualEquivalents[chain] = alternativeProductId;
    }

    await prisma.listItem.update({
      where: { id: req.params.id },
      data: { notes: JSON.stringify(notesObj) },
    });

    res.json({ success: true, message: 'Alternativa actualizada' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/lists/:shareCode/completed', async (req: Request, res: Response) => {
  try {
    const listData = await listService.getListByCode(req.params.shareCode);
    const deleted = await prisma.listItem.deleteMany({
      where: {
        listId: listData.list.id,
        checked: true,
      },
    });
    res.json({ success: true, count: deleted.count });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/lists/:shareCode/clear', async (req: Request, res: Response) => {
  try {
    const listData = await listService.getListByCode(req.params.shareCode);
    const deleted = await prisma.listItem.deleteMany({
      where: { listId: listData.list.id },
    });
    res.json({ success: true, count: deleted.count });
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

router.post('/scrapers/import-all', async (_req: Request, res: Response) => {
  try {
    // Lanzar en segundo plano para volcar catálogos completos
    import('../scrapers/importAllSoria.js')
      .then(() => console.log('Importación masiva completada.'))
      .catch((err) => console.error('Error importación masiva:', err));

    res.json({
      success: true,
      message: 'Descarga completa de todos los supermercados de Soria iniciada en segundo plano (~35.000 productos).',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/scrapers/expand-leclerc-lupa', async (_req: Request, res: Response) => {
  try {
    import('../scrapers/expandLeclercAndLupa.js')
      .then((m) => m.expandBoth())
      .catch((err) => console.error('Error expandiendo E.Leclerc y Lupa:', err));

    res.json({
      success: true,
      message: 'Escaneo masivo y profundo de E.Leclerc Soria y Lupa Granados iniciado en segundo plano.',
    });
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
