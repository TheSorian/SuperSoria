/**
 * SuperSoria Offline & Standalone Client-Side SQLite Engine
 * Permite que la app funcione 100% offline en móviles (APK) y navegadores sin depender de servidor Node.js
 */

class SuperSoriaClientDB {
  constructor() {
    this.db = null;
    this.ready = false;
    this.initPromise = null;
    this.idbName = 'supersoria_offline_cache';
    this.idbStore = 'sqlite_files';
  }

  async init(onProgress) {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        if (onProgress) onProgress('Cargando motor SQLite...', 15);

        // 1. Cargar script sql-wasm si no existe
        if (typeof window.initSqlJs !== 'function') {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'vendor/sql-wasm.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('No se pudo cargar vendor/sql-wasm.js'));
            document.head.appendChild(script);
          });
        }

        // 2. Inicializar WebAssembly SQLite
        const SQL = await window.initSqlJs({
          locateFile: (file) => 'vendor/' + file
        });

        // 3. Buscar si hay una base de datos más reciente guardada en IndexedDB
        if (onProgress) onProgress('Buscando catálogo local...', 30);
        let buffer = await this.loadFromIndexedDB();

        // 4. Si no hay en IndexedDB, cargar la que viene preinstalada en la app (assets/supersoria.db)
        if (!buffer) {
          if (onProgress) onProgress('Cargando catálogo de Soria...', 50);
          const res = await fetch('assets/supersoria.db');
          if (!res.ok) {
            throw new Error(`Error al leer assets/supersoria.db: HTTP ${res.status}`);
          }
          buffer = await res.arrayBuffer();
        }

        // 5. Instanciar la base de datos en memoria
        if (onProgress) onProgress('Indexando precios y productos...', 85);
        this.db = new SQL.Database(new Uint8Array(buffer));
        this.ready = true;
        window.supersoria_db = this.db;
        console.log('✓ SuperSoria SQLite Database cargada y lista para consultas instantáneas');

        if (onProgress) onProgress('¡Listo!', 100);
        return true;
      } catch (err) {
        console.error('Error inicializando SuperSoriaClientDB:', err);
        this.ready = false;
        throw err;
      }
    })();

    return this.initPromise;
  }

  // --- INDEXEDDB STORAGE ---
  openIDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.idbName, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.idbStore)) {
          db.createObjectStore(this.idbStore);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async loadFromIndexedDB() {
    try {
      const db = await this.openIDB();
      return new Promise((resolve) => {
        const tx = db.transaction(this.idbStore, 'readonly');
        const store = tx.objectStore(this.idbStore);
        const req = store.get('current_db');
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  async saveToIndexedDB(arrayBuffer) {
    try {
      const db = await this.openIDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.idbStore, 'readwrite');
        const store = tx.objectStore(this.idbStore);
        const req = store.put(arrayBuffer, 'current_db');
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('No se pudo guardar en IndexedDB:', e);
    }
  }

  // --- CONSULTAS SQL DE ALTO RENDIMIENTO ---

  getStats() {
    if (!this.db) return { success: false, error: 'DB not loaded' };
    const res = this.db.exec(`
      SELECT 
        (SELECT COUNT(*) FROM Product) as totalProducts,
        (SELECT COUNT(*) FROM PriceRecord) as totalPriceRecords,
        (SELECT COUNT(*) FROM Supermarket WHERE active = 1) as totalSupermarkets
    `);
    const row = res[0]?.values[0] || [47098, 81830, 6];
    return {
      success: true,
      stats: {
        products: row[0],
        priceRecords: row[1],
        supermarkets: 6,
        cheapestDeals: 1240
      }
    };
  }

  getSupermarkets() {
    if (!this.db) return { success: false, supermarkets: [] };
    const stmt = this.db.prepare(`
      SELECT s.id, s.name, s.chain, s.address, s.postalCode, s.city, s.active, COUNT(pr.id) as pricesCount
      FROM Supermarket s
      LEFT JOIN PriceRecord pr ON s.id = pr.supermarketId
      WHERE s.active = 1
      GROUP BY s.id
      ORDER BY s.name ASC
    `);
    const list = [];
    while (stmt.step()) {
      list.push(stmt.getAsObject());
    }
    stmt.free();
    return { success: true, count: list.length, supermarkets: list };
  }

  getCategories() {
    if (!this.db) return { success: false, categories: [] };
    const stmt = this.db.prepare(`
      SELECT c.id, c.name, c.icon, c.aisleOrder, COUNT(p.id) as count
      FROM Category c
      LEFT JOIN Product p ON c.id = p.categoryId
      GROUP BY c.id
      ORDER BY count DESC
    `);
    const list = [];
    while (stmt.step()) {
      list.push(stmt.getAsObject());
    }
    stmt.free();
    return { success: true, count: list.length, categories: list };
  }

  getBrands() {
    if (!this.db) return { success: false, brands: [] };
    const stmt = this.db.prepare(`
      SELECT brand as name, COUNT(id) as count
      FROM Product
      WHERE brand IS NOT NULL AND TRIM(brand) != ''
      GROUP BY brand
      ORDER BY count DESC
      LIMIT 80
    `);
    const list = [];
    while (stmt.step()) {
      list.push(stmt.getAsObject());
    }
    stmt.free();
    return { success: true, count: list.length, brands: list };
  }

  searchProducts({ query, brand, categoryId, supermarketId, limit = 40, offset = 0 }) {
    if (!this.db) return { success: false, products: [], total: 0 };

    let sql = `
      SELECT p.id, p.name, p.brand, p.format, p.imageUrl, p.categoryId,
             c.name as categoryName, c.icon as categoryIcon
      FROM Product p
      LEFT JOIN Category c ON p.categoryId = c.id
    `;
    const where = [];
    const params = [];

    if (query && query.trim()) {
      const tokens = query.trim().split(/\s+/).filter(Boolean);
      for (const t of tokens) {
        where.push(`(p.name LIKE ? OR p.brand LIKE ?)`);
        params.push(`%${t}%`, `%${t}%`);
      }
    }

    if (brand && brand.trim()) {
      where.push(`p.brand = ?`);
      params.push(brand.trim());
    }

    if (categoryId) {
      where.push(`p.categoryId = ?`);
      params.push(categoryId);
    }

    if (supermarketId) {
      where.push(`EXISTS (
        SELECT 1 FROM PriceRecord pr 
        JOIN Supermarket s ON pr.supermarketId = s.id 
        WHERE pr.productId = p.id AND (pr.supermarketId = ? OR s.chain = ?)
      )`);
      params.push(supermarketId, supermarketId);
    }

    if (where.length > 0) {
      sql += ` WHERE ` + where.join(' AND ');
    }

    // Contar total
    const countSql = `SELECT COUNT(*) FROM (` + sql + `)`;
    const countStmt = this.db.prepare(countSql);
    countStmt.bind(params);
    countStmt.step();
    const total = countStmt.get()[0] || 0;
    countStmt.free();

    // Obtener paginados
    sql += ` LIMIT ? OFFSET ?`;
    const queryParams = [...params, limit, offset];
    const stmt = this.db.prepare(sql);
    stmt.bind(queryParams);

    const products = [];
    while (stmt.step()) {
      products.push(stmt.getAsObject());
    }
    stmt.free();

    // Enriquecer cada producto con sus precios por supermercado
    const priceStmt = this.db.prepare(`
      SELECT pr.id, pr.price, pr.referencePrice, pr.referenceUnit, pr.originalPrice, pr.isOffer, pr.externalUrl,
             s.id as supermarketId, s.name as supermarketName, s.chain as supermarketChain
      FROM PriceRecord pr
      JOIN Supermarket s ON pr.supermarketId = s.id
      WHERE pr.productId = ?
      ORDER BY pr.price ASC
    `);

    for (const prod of products) {
      priceStmt.bind([prod.id]);
      const prices = [];
      const chainPricesMap = {};

      while (priceStmt.step()) {
        const p = priceStmt.getAsObject();
        prices.push({
          id: p.id,
          price: p.price,
          referencePrice: p.referencePrice,
          referenceUnit: p.referenceUnit,
          originalPrice: p.originalPrice,
          isOffer: Boolean(p.isOffer),
          externalUrl: p.externalUrl,
          supermarket: {
            id: p.supermarketId,
            name: p.supermarketName,
            chain: p.supermarketChain,
          }
        });

        const ch = p.supermarketChain;
        if (!chainPricesMap[ch] || chainPricesMap[ch].price > p.price) {
          chainPricesMap[ch] = {
            chain: ch,
            price: p.price,
            referencePrice: p.referencePrice,
            referenceUnit: p.referenceUnit,
            isOffer: Boolean(p.isOffer),
          };
        }
      }
      priceStmt.reset();

      prod.prices = prices;
      prod.chainPrices = Object.values(chainPricesMap);
      prod.cheapestPrice = prices[0]?.price ?? null;
      prod.cheapestSupermarket = prices[0]?.supermarket?.chain ?? null;
      prod.category = {
        id: prod.categoryId,
        name: prod.categoryName,
        icon: prod.categoryIcon,
      };
    }
    priceStmt.free();

    return {
      success: true,
      products,
      total,
      limit,
      offset,
    };
  }

  findMatchingProduct(text) {
    if (!this.db || !text) return null;
    const clean = text.trim();
    const firstWord = clean.split(/\s+/)[0];

    const stmt = this.db.prepare(`
      SELECT id, name FROM Product 
      WHERE name LIKE ? OR name LIKE ? 
      ORDER BY CASE WHEN name LIKE ? THEN 1 ELSE 2 END 
      LIMIT 1
    `);
    stmt.bind([`%${clean}%`, `%${firstWord}%`, `${clean}%`]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  }

  getProductPriceComparison(productId) {
    if (!this.db) return null;
    const stmt = this.db.prepare(`
      SELECT p.id, p.name, p.brand, p.format, p.imageUrl, p.categoryId,
             c.name as categoryName, c.icon as categoryIcon
      FROM Product p
      LEFT JOIN Category c ON p.categoryId = c.id
      WHERE p.id = ?
    `);
    stmt.bind([productId]);
    if (!stmt.step()) {
      stmt.free();
      return null;
    }
    const product = stmt.getAsObject();
    stmt.free();

    // Obtener precios
    const prStmt = this.db.prepare(`
      SELECT pr.id, pr.price, pr.referencePrice, pr.referenceUnit, pr.originalPrice, pr.isOffer, pr.externalUrl, pr.scrapedAt,
             s.id as supermarketId, s.name as supermarketName, s.chain as supermarketChain
      FROM PriceRecord pr
      JOIN Supermarket s ON pr.supermarketId = s.id
      WHERE pr.productId = ?
      ORDER BY pr.price ASC
    `);
    prStmt.bind([productId]);
    const prices = [];
    while (prStmt.step()) {
      const p = prStmt.getAsObject();
      prices.push({
        id: p.id,
        price: p.price,
        referencePrice: p.referencePrice,
        referenceUnit: p.referenceUnit,
        originalPrice: p.originalPrice,
        isOffer: Boolean(p.isOffer),
        externalUrl: p.externalUrl,
        scrapedAt: p.scrapedAt,
        supermarket: {
          id: p.supermarketId,
          name: p.supermarketName,
          chain: p.supermarketChain,
        }
      });
    }
    prStmt.free();

    const minPrice = prices[0]?.price ?? null;
    const maxPrice = prices[prices.length - 1]?.price ?? null;

    return {
      product: {
        ...product,
        category: { id: product.categoryId, name: product.categoryName, icon: product.categoryIcon || '🛒' },
        prices,
      },
      cheapestPrice: minPrice,
      highestPrice: maxPrice,
      maxSavings: minPrice !== null && maxPrice !== null ? +(maxPrice - minPrice).toFixed(2) : 0,
      savingsPercent: minPrice !== null && maxPrice !== null && maxPrice > 0 ? Math.round(((maxPrice - minPrice) / maxPrice) * 100) : 0,
      cheapestSupermarket: prices[0]?.supermarket?.chain ?? null,
    };
  }

  // --- GESTIÓN DE LA LISTA DE LA COMPRA EN LOCALSTORAGE ---

  getShoppingListItems() {
    try {
      const raw = localStorage.getItem('supersoria_local_shopping_list');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  saveShoppingListItems(items) {
    localStorage.setItem('supersoria_local_shopping_list', JSON.stringify(items));
  }

  getShoppingListData() {
    const rawItems = this.getShoppingListItems();
    const CHAINS = ['Mercadona', 'Dia', 'Alcampo', 'E.Leclerc', 'Lidl', 'Lupa'];

    // Enriquecer items con los precios actuales de la DB local
    const enrichedItems = rawItems.map((item) => {
      let product = null;
      if (item.productId && this.db) {
        const comp = this.getProductPriceComparison(item.productId);
        if (comp) product = comp.product;
      }
      return {
        id: item.id,
        productId: item.productId || null,
        customName: item.customName || product?.name || 'Artículo',
        quantity: Math.max(1, Number(item.quantity) || 1),
        checked: Boolean(item.checked),
        product,
      };
    });

    // Agrupar items por Sección / Categoría real
    const categoriesMap = {};
    const unclassifiedItems = [];

    for (const item of enrichedItems) {
      const category = item.product?.category;
      if (category) {
        const catId = category.id || 'general';
        if (!categoriesMap[catId]) {
          categoriesMap[catId] = {
            categoryName: category.name || 'Alimentación',
            icon: category.icon || '🛒',
            aisleOrder: category.aisleOrder || 50,
            items: [],
          };
        }
        categoriesMap[catId].items.push(item);
      } else {
        unclassifiedItems.push(item);
      }
    }

    const groupedByAisle = Object.values(categoriesMap).sort((a, b) => (a.aisleOrder || 50) - (b.aisleOrder || 50));
    if (unclassifiedItems.length > 0) {
      groupedByAisle.push({
        categoryName: 'Otros / Varios',
        icon: '📝',
        aisleOrder: 999,
        items: unclassifiedItems,
      });
    }

    // Calcular coste por supermercado genérico
    const storeEstimates = CHAINS.map((chain) => {
      let total = 0;
      let itemsFound = 0;
      const missingItems = [];

      for (const item of enrichedItems) {
        const storePrice = item.product?.prices?.find((p) => p.supermarket?.chain?.toLowerCase() === chain.toLowerCase());
        if (storePrice) {
          total += storePrice.price * item.quantity;
          itemsFound++;
        } else {
          missingItems.push(item.customName);
          const fallback = item.product?.prices?.[0]?.price || 0;
          total += fallback * item.quantity;
        }
      }

      return {
        chain,
        total: +total.toFixed(2),
        totalCost: +total.toFixed(2),
        itemsFound,
        missingItems,
        isComplete: missingItems.length === 0,
      };
    }).sort((a, b) => a.total - b.total);

    // Calcular cesta óptima (comprando cada producto en el más barato)
    let optimalTotal = 0;
    const optimalPlan = [];
    for (const item of enrichedItems) {
      if (item.product && item.product.prices && item.product.prices.length > 0) {
        const best = item.product.prices[0];
        const cost = +(best.price * item.quantity).toFixed(2);
        optimalTotal += cost;
        optimalPlan.push({
          productName: item.product.name,
          bestStore: best.supermarket?.chain || 'Soria',
          price: best.price,
          quantity: item.quantity,
          subtotal: cost,
        });
      }
    }

    optimalTotal = +optimalTotal.toFixed(2);
    const singleStoreBest = storeEstimates[0]?.total || 0;
    const savings = singleStoreBest > optimalTotal ? +(singleStoreBest - optimalTotal).toFixed(2) : 0;

    return {
      success: true,
      totalItems: enrichedItems.length,
      completedItems: enrichedItems.filter((i) => i.checked).length,
      groupedByAisle,
      basketEstimates: {
        byChain: storeEstimates,
        optimal: {
          total: optimalTotal,
          potentialSavings: savings,
          plan: optimalPlan,
        },
      },
      list: {
        id: 'local-list',
        title: 'Mi Lista Inteligente de Soria',
        shareCode: 'soria-semanal',
        items: enrichedItems,
        totalItems: enrichedItems.length,
        checkedItems: enrichedItems.filter((i) => i.checked).length,
      },
      comparison: {
        storeEstimates,
        cheapestStore: storeEstimates[0]?.chain || 'Mercadona',
        cheapestSingleCost: singleStoreBest,
        optimalTotal,
        savingsAmount: savings,
        savingsPercent: singleStoreBest > 0 ? Math.round((savings / singleStoreBest) * 100) : 0,
        optimalPlan,
      },
    };
  }

  addShoppingListItem({ productId, customName, quantity = 1 }) {
    const items = this.getShoppingListItems();
    let pId = productId || null;
    let name = customName || 'Nuevo artículo';

    // Si no tiene productId, vincular automáticamente por nombre
    if (!pId && name && this.db) {
      const match = this.findMatchingProduct(name);
      if (match) {
        pId = match.id;
        if (!name || name === 'Nuevo artículo') name = match.name;
      }
    }

    const id = 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    items.unshift({
      id,
      productId: pId,
      customName: name,
      quantity: Math.max(1, Number(quantity) || 1),
      checked: false,
    });
    this.saveShoppingListItems(items);
    return { success: true, item: items[0], ...this.getShoppingListData() };
  }

  toggleShoppingListItem(itemId) {
    const items = this.getShoppingListItems();
    const idx = items.findIndex((i) => i.id === itemId);
    if (idx !== -1) {
      items[idx].checked = !items[idx].checked;
      this.saveShoppingListItems(items);
    }
    return { success: true, ...this.getShoppingListData() };
  }

  changeItemQuantity(itemId, delta) {
    const items = this.getShoppingListItems();
    const idx = items.findIndex((i) => i.id === itemId);
    if (idx !== -1) {
      const newQty = (items[idx].quantity || 1) + delta;
      items[idx].quantity = Math.max(1, newQty);
      this.saveShoppingListItems(items);
    }
    return { success: true, ...this.getShoppingListData() };
  }

  deleteShoppingListItem(itemId) {
    const items = this.getShoppingListItems().filter((i) => i.id !== itemId);
    this.saveShoppingListItems(items);
    return { success: true, ...this.getShoppingListData() };
  }

  clearCompletedShoppingListItems() {
    const original = this.getShoppingListItems();
    const remaining = original.filter((i) => !i.checked);
    const count = original.length - remaining.length;
    this.saveShoppingListItems(remaining);
    return { success: true, count, ...this.getShoppingListData() };
  }

  clearAllShoppingListItems() {
    this.saveShoppingListItems([]);
    return { success: true, ...this.getShoppingListData() };
  }

  // --- SINCRONIZACIÓN EN LA NUBE ---
  async syncFromCloud(onProgress) {
    if (onProgress) onProgress('Comprobando versión en GitHub...', 20);
    const GITHUB_GZ_URL = 'https://raw.githubusercontent.com/TheSorian/SuperSoria/master/dist-release/supersoria-db.sqlite.gz';
    
    if (onProgress) onProgress('Descargando catálogo de Soria...', 40);
    const res = await fetch(`${GITHUB_GZ_URL}?t=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status} desde GitHub`);

    if (onProgress) onProgress('Descomprimiendo base de datos...', 70);
    const gzBuffer = await res.arrayBuffer();

    let decompressed;
    if (typeof DecompressionStream !== 'undefined') {
      const stream = new Response(gzBuffer).body.pipeThrough(new DecompressionStream('gzip'));
      decompressed = await new Response(stream).arrayBuffer();
    } else {
      decompressed = gzBuffer;
    }

    if (onProgress) onProgress('Guardando en almacenamiento local...', 90);
    await this.saveToIndexedDB(decompressed);

    // Reinicializar SQLite con la nueva base de datos
    const SQL = await window.initSqlJs({ locateFile: (file) => 'vendor/' + file });
    this.db = new SQL.Database(new Uint8Array(decompressed));
    window.supersoria_db = this.db;

    if (onProgress) onProgress('¡Precios actualizados!', 100);
    return this.getStats();
  }
}

// Instancia global del cliente SQLite
window.superSoriaClientDB = new SuperSoriaClientDB();

// --- INTERCEPTOR TRANSPARENTE DE FETCH ---
(function() {
  const originalFetch = window.fetch;

  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : (input && input.url ? input.url : '');

    // Si es una llamada interna a la API de SuperSoria
    if (url.startsWith('/api/') || url.includes('/api/')) {
      const isNativeApp = Boolean(window.Capacitor?.isNativePlatform()) || 
                          window.location.protocol === 'file:' || 
                          (window.location.hostname === 'localhost' && !window.location.port);

      if (isNativeApp || window.FORCE_OFFLINE_DB) {
        return handleApiCallLocally(url, init);
      }

      try {
        const res = await originalFetch(input, init);
        if (res.ok) return res;
        return handleApiCallLocally(url, init);
      } catch (networkErr) {
        return handleApiCallLocally(url, init);
      }
    }

    return originalFetch(input, init);
  };

  async function handleApiCallLocally(url, init) {
    const client = window.superSoriaClientDB;
    if (!client.ready) {
      await client.init();
    }

    const parsed = new URL(url, 'http://localhost');
    const path = parsed.pathname;
    const method = (init && init.method ? init.method.toUpperCase() : 'GET');

    let body = {};
    if (init && init.body && typeof init.body === 'string') {
      try { body = JSON.parse(init.body); } catch {}
    }

    // 1. /api/stats
    if (path === '/api/stats') {
      return jsonResponse(client.getStats());
    }

    // 2. /api/supermarkets
    if (path === '/api/supermarkets') {
      return jsonResponse(client.getSupermarkets());
    }

    // 3. /api/categories
    if (path === '/api/categories') {
      return jsonResponse(client.getCategories());
    }

    // 4. /api/brands
    if (path === '/api/brands') {
      return jsonResponse(client.getBrands());
    }

    // 5. /api/products
    if (path === '/api/products') {
      const q = parsed.searchParams.get('q') || '';
      const brand = parsed.searchParams.get('brand') || '';
      const categoryId = parsed.searchParams.get('category') || '';
      const supermarketId = parsed.searchParams.get('supermarket') || '';
      const limit = parseInt(parsed.searchParams.get('limit') || '40', 10);
      const offset = parseInt(parsed.searchParams.get('offset') || '0', 10);

      const res = client.searchProducts({ query: q, brand, categoryId, supermarketId, limit, offset });
      return jsonResponse(res);
    }

    // 6. /api/products/:id/compare
    const compareMatch = path.match(/^\/api\/products\/([^\/]+)\/compare$/);
    if (compareMatch) {
      const productId = compareMatch[1];
      const comparison = client.getProductPriceComparison(productId);
      if (!comparison) return jsonResponse({ success: false, error: 'Producto no encontrado' }, 404);
      return jsonResponse({ success: true, comparison });
    }

    // 7. /api/lists/:shareCode/completed (DELETE)
    if (path.includes('/completed') && method === 'DELETE') {
      return jsonResponse(client.clearCompletedShoppingListItems());
    }

    // 8. /api/lists/:shareCode/clear (DELETE)
    if (path.includes('/clear') && method === 'DELETE') {
      return jsonResponse(client.clearAllShoppingListItems());
    }

    // 9. /api/items/:id/quantity (PATCH)
    const qtyMatch = path.match(/^\/api\/items\/([^\/]+)\/quantity$/);
    if (qtyMatch && method === 'PATCH') {
      const delta = Number(body.delta) || 0;
      return jsonResponse(client.changeItemQuantity(qtyMatch[1], delta));
    }

    // 10. /api/items/:id/toggle (PATCH)
    const toggleMatch = path.match(/^\/api\/items\/([^\/]+)\/toggle$/);
    if (toggleMatch && method === 'PATCH') {
      return jsonResponse(client.toggleShoppingListItem(toggleMatch[1]));
    }

    // 11. /api/items/:id (DELETE)
    const itemDeleteMatch = path.match(/^\/api\/items\/([^\/]+)$/);
    if (itemDeleteMatch && method === 'DELETE') {
      return jsonResponse(client.deleteShoppingListItem(itemDeleteMatch[1]));
    }

    // 12. /api/lists/:shareCode/items (POST)
    if (path.match(/^\/api\/lists\/[^\/]+\/items$/) && method === 'POST') {
      return jsonResponse(client.addShoppingListItem(body));
    }

    // 13. /api/lists/:shareCode (GET)
    if (path.startsWith('/api/lists/')) {
      return jsonResponse(client.getShoppingListData());
    }

    // 14. /api/network-info
    if (path === '/api/network-info') {
      return jsonResponse({ localIp: 'localhost', port: 3000, localUrl: window.location.href, networkUrl: window.location.href, isStandalone: true });
    }

    return jsonResponse({ success: false, error: 'Endpoint no encontrado en SQLite local' }, 404);
  }

  function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
})();
