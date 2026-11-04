import * as cheerio from 'cheerio';
import { FastBatchImporter } from './fastBatchImporter.js';
import { ScrapedProduct } from './types.js';

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9',
};

// Lista de marcas habituales en supermercados españoles para extraer limpiamente
const KNOWN_BRANDS = [
  'Alteza', 'Selex', 'Crowe', 'Monder', 'Pascual', 'Danone', 'Central Lechera Asturiana',
  'Puleva', 'Carbonell', 'Koipesol', 'Coosur', 'Borges', 'Gallo', 'Barilla', 'SOS',
  'Brillante', 'La Cigala', 'Litoral', 'Luengo', 'El Maragato', 'Cidacos', 'Hero',
  'Orlando', 'Solis', 'Fruco', 'Hellmann\'s', 'Calvé', 'Heinz', 'Dulcesol', 'Bimbo',
  'Panrico', 'Ortiz', 'Gullón', 'Cuétara', 'Fontaneda', 'Lu', 'TostaRica', 'Oreo',
  'Milka', 'Nestlé', 'Valor', 'ColaCao', 'Nesquik', 'Nocilla', 'Nutella', 'Nescafé',
  'Marcilla', 'Saimaza', 'Hornimans', 'Pompadour', 'Mahou', 'San Miguel', 'Cruzcampo',
  'Heineken', 'Estrella Galicia', 'Amstel', 'Damm', 'Voll-Damm', 'Coca Cola', 'Coca-Cola',
  'Fanta', 'Sprite', 'Pepsi', 'Kas', 'Nestea', 'Aquarius', 'Red Bull', 'Monster',
  'Solán de Cabras', 'Font Vella', 'Lanjarón', 'Bezoya', 'Aquarel', 'Monte Pinos',
  'Cañada Real', 'Moreno Sáez', 'Malvasía', 'La Hoguera', 'Campofrío', 'ElPozo', 'Navidul',
  'Revilla', 'Argal', 'Palacios', 'Buitoni', 'Dr. Oetker', 'Casa Tarradellas', 'Pescanova',
  'Findus', 'Frigo', 'Magnum', 'Ariel', 'Skip', 'Dixan', 'Colon', 'Wipp', 'Fairy',
  'Mistol', 'Finish', 'Somat', 'Mimosin', 'Vernel', 'Flor', 'Scottex', 'Colhogar',
  'Renova', 'Foxy', 'Dodot', 'Evax', 'Ausonia', 'Tampax', 'Gillette', 'Wilkinson',
  'Nivea', 'Dove', 'Sanex', 'Palmolive', 'Magno', 'Heno de Pravia', 'Pantene', 'H&S',
  'Timotei', 'Fructis', 'L\'Oreal', 'Colgate', 'Oral-B', 'Signal', 'Licor del Polo',
  'Abril', 'Deleitum', 'Fini', 'Bicentury', 'Old El Paso', 'Schweppes', 'Grefusa',
  'Banderos', 'Aguinaga', 'Lipton', 'Lavazza', 'La Molisana', 'Carmencita', 'Eliges',
  'Marque Repère', 'Eco+', 'Bio Village', 'Nos Régions', 'Javer', 'Hacendado', 'Milbona',
];

