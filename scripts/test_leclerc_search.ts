import * as cheerio from 'cheerio';

async function searchLeclerc(query: string) {
  const url = `https://soria.e-leclerc.es/busqueda?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  
  const items: any[] = [];
  $('.articulo, [class*="articulo"], .item-product').each((_, el) => {
    const title = $(el).find('.nombre a, .title a, a[title]').text().trim() || $(el).find('a[title]').attr('title');
    const price = $(el).find('.precio, .price').text().trim();
    const href = $(el).find('a').attr('href');
    const img = $(el).find('img').attr('src');
    if (title && price) {
      items.push({ title, price: price.replace(/\s+/g, ' '), href, img });
    }
  });
  
  console.log(`\n🛒 E.Leclerc Soria: "${query}" -> ${items.length} artículos encontrados`);
  for (const it of items.slice(0, 8)) {
    console.log(`   - ${it.title} | ${it.price}`);
  }
}

async function main() {
  for (const term of ['montepinos', 'moreno saez', 'hoguera', 'malvasia', 'almazan', 'soria']) {
    await searchLeclerc(term);
  }
}

main();
