import * as cheerio from 'cheerio';
import { FastBatchImporter } from '../src/scrapers/fastBatchImporter.js';
import { ScrapedProduct } from '../src/scrapers/types.js';

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9',
};

const KNOWN_BRANDS = [
  'Alteza', 'Selex', 'Crowe', 'Monder', 'Pascual', 'Danone', 'Central Lechera Asturiana',
  'Puleva', 'Carbonell', 'Koipesol', 'Coosur', 'Borges', 'Gallo', 'Barilla', 'SOS',
  'Brillante', 'La Cigala', 'Litoral', 'Luengo', 'El Maragato', 'Cidacos', 'Hero',
  'Orlando', 'Solis', 'Fruco', "Hellmann's", 'Calvé', 'Heinz', 'Dulcesol', 'Bimbo',
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
  'Timotei', 'Fructis', "L'Oreal", 'Colgate', 'Oral-B', 'Signal', 'Licor del Polo',
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

  const parts = name.split('-').map((s) => s.trim());
  if (parts.length >= 2 && parts[1].length >= 3 && !/\d/.test(parts[1])) {
    return parts[1];
  }

  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const firstLower = words[0].toLowerCase();
    if (
      [
        'aceite', 'leche', 'queso', 'yogur', 'pan', 'arroz', 'pasta', 'vino',
        'cerveza', 'cafe', 'tomate', 'agua', 'mantequilla', 'galletas',
      ].includes(firstLower)
    ) {
      if (words[1].length > 2 && !/^(de|del|en|con|la|el|los|las|y)$/i.test(words[1])) {
        return words[1];
      }
    }
  }

  return fallbackStore;
}

function parseArticulo($, el: any, defaultCat: string, storeId: string): ScrapedProduct | null {
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
    categoryHint: defaultCat,
    externalUrl: link || 'https://soria.e-leclerc.es',
    supermarketId: storeId,
  };
}

