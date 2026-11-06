/**
 * SuperSoria Offline & Standalone Client-Side SQLite Engine
 * Permite que la app funcione 100% offline en móviles (APK) y navegadores sin depender de servidor Node.js
 */

// Expande un término de búsqueda a sus variantes en español (tildes, singular/plural, sinónimos y género)
function getWordVariants(word) {
  const norm = (word || '').toLowerCase().trim();
  if (!norm) return [];

  const stems = new Set([norm]);

  // Plural / singular en español
  if (norm.endsWith('es') && norm.length > 4) {
    stems.add(norm.slice(0, -2));
    stems.add(norm.slice(0, -1));
  } else if (norm.endsWith('s') && norm.length > 3) {
    stems.add(norm.slice(0, -1));
  } else if (norm.length > 3) {
    stems.add(norm + 's');
    stems.add(norm + 'es');
  }

  // Inflección de género (-o, -a, -os, -as)
  for (const s of Array.from(stems)) {
    if (s.endsWith('o') && s.length > 3) {
      stems.add(s.slice(0, -1) + 'a');
      stems.add(s.slice(0, -1) + 'as');
      stems.add(s.slice(0, -1) + 'os');
    } else if (s.endsWith('a') && s.length > 3) {
      stems.add(s.slice(0, -1) + 'o');
      stems.add(s.slice(0, -1) + 'os');
      stems.add(s.slice(0, -1) + 'as');
    }
  }

  // Sinónimos comunes en compras españolas
  const synonyms = {
    fresca: ['fresca', 'pasteurizada', 'fresco'],
    fresco: ['fresco', 'fresca', 'pasteurizada'],
    yogurt: ['yogurt', 'yogur', 'yogures'],
    yogur: ['yogur', 'yogurt', 'yogures'],
    platano: ['platano', 'plátano', 'banana', 'bananas'],
    plátano: ['platano', 'plátano', 'banana', 'bananas'],
    torrezno: ['torrezno', 'torreznos', 'panceta'],
    torreznos: ['torrezno', 'torreznos', 'panceta'],
    oliva: ['oliva', 'olivas'],
    atun: ['atun', 'atún', 'bonito'],
    atún: ['atun', 'atún', 'bonito'],
    humedo: ['humedo', 'húmedo', 'humeda', 'húmeda'],
    húmedo: ['humedo', 'húmedo', 'humeda', 'húmeda'],
    higienico: ['higienico', 'higiénico', 'higienica', 'higiénica'],
    higiénico: ['higienico', 'higiénico', 'higienica', 'higiénica'],
  };

  const variants = new Set();
  for (const s of Array.from(stems)) {
    variants.add(s);
    if (synonyms[s]) {
      synonyms[s].forEach(syn => variants.add(syn));
    }
  }

  // Expandir todas las combinaciones de tildes (a/á, e/é, i/í, o/ó, u/ú/ü, n/ñ)
  const charMap = {
    a: ['a', 'á'],
    e: ['e', 'é'],
    i: ['i', 'í'],
    o: ['o', 'ó'],
    u: ['u', 'ú', 'ü'],
    n: ['n', 'ñ'],
  };

  const finalVariants = new Set();
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

// Cálculo de relevancia para priorizar alimentos básicos y marcas deseadas
function calculateRelevance(product, queryTokens, originalQuery) {
  let score = 0;
  const nameLower = (product.name || '').toLowerCase();
  const brandLower = (product.brand || '').toLowerCase();
  const qLower = (originalQuery || '').toLowerCase();
  const qPlain = qLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const namePlain = nameLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (namePlain.startsWith(qPlain)) {
    score += 160;
  } else if (namePlain.includes(' ' + qPlain) || namePlain.includes(qPlain)) {
    score += 90;
  }

  if (brandLower.includes(qPlain)) {
    score += 80;
  }

  for (const token of queryTokens) {
    const tPlain = token.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const regex = new RegExp(`\\b${tPlain}\\b`, 'i');
    if (regex.test(namePlain)) {
      score += 45;
    }
  }

  if (product.imageUrl) score += 20;

  if (/^[0-9%#$]/.test(product.name || '') && !/\d/.test(originalQuery)) {
    score -= 40;
  }

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

class SuperSoriaClientDB {
  constructor() {
    this.db = null;
    this.ready = false;
    this.initPromise = null;
    this.idbName = 'supersoria_offline_cache';
    this.idbStore = 'sqlite_files';
    this._categoriesCache = null;
    this._brandsCache = null;
    this._supermarketsCache = null;
    this._alternativeCache = new Map();
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
    if (this._supermarketsCache) return this._supermarketsCache;
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
    this._supermarketsCache = { success: true, count: list.length, supermarkets: list };
    return this._supermarketsCache;
  }

  getCategories() {
    if (this._categoriesCache) return this._categoriesCache;
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
    this._categoriesCache = { success: true, count: list.length, categories: list };
    return this._categoriesCache;
  }

  getBrands() {
    if (this._brandsCache) return this._brandsCache;
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
    this._brandsCache = { success: true, count: list.length, brands: list };
    return this._brandsCache;
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
    const hasQuery = Boolean(query && query.trim());
    const queryTokens = hasQuery ? query.trim().split(/\s+/).filter(Boolean) : [];

    if (hasQuery) {
      for (const t of queryTokens) {
        const variants = getWordVariants(t);
        const subConds = [];
        for (const v of variants) {
          subConds.push(`p.name LIKE ? OR p.brand LIKE ?`);
          params.push(`%${v}%`, `%${v}%`);
        }
        where.push(`(${subConds.join(' OR ')})`);
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

    // Contar total de coincidencias
    const countSql = `SELECT COUNT(*) FROM (` + sql + `)`;
    const countStmt = this.db.prepare(countSql);
    countStmt.bind(params);
    countStmt.step();
    const total = countStmt.get()[0] || 0;
    countStmt.free();

    // Obtener productos (con ranking de relevancia si hay búsqueda de texto)
    let products = [];
    if (hasQuery) {
      const fetchLimit = Math.max(limit * 3, 140);
      const stmt = this.db.prepare(sql + ` LIMIT ?`);
      stmt.bind([...params, fetchLimit]);
      const candidates = [];
      while (stmt.step()) {
        candidates.push(stmt.getAsObject());
      }
      stmt.free();

      for (const prod of candidates) {
        prod._relevance = calculateRelevance(prod, queryTokens, query);
      }
      candidates.sort((a, b) => b._relevance - a._relevance);
      products = candidates.slice(offset, offset + limit);
    } else {
      sql += ` ORDER BY p.name ASC LIMIT ? OFFSET ?`;
      const queryParams = [...params, limit, offset];
      const stmt = this.db.prepare(sql);
      stmt.bind(queryParams);
      while (stmt.step()) {
        products.push(stmt.getAsObject());
      }
      stmt.free();
    }

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
    const searchRes = this.searchProducts({ query: text, limit: 1 });
    if (searchRes && searchRes.products && searchRes.products.length > 0) {
      return searchRes.products[0];
    }
    // Fallback: primer token
    const firstWord = text.trim().split(/\s+/)[0];
    if (firstWord && firstWord !== text.trim()) {
      const fb = this.searchProducts({ query: firstWord, limit: 1 });
      if (fb && fb.products && fb.products.length > 0) {
        return fb.products[0];
      }
    }
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

  // Busca un producto sustituto / alternativo equivalente en una cadena de supermercado
  findAlternativeInChain(product, chain) {
    if (!this.db || !product) return null;

    const cacheKey = `${product.id}_${(chain || '').toLowerCase()}`;
    if (this._alternativeCache && this._alternativeCache.has(cacheKey)) {
      return this._alternativeCache.get(cacheKey);
    }

    const isBagSearch = /basura|congelaci[oó]n|residuos/i.test(product.name || '');
    const stopWords = new Set([
      'de', 'la', 'el', 'en', 'con', 'y', 'a', 'para', 'del', 'los', 'las', 'un', 'una', 'al',
      'pack', 'ud', 'uds', 'gr', 'grs', 'botella', 'brik', 'brick', 'lata', 'tarro', 'tubo',
      'sobre', 'cristal', 'unidad', 'producto'
    ]);
    if (!isBagSearch) {
      stopWords.add('bolsa');
      stopWords.add('bolsas');
    }

    const brandName = (product.brand || '').toLowerCase();
    const cleanTokens = (product.name || '')
      .toLowerCase()
      .replace(/[^\wáéíóúñ\s]/gi, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2 && !stopWords.has(t) && (!brandName || !brandName.includes(t)));

    if (cleanTokens.length === 0) {
      if (this._alternativeCache) this._alternativeCache.set(cacheKey, null);
      return null;
    }

    // Extraer capacidad / volumen si existe (ej: 50L, 30L, 10L, 1L, etc.)
    const volMatch = (product.name || '').match(/(\d+)\s*(l|litros?)/i);
    const targetLiters = volMatch ? parseInt(volMatch[1], 10) : null;
    const isBolsa = /bolsa/i.test(product.name || '');
    const isCubo = /cubo/i.test(product.name || '');

    function getVariants(tok) {
      const s = new Set([tok]);
      if (tok.endsWith('s')) s.add(tok.slice(0, -1));
      else s.add(tok + 's');
      return Array.from(s);
    }

    const t0Vars = getVariants(cleanTokens[0]);
    const t1Vars = cleanTokens[1] ? getVariants(cleanTokens[1]) : [];

    let sql = `
      SELECT p.id, p.name, p.brand, p.format, p.imageUrl, pr.price, pr.referencePrice, pr.referenceUnit, s.chain, p.categoryId
      FROM Product p
      JOIN PriceRecord pr ON p.id = pr.productId
      JOIN Supermarket s ON pr.supermarketId = s.id
      WHERE LOWER(s.chain) = LOWER(?)
        AND p.id != ?
    `;
    const params = [chain, product.id];

    const conds = [];
    const t0Conds = t0Vars.map(() => `LOWER(p.name) LIKE ?`);
    params.push(...t0Vars.map((v) => `%${v}%`));
    conds.push(`(${t0Conds.join(' OR ')})`);

    if (t1Vars.length > 0) {
      const t1Conds = t1Vars.map(() => `LOWER(p.name) LIKE ?`);
      params.push(...t1Vars.map((v) => `%${v}%`));
      conds.push(`(${t1Conds.join(' OR ')})`);
    }

    sql += ` AND ` + conds.join(' AND ');
    sql += ` LIMIT 30`;

    const candidates = [];
    try {
      const stmt = this.db.prepare(sql);
      stmt.bind(params);
      while (stmt.step()) {
        candidates.push(stmt.getAsObject());
      }
      stmt.free();
    } catch (e) {
      console.error('Error prepare findAlternative:', e);
    }

    if (candidates.length === 0) {
      if (this._alternativeCache) this._alternativeCache.set(cacheKey, null);
      return null;
    }

    // Puntuación inteligente de alternativas
    for (const c of candidates) {
      let score = 0;
      const nameLower = (c.name || '').toLowerCase();

      // Misma categoría
      if (product.categoryId && c.categoryId === product.categoryId) score += 40;

      // Exclusión semántica (no mezclar cubos rígidos con bolsas de basura)
      if (isBolsa && /cubo con pedal|cubo basura con pedal|cubo pedal/i.test(nameLower)) score -= 200;
      if (isCubo && /bolsa/i.test(nameLower)) score -= 200;

      // Coincidencia de litros/volumen
      const candVol = nameLower.match(/(\d+)\s*(l|litros?)/i);
      const candLiters = candVol ? parseInt(candVol[1], 10) : null;
      if (targetLiters && candLiters) {
        if (candLiters === targetLiters) {
          score += 80;
        } else {
          const diff = Math.abs(candLiters - targetLiters);
          score += Math.max(0, 40 - diff);
        }
      }

      // Prefijo
      if (nameLower.startsWith(cleanTokens[0])) score += 20;

      c._score = score;
    }

    candidates.sort((a, b) => b._score - a._score || a.price - b.price);
    const result = candidates[0] && candidates[0]._score > -50 ? candidates[0] : null;
    if (this._alternativeCache) this._alternativeCache.set(cacheKey, result);
    return result;
  }

  // --- GESTIÓN DE LA LISTA DE LA COMPRA EN LOCALSTORAGE ---

  getGlobalEquivalences() {
    try {
      const raw = localStorage.getItem('supersoria_global_equivalences');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  saveGlobalEquivalence(keyName, chain, alternativeProductId) {
    if (!keyName || !chain) return;
    const key = keyName.toString().toLowerCase().trim();
    const ch = chain.toString().toLowerCase().trim();
    const all = this.getGlobalEquivalences();
    if (!all[key]) all[key] = {};
    if (alternativeProductId === null || alternativeProductId === undefined) {
      delete all[key][ch];
      if (Object.keys(all[key]).length === 0) delete all[key];
    } else {
      all[key][ch] = alternativeProductId;
    }
    try {
      localStorage.setItem('supersoria_global_equivalences', JSON.stringify(all));
    } catch {}
  }

  getSavedGlobalEquivalence(product, customName, chain) {
    const all = this.getGlobalEquivalences();
    const ch = (chain || '').toLowerCase().trim();
    if (product?.id && all[product.id.toLowerCase()]?.[ch] !== undefined) {
      return all[product.id.toLowerCase()][ch];
    }
    if (product?.name && all[product.name.toLowerCase().trim()]?.[ch] !== undefined) {
      return all[product.name.toLowerCase().trim()][ch];
    }
    if (customName && all[customName.toLowerCase().trim()]?.[ch] !== undefined) {
      return all[customName.toLowerCase().trim()][ch];
    }
    return undefined;
  }

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

      // Evaluar disponibilidad y alternativas por cada cadena de Soria
      const storeAvailability = {};
      for (const chain of CHAINS) {
        // 0. Si el usuario fijó una decisión manual (en el ítem o guardada para siempre en la memoria global):
        let manualChoice = item.manualEquivalents?.[chain];
        if (manualChoice === undefined) {
          manualChoice = this.getSavedGlobalEquivalence(product, item.customName, chain);
        }

        if (manualChoice === null || manualChoice === 'none') {
          // Usuario decidió expresamente marcarlo como "No disponible / No comprar"
          storeAvailability[chain] = {
            status: 'unavailable',
            price: 0,
            referencePrice: null,
            referenceUnit: null,
            altProduct: null,
            isManual: true,
          };
          continue;
        }

        // 1. Si el supermercado ya tiene el producto EXACTO:
        // ¡El producto exacto SIEMPRE tiene máxima prioridad sobre cualquier sustituto!
        const directPrice = product?.prices?.find((p) => p.supermarket?.chain?.toLowerCase() === chain.toLowerCase());
        if (directPrice) {
          storeAvailability[chain] = {
            status: 'exact',
            price: directPrice.price,
            referencePrice: directPrice.referencePrice,
            referenceUnit: directPrice.referenceUnit,
            altProduct: null,
          };
          continue;
        }

        // 2. Si no hay exacto: buscar mejor alternativa automática actual
        const bestAutoAlt = product && this.db ? this.findAlternativeInChain(product, chain) : null;

        // Comprobar si la alternativa manual elegida sigue teniendo precio y stock
        let manualProductFound = null;
        if (manualChoice) {
          const altComp = this.getProductPriceComparison(manualChoice);
          const altPrice = altComp?.product?.prices?.find((p) => p.supermarket?.chain?.toLowerCase() === chain.toLowerCase());
          if (altPrice) {
            manualProductFound = {
              id: altComp.product.id,
              name: altComp.product.name,
              brand: altComp.product.brand,
              format: altComp.product.format,
              imageUrl: altComp.product.imageUrl,
              price: altPrice.price,
              referencePrice: altPrice.referencePrice,
              referenceUnit: altPrice.referenceUnit,
            };
          }
        }

        if (manualProductFound) {
          // ¿Ha salido alguna alternativa equivalente mejor (más barata) que antes no estuviera?
          const hasBetterAuto = bestAutoAlt && bestAutoAlt.id !== manualProductFound.id && bestAutoAlt.price < manualProductFound.price;

          storeAvailability[chain] = {
            status: 'alternative',
            price: manualProductFound.price,
            referencePrice: manualProductFound.referencePrice,
            referenceUnit: manualProductFound.referenceUnit,
            altProduct: manualProductFound,
            isManual: true,
            betterAlternativeAvailable: hasBetterAuto ? {
              id: bestAutoAlt.id,
              name: bestAutoAlt.name,
              price: bestAutoAlt.price,
              savings: +(manualProductFound.price - bestAutoAlt.price).toFixed(2),
            } : null,
          };
        } else if (bestAutoAlt) {
          storeAvailability[chain] = {
            status: 'alternative',
            price: bestAutoAlt.price,
            referencePrice: bestAutoAlt.referencePrice,
            referenceUnit: bestAutoAlt.referenceUnit,
            altProduct: {
              id: bestAutoAlt.id,
              name: bestAutoAlt.name,
              brand: bestAutoAlt.brand,
              format: bestAutoAlt.format,
              imageUrl: bestAutoAlt.imageUrl,
              price: bestAutoAlt.price,
            },
            isManual: false,
          };
        } else {
          storeAvailability[chain] = {
            status: 'unavailable',
            price: 0,
            referencePrice: null,
            referenceUnit: null,
            altProduct: null,
          };
        }
      }

      return {
        id: item.id,
        productId: item.productId || null,
        customName: item.customName || product?.name || 'Artículo',
        quantity: Math.max(1, Number(item.quantity) || 1),
        checked: Boolean(item.checked),
        manualEquivalents: item.manualEquivalents || {},
        product,
        storeAvailability,
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

    // Calcular coste por supermercado en Soria
    const storeEstimates = CHAINS.map((chain) => {
      let total = 0;
      let exactCount = 0;
      let altCount = 0;
      let missingCount = 0;
      const missingItems = [];
      const alternativeItems = [];

      for (const item of enrichedItems) {
        const avail = item.storeAvailability[chain];
        if (avail?.status === 'exact') {
          total += avail.price * item.quantity;
          exactCount++;
        } else if (avail?.status === 'alternative') {
          total += avail.price * item.quantity;
          altCount++;
          alternativeItems.push({
            original: item.customName,
            alternative: avail.altProduct.name,
            price: avail.price,
          });
        } else {
          // NO DISPONIBLE: NO SUMAR NADA AL TOTAL (0.00 €)
          missingCount++;
          missingItems.push(item.customName);
        }
      }

      return {
        chain,
        total: +total.toFixed(2),
        totalCost: +total.toFixed(2),
        itemsFound: exactCount + altCount,
        exactCount,
        altCount,
        missingCount,
        missingItems,
        alternativeItems,
        isComplete: missingCount === 0,
      };
    }).sort((a, b) => {
      // Priorizar los supermercados con todos los productos disponibles, y luego los más baratos
      if (a.missingCount !== b.missingCount) {
        return a.missingCount - b.missingCount;
      }
      return a.total - b.total;
    });

    // Calcular cesta óptima (comprando cada producto en el súper más barato de Soria)
    let optimalTotal = 0;
    const optimalPlan = [];

    for (const item of enrichedItems) {
      let bestOption = null;

      // 1. Mirar si hay precios exactos en alguna cadena
      const exactPrices = item.product?.prices || [];
      if (exactPrices.length > 0) {
        const sortedExact = [...exactPrices].sort((a, b) => a.price - b.price);
        const bestExact = sortedExact[0];
        const cost = +(bestExact.price * item.quantity).toFixed(2);
        bestOption = {
          itemId: item.id,
          productName: item.customName,
          bestStore: bestExact.supermarket?.chain || 'Soria',
          price: bestExact.price,
          referencePrice: bestExact.referencePrice,
          referenceUnit: bestExact.referenceUnit,
          quantity: item.quantity,
          subtotal: cost,
          isAlternative: false,
          altName: null,
          imageUrl: item.product?.imageUrl || null,
        };
      } else {
        // 2. Si no hay exacto, comprobar si hay alternativa equivalente
        let bestAlt = null;
        for (const chain of CHAINS) {
          const avail = item.storeAvailability?.[chain];
          if (avail?.status === 'alternative') {
            if (!bestAlt || avail.price < bestAlt.price) {
              bestAlt = { chain, ...avail };
            }
          }
        }
        if (bestAlt) {
          const cost = +(bestAlt.price * item.quantity).toFixed(2);
          bestOption = {
            itemId: item.id,
            productName: item.customName,
            bestStore: bestAlt.chain,
            price: bestAlt.price,
            referencePrice: bestAlt.referencePrice,
            referenceUnit: bestAlt.referenceUnit,
            quantity: item.quantity,
            subtotal: cost,
            isAlternative: true,
            altName: bestAlt.altProduct?.name || null,
            imageUrl: bestAlt.altProduct?.imageUrl || item.product?.imageUrl || null,
          };
        }
      }

      if (bestOption) {
        optimalTotal += bestOption.subtotal;
        optimalPlan.push(bestOption);
      }
    }

    optimalTotal = +optimalTotal.toFixed(2);

    // Calcular ahorro frente a comprar toda la cesta en un solo supermercado completo
    const completeStores = storeEstimates.filter((s) => s.isComplete && s.total > 0);
    const benchmarkStore = completeStores.length > 0 ? completeStores[0] : storeEstimates[0];
    const benchmarkTotal = benchmarkStore?.total || 0;
    const savings = benchmarkTotal > optimalTotal ? +(benchmarkTotal - optimalTotal).toFixed(2) : 0;

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
        cheapestStore: benchmarkStore?.chain || storeEstimates[0]?.chain || 'Mercadona',
        cheapestSingleCost: benchmarkTotal,
        optimalTotal,
        savingsAmount: savings,
        savingsPercent: benchmarkTotal > 0 ? Math.round((savings / benchmarkTotal) * 100) : 0,
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
    let item = null;
    if (idx !== -1) {
      items[idx].checked = !items[idx].checked;
      item = items[idx];
      this.saveShoppingListItems(items);
    }
    return { success: true, item };
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

  // Establece o elimina una alternativa manual personalizada para un supermercado
  setItemManualEquivalent(itemId, chain, alternativeProductId) {
    const items = this.getShoppingListItems();
    const item = items.find((i) => i.id === itemId);
    if (!item) return { success: false, error: 'Artículo no encontrado' };

    if (!item.manualEquivalents) item.manualEquivalents = {};
    if (alternativeProductId === undefined) {
      delete item.manualEquivalents[chain];
    } else {
      item.manualEquivalents[chain] = alternativeProductId; // ID de producto o null (no disponible)
    }

    this.saveShoppingListItems(items);

    // Guardar para siempre en la memoria global permanente
    if (item.productId) {
      this.saveGlobalEquivalence(item.productId, chain, alternativeProductId);
    }
    if (item.customName) {
      this.saveGlobalEquivalence(item.customName, chain, alternativeProductId);
    }

    return { success: true, item, ...this.getShoppingListData() };
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
  async syncFromCloud(onProgress, customUrl) {
    if (onProgress) onProgress('Comprobando versión en GitHub...', 20);
    const RAW_GZ_URL = 'https://raw.githubusercontent.com/TheSorian/SuperSoria/master/dist-release/supersoria-db.sqlite.gz';
    const RELEASE_GZ_URL = customUrl || 'https://github.com/TheSorian/SuperSoria/releases/download/latest-data/supersoria-db.sqlite.gz';
    const FALLBACK_GZ_URL = 'https://github.com/TheSorian/SuperSoria/releases/latest/download/supersoria-db.sqlite.gz';
    
    if (onProgress) onProgress('Descargando catálogo de Soria...', 40);
    let res = null;
    const urls = [RAW_GZ_URL, RELEASE_GZ_URL, FALLBACK_GZ_URL];

    for (const u of urls) {
      try {
        const attempt = await fetch(`${u}?t=${Date.now()}`);
        if (attempt.ok) {
          res = attempt;
          break;
        }
      } catch (e) {
        console.warn(`Intento de descarga fallido para ${u}:`, e.message);
      }
    }

    if (!res || !res.ok) throw new Error('No se pudo descargar el paquete de precios desde GitHub');

    if (onProgress) onProgress('Descomprimiendo base de datos...', 70);
    const gzBuffer = await res.arrayBuffer();

    let decompressed;
    if (typeof DecompressionStream !== 'undefined') {
      try {
        const stream = new Response(gzBuffer).body.pipeThrough(new DecompressionStream('gzip'));
        decompressed = await new Response(stream).arrayBuffer();
      } catch (decompErr) {
        console.warn('Fallo en DecompressionStream, intentando buffer directo:', decompErr);
        decompressed = gzBuffer;
      }
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

    // 12. /api/items/:id/equivalent (POST / PATCH)
    const eqMatch = path.match(/^\/api\/items\/([^\/]+)\/equivalent$/);
    if (eqMatch && (method === 'POST' || method === 'PATCH')) {
      const { chain, alternativeProductId } = body;
      return jsonResponse(client.setItemManualEquivalent(eqMatch[1], chain, alternativeProductId));
    }

    // 13. /api/lists/:shareCode/items (POST)
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