function extractBrandFromName(name: string, fallbackStore: string): string {
  for (const b of KNOWN_BRANDS) {
    const reg = new RegExp(`\\b${b.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    if (reg.test(name)) {
      return b;
    }
  }

  // Si tiene formato "Nombre - Marca - Formato" (típico de E.Leclerc)
  const parts = name.split('-').map(s => s.trim());
  if (parts.length >= 2 && parts[1].length >= 3 && !/\d/.test(parts[1])) {
    return parts[1];
  }

  // Tomar la segunda palabra si la primera es un tipo genérico (Aceite, Leche, etc.)
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const firstLower = words[0].toLowerCase();
    if (['aceite', 'leche', 'queso', 'yogur', 'pan', 'arroz', 'pasta', 'vino', 'cerveza', 'cafe', 'tomate', 'agua'].includes(firstLower)) {
      if (words[1].length > 2 && !/^(de|del|en|con|la|el|los|las|y)$/i.test(words[1])) {
        return words[1];
      }
    }
  }

  return fallbackStore;
}

// ========================================================
// 1. CRAWLER E.LECLERC SORIA (https://soria.e-leclerc.es/)
// ========================================================
export async function crawlELeclercSoria(importer: FastBatchImporter): Promise<number> {
  console.log('🚀 Iniciando escaneo profundo de E.Leclerc Soria (Polígono Las Casas)...');
  const allProducts: ScrapedProduct[] = [];
  const seenIds = new Set<string>();

  const leclercCategories = [
    { code: '01', slug: 'mercado', name: 'Mercado Fresco' },
    { code: '02', slug: 'despensa', name: 'Despensa' },
    { code: '03', slug: 'refrigerados', name: 'Refrigerados y Lácteos' },
    { code: '04', slug: 'congelados', name: 'Congelados' },
    { code: '05', slug: 'dulces-y-desayuno', name: 'Dulces y Desayuno' },
    { code: '06', slug: 'bebidas', name: 'Bebidas' },
    { code: '07', slug: 'platos-preparados', name: 'Platos Preparados' },
    { code: '08', slug: 'bebes', name: 'Bebé' },
    { code: '09', slug: 'mascotas', name: 'Mascotas' },
    { code: '10', slug: 'perfumeria-y-belleza', name: 'Perfumería y Belleza' },
    { code: '11', slug: 'limpieza-y-hogar', name: 'Limpieza y Hogar' },
    { code: '12', slug: 'bazar', name: 'Bazar' },
  ];

  // A) Productos Sorianos Oficiales
  try {
    const sorianosRes = await fetch('https://soria.e-leclerc.es/sorianos', { headers: BROWSER_HEADERS });
    if (sorianosRes.ok) {
      const html = await sorianosRes.text();
      const $ = cheerio.load(html);
      $('.articulo').each((_i, el) => {
        const p = parseLeclercElement($, el, 'Productos de Soria > Alianzas Locales');
        if (p && !seenIds.has(p.externalId)) {
          seenIds.add(p.externalId);
          allProducts.push(p);
        }
      });
      console.log(`  🌾 E.Leclerc: ${allProducts.length} productos sorianos extraídos.`);
    }
  } catch (e: any) {
    console.warn('  Aviso en E.Leclerc Sorianos:', e.message);
  }

  // B) Categorías con paginación
  for (const cat of leclercCategories) {
    const catUrl = `https://soria.e-leclerc.es/categorias/${cat.slug}/${cat.code}`;
    try {
      const initRes = await fetch(catUrl, { headers: BROWSER_HEADERS });
      if (!initRes.ok) continue;

      const rawCookies = (initRes.headers as any).getSetCookie ? (initRes.headers as any).getSetCookie() : [initRes.headers.get('set-cookie') || ''];
      const cookieStr = rawCookies.map((c: string) => c.split(';')[0]).join('; ');

      const html = await initRes.text();
      const $init = cheerio.load(html);
      const filterVal = $init('#_ProductosFoodPortlet_WAR_comerzziaportletsfood_filters').val() || '';
      const idPortlet = $init('#_ProductosFoodPortlet_WAR_comerzziaportletsfood_idPortlet').val() || '';

      let catCount = 0;
      $init('.articulo').each((_i, el) => {
        const p = parseLeclercElement($init, el, cat.name);
        if (p && !seenIds.has(p.externalId)) {
          seenIds.add(p.externalId);
          allProducts.push(p);
          catCount++;
        }
      });

      // Paginación vía AJAX (páginas 1 a 6 = hasta 140 artículos por categoría)
      if (filterVal) {
        for (let pNum = 1; pNum <= 6; pNum++) {
          try {
            const params = new URLSearchParams({
              accion: 'obtenerMasproductosFood',
              pagina: String(pNum),
              tamPagina: '20',
              pathThemeRoot: '/comerzzia-sol-eleclerc-theme-0.0.1-SNAPSHOT/',
              numTotalProductosFijos: '0',
              groupName: 'Guest',
              groupSite: '/guest',
              escaparate: 'false',
              idPortlet: String(idPortlet),
              portletnamespace: '_ProductosFoodPortlet_WAR_comerzziaportletsfood_',
              locale: 'es',
              isSignedIn: 'false',
              filters: String(filterVal),
            });

            const ajaxUrl = `https://soria.e-leclerc.es/delegate/productosAjaxServletFood?${params.toString()}`;
            const ajaxRes = await fetch(ajaxUrl, {
              headers: {
                ...BROWSER_HEADERS,
                Referer: catUrl,
                Cookie: cookieStr,
                Accept: 'application/json, text/javascript, */*; q=0.01',
                'X-Requested-With': 'XMLHttpRequest',
              },
            });

            if (!ajaxRes.ok) break;
            const json: any = await ajaxRes.json();
            if (json.resultado === 'ok' && json.html) {
              const $ajax = cheerio.load(json.html);
              let addedThisPage = 0;
              $ajax('.articulo').each((_j, el) => {
                const p = parseLeclercElement($ajax, el, cat.name);
                if (p && !seenIds.has(p.externalId)) {
                  seenIds.add(p.externalId);
                  allProducts.push(p);
                  catCount++;
                  addedThisPage++;
                }
              });
              if (addedThisPage === 0) break;
            } else {
              break;
            }
          } catch {
            break;
          }
        }
      }

      console.log(`  🛒 E.Leclerc [${cat.name}]: ${catCount} productos recopilados.`);
    } catch (e: any) {
      console.warn(`  Aviso categoría E.Leclerc ${cat.slug}:`, e.message);
    }
  }

  // C) Términos populares y marcas en buscador de E.Leclerc
  const searchTerms = [
    'leche pascual', 'danone', 'hacendado', 'carbonell', 'moreno saez', 'torrezno',
    'aceite de oliva', 'huevos', 'arroz', 'pasta', 'atun', 'cerveza', 'vino ribera',
    'queso curado', 'mantequilla soria', 'pollo', 'jamon serrano', 'cafe'
  ];

  for (const term of searchTerms) {
    try {
      const searchUrl =
        'https://soria.e-leclerc.es/resultados?p_p_id=ProductosFoodPortlet_WAR_comerzziaportletsfood&p_p_lifecycle=1&p_p_state=normal&p_p_mode=view&_ProductosFoodPortlet_WAR_comerzziaportletsfood_accion=buscar&_ProductosFoodPortlet_WAR_comerzziaportletsfood_operacion=consultar';
      const body = new URLSearchParams({ textoBuscador: term, filtersBuscador: '' });
      const res = await fetch(searchUrl, {
        method: 'POST',
        headers: { ...BROWSER_HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      if (res.ok) {
        const html = await res.text();
        const $ = cheerio.load(html);
        $('.articulo').each((_i, el) => {
          const p = parseLeclercElement($, el);
          if (p && !seenIds.has(p.externalId)) {
            seenIds.add(p.externalId);
            allProducts.push(p);
          }
        });
      }
    } catch {}
  }

  console.log(`✅ E.Leclerc Soria total recolectado: ${allProducts.length} productos.`);
  const stats = await importer.saveBatch(allProducts);
  console.log(`💾 E.Leclerc importado en BD: +${stats.newPrices} precios nuevos/actualizados.`);
  return allProducts.length;
}

function parseLeclercElement($: cheerio.CheerioAPI, el: any, defaultCat?: string): ScrapedProduct | null {
  const rawName = $(el).find('.nombre a').text().trim();
  if (!rawName) return null;

  const rawPrice = $(el).find('.precio span').text().trim();
  const priceMatch = rawPrice.replace(',', '.').match(/(\d+\.?\d*)/);
  const price = priceMatch ? parseFloat(priceMatch[1]) : null;
  if (!price || isNaN(price) || price <= 0) return null;

  let brand = $(el).find('.marca').text().trim();
  if (!brand || brand.length < 2) {
    brand = extractBrandFromName(rawName, 'E.Leclerc / Marca');
  }

  const refText = $(el).find('.texto-porKilo').text().trim();
  let referencePrice: number | null = null;
  let referenceUnit: string | null = null;
  if (refText) {
    const refMatch = refText.replace(',', '.').match(/(\d+\.?\d*)\s*€\/?(\w+)?/i);
    if (refMatch) {
      referencePrice = parseFloat(refMatch[1]);
      referenceUnit = refMatch[2] || null;
    }
  }

  let img = $(el).find('img').attr('src') || null;
  if (img && !img.startsWith('http')) {
    img = `https://soria.e-leclerc.es${img}`;
  }

  let link = $(el).find('.nombre a').attr('href') || null;
  if (link && !link.startsWith('http')) {
    link = `https://soria.e-leclerc.es${link}`;
  }

  const idAttr = $(el).attr('id') || '';
  const codeMatch = idAttr.match(/_articulo_(\w+)/);
  const externalId = codeMatch ? `eleclerc-${codeMatch[1]}` : `eleclerc-${rawName.slice(0, 30).replace(/\s+/g, '_')}`;

  const isOffer = $(el).find('.wrapper-tag-ofertas, .wrap-tagger').length > 0;

  return {
    externalId,
    name: rawName,
    brand,
    format: null,
    price,
    referencePrice,
    referenceUnit,
    originalPrice: null,
    isOffer,
    inStock: true,
    imageUrl: img,
    categoryHint: defaultCat || null,
    externalUrl: link || 'https://soria.e-leclerc.es',
    supermarketId: 'eleclerc-las-casas',
  };
}

// ========================================================
// 2. CRAWLER LUPA SUPERMERCADOS (https://www.lupaonline.com/)
// ========================================================
export async function crawlLupaSupermercados(importer: FastBatchImporter): Promise<number> {
  console.log('🚀 Iniciando escaneo masivo de Lupa Supermercados (Plaza Mariano Granados)...');
  const allProducts: ScrapedProduct[] = [];
  const seenIds = new Set<string>();

  const lupaCategories = [
    // Aceites, arroz, pasta, legumbre
    'alimentacion/aceites',
    'alimentacion/arroz',
    'alimentacion/legumbre',
    'alimentacion/pasta',
    'alimentacion/mayonesas-y-salsas',
    'alimentacion/especies-sal-vinagre',
    'alimentacion/sopas-y-caldos',
    'alimentacion/reposteria-y-rebozados',
    'alimentacion/aperitivos',
    'alimentacion/frutos-secos',
    // Conservas
    'conservas/pescado',
    'conservas/vegetales',
    'conservas/carne',
    'conservas/pates',
    'conservas/platos-preparados',
    // Lácteos y huevos
    'lacteos-y-huevos/huevos',
    'lacteos-y-huevos/leche-liquida',
    'lacteos-y-huevos/batidos-y-horchatas',
    'lacteos-y-huevos/yogures',
    'lacteos-y-huevos/postres-refrigerados',
    'lacteos-y-huevos/margarina-y-mantequilla',
    'lacteos-y-huevos/nata',
    // Desayuno
    'desayuno-y-bolleria/azucar-y-derivados',
    'desayuno-y-bolleria/bolleria',
    'desayuno-y-bolleria/cacao-y-cremas',
    'desayuno-y-bolleria/cafe',
    'desayuno-y-bolleria/infusiones',
    'desayuno-y-bolleria/cereales',
    'desayuno-y-bolleria/chocolate',
    'desayuno-y-bolleria/galletas',
    'desayuno-y-bolleria/pan-de-molde',
    'desayuno-y-bolleria/pan-precocinado',
    'desayuno-y-bolleria/pan-tostado',
    // Bebidas
    'bebidas-alcoholicas/aguas',
    'bebidas-alcoholicas/refrescos',
    'bebidas-alcoholicas/zumos-y-mostos',
    'bebidas-alcoholicas/cervezas',
    'bebidas-alcoholicas/vinos',
    'bebidas-alcoholicas/cavas-y-sidras',
    // Quesos y embutidos
    'quesos/fresco',
    'quesos/fundidos',
    'quesos/nacional',
    'charcuteria/curados',
    'charcuteria/cocidos',
    'charcuteria/fiambres',
    // Carnicería
    'carniceria/vacuno',
    'carniceria/porcino',
    'carniceria/aves-y-caza',
    'carniceria/elaborados',
    // Fruta y verdura
    'fruteria/frutas',
    'fruteria/verduras',
    // Congelados
    'congelado/pescados',
    'congelado/mariscos',
    'congelado/verduras',
    'congelado/precocinados',
    'congelado/helados',
    // Limpieza e higiene
    'drogueria/cuidado-de-la-ropa',
    'drogueria/vajilla-y-cocina',
    'drogueria/limpieza-hogar',
    'drogueria/celulosas',
    'perfumeria-e-higiene/cuidado-del-cabello',
    'perfumeria-e-higiene/higiene-corporal',
    'perfumeria-e-higiene/higiene-bucal',
    'perfumeria-e-higiene/desodorantes',
  ];

  for (const catSlug of lupaCategories) {
    const url = `https://www.lupaonline.com/santander/${catSlug}`;
    try {
      const res = await fetch(url, { headers: BROWSER_HEADERS });
      if (!res.ok) continue;

      const html = await res.text();
      const $ = cheerio.load(html);
      let catCount = 0;

      $('.product-item-info').each((_i, el) => {
        const name = $(el).find('.product-item-link').text().trim();
        const priceRaw = $(el).find('[data-price-type="finalPrice"] .price, .price').first().text().trim();
        const priceNum = parseFloat(priceRaw.replace('€', '').replace(',', '.').trim());
        const img = $(el).find('.product-image-photo').attr('src') || null;
        const link = $(el).find('.product-item-link').attr('href') || null;

        if (name && !isNaN(priceNum) && priceNum > 0) {
          const brand = extractBrandFromName(name, 'Alteza / Lupa');
          const extId = `lupa-${link ? link.split('/').filter(Boolean).pop() : name.slice(0, 30).replace(/\s+/g, '_')}`;

          if (!seenIds.has(extId)) {
            seenIds.add(extId);
            allProducts.push({
              externalId: extId,
              name,
              brand,
              format: null,
              price: priceNum,
              referencePrice: null,
              referenceUnit: null,
              originalPrice: null,
              isOffer: false,
              inStock: true,
              imageUrl: img,
              categoryHint: catSlug.split('/')[0],
              externalUrl: link || 'https://www.lupaonline.com',
              supermarketId: 'lupa-granados',
            });
            catCount++;
          }
        }
      });

      console.log(`  🐺 Lupa [${catSlug}]: +${catCount} productos.`);
    } catch (e: any) {
      console.warn(`  Aviso Lupa ${catSlug}:`, e.message);
    }
  }

  console.log(`✅ Lupa Supermercados total recolectado: ${allProducts.length} productos.`);
  const stats = await importer.saveBatch(allProducts);
  console.log(`💾 Lupa importado en BD: +${stats.newPrices} precios nuevos/actualizados.`);
  return allProducts.length;
}

// Función principal ejecutable
export async function expandBoth() {
  const t0 = Date.now();
  console.log('⚡ Iniciando expansión masiva de catálogos para E.Leclerc Soria y Lupa Granados...');
  const importer = new FastBatchImporter();
  await importer.init();

  const leclercCount = await crawlELeclercSoria(importer);
  const lupaCount = await crawlLupaSupermercados(importer);

  console.log(`🎉 Expansión completada con éxito en ${((Date.now() - t0) / 1000).toFixed(1)}s:`);
  console.log(`   - E.Leclerc Soria: ${leclercCount} productos`);
  console.log(`   - Lupa Supermercados: ${lupaCount} productos`);
}