export async function main(existingImporter?: FastBatchImporter) {
  console.log('🚀 Iniciando CRAWLER COMPLETO para E.Leclerc Soria (Polígono Las Casas & Express)...');
  const importer = existingImporter || new FastBatchImporter();
  await importer.init();

  const seenIds = new Set<string>();
  let totalSavedPrices = 0;
  let totalNewProducts = 0;

  // 1. Productos Sorianos Oficiales
  console.log('\n🌾 1. Extrayendo sección oficial de Productos Sorianos...');
  try {
    const sorianosRes = await fetch('https://soria.e-leclerc.es/sorianos', { headers: BROWSER_HEADERS });
    if (sorianosRes.ok) {
      const html = await sorianosRes.text();
      const $ = cheerio.load(html);
      const sorianosBatch: ScrapedProduct[] = [];

      $('.articulo').each((_i, el) => {
        const p1 = parseArticulo($, el, 'Productos de Soria > Alianzas Locales', 'eleclerc-las-casas');
        const p2 = parseArticulo($, el, 'Productos de Soria > Alianzas Locales', 'eleclerc-express');
        if (p1 && !seenIds.has(p1.externalId)) {
          seenIds.add(p1.externalId);
          sorianosBatch.push(p1);
          if (p2) sorianosBatch.push(p2);
        }
      });

      if (sorianosBatch.length > 0) {
        const res = await importer.saveBatch(sorianosBatch);
        totalSavedPrices += res.saved;
        totalNewProducts += res.newProducts;
        console.log(`  ✅ Sorianos guardados: ${sorianosBatch.length / 2} productos (+${res.newProducts} nuevos).`);
      }
    }
  } catch (e: any) {
    console.warn('  ⚠️ Aviso en sorianos:', e.message);
  }

  // 2. Departamentos oficiales de E.Leclerc Soria
  const departments = [
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
    { code: '13', slug: 'electro', name: 'Electro' },
  ];

  for (const dep of departments) {
    console.log(`\n📦 Escaneando departamento [${dep.code}] ${dep.name}...`);
    const catUrl = `https://soria.e-leclerc.es/categorias/${dep.slug}/${dep.code}`;

    let cookieStr = '';
    let filterVal = '';
    let idPortlet = '';

    try {
      const initRes = await fetch(catUrl, { headers: BROWSER_HEADERS });
      if (!initRes.ok) {
        console.warn(`  ⚠️ Error HTTP ${initRes.status} al abrir ${dep.name}`);
        continue;
      }

      const rawCookies = (initRes.headers as any).getSetCookie
        ? (initRes.headers as any).getSetCookie()
        : [initRes.headers.get('set-cookie') || ''];
      cookieStr = rawCookies.map((c: string) => c.split(';')[0]).join('; ');

      const html = await initRes.text();
      const $init = cheerio.load(html);
      filterVal = ($init('#_ProductosFoodPortlet_WAR_comerzziaportletsfood_filters').val() as string) || '';
      idPortlet = ($init('#_ProductosFoodPortlet_WAR_comerzziaportletsfood_idPortlet').val() as string) || '';

      const depBatch: ScrapedProduct[] = [];
      let depCount = 0;

      // Artículos de la página inicial
      $init('.articulo').each((_i, el) => {
        const p1 = parseArticulo($init, el, dep.name, 'eleclerc-las-casas');
        const p2 = parseArticulo($init, el, dep.name, 'eleclerc-express');
        if (p1 && !seenIds.has(p1.externalId)) {
          seenIds.add(p1.externalId);
          depBatch.push(p1);
          if (p2) depBatch.push(p2);
          depCount++;
        }
      });

      // Paginación continua hasta el final del catálogo
      let page = 1;
      let emptyStreak = 0;

      while (page <= 150) {
        const params = new URLSearchParams({
          accion: 'obtenerMasproductosFood',
          pagina: String(page),
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
          filters: filterVal,
        });

        const ajaxUrl = `https://soria.e-leclerc.es/delegate/productosAjaxServletFood?${params.toString()}`;
        try {
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

          let json: any = null;
          try {
            json = await ajaxRes.json();
          } catch {
            break;
          }

          if (!json || !json.html || json.html.trim().length === 0) {
            break;
          }

          const $ajax = cheerio.load(json.html);
          let addedThisPage = 0;

          $ajax('.articulo').each((_j, el) => {
            const p1 = parseArticulo($ajax, el, dep.name, 'eleclerc-las-casas');
            const p2 = parseArticulo($ajax, el, dep.name, 'eleclerc-express');
            if (p1 && !seenIds.has(p1.externalId)) {
              seenIds.add(p1.externalId);
              depBatch.push(p1);
              if (p2) depBatch.push(p2);
              depCount++;
              addedThisPage++;
            }
          });

          if (addedThisPage === 0) {
            emptyStreak++;
            if (emptyStreak >= 2) break;
          } else {
            emptyStreak = 0;
          }

          page++;
          await new Promise((r) => setTimeout(r, 70));
        } catch (err: any) {
          console.warn(`    Aviso en paginación página ${page}:`, err.message);
          break;
        }
      }

      console.log(`  🎯 [${dep.name}]: ${depCount} productos únicos recolectados (${page - 1} páginas consultadas).`);

      if (depBatch.length > 0) {
        const res = await importer.saveBatch(depBatch);
        totalSavedPrices += res.saved;
        totalNewProducts += res.newProducts;
        console.log(`  💾 Guardado en BD: +${res.newProducts} productos nuevos, ${res.saved} registros de precio.`);
      }
    } catch (catErr: any) {
      console.warn(`  ❌ Error en departamento ${dep.name}:`, catErr.message);
    }
  }

  console.log('\n======================================================');
  console.log(`🎉 ESCANEO COMPLETO DE E.LECLERC SORIA FINALIZADO!`);
  console.log(`Total productos únicos escaneados: ${seenIds.size}`);
  console.log(`Nuevos productos añadidos al catálogo: +${totalNewProducts}`);
  console.log(`Precios guardados / actualizados: ${totalSavedPrices}`);
  console.log('======================================================\n');
}
