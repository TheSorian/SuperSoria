import * as cheerio from 'cheerio';

async function testLeclerc() {
  const urls = [
    'https://e-leclerc.es/soria',
    'https://e-leclerc.es/soria/folletos/',
    'https://e-leclerc.es/lista-de-la-compra/',
    'https://e-leclerc.es/tu-tienda/'
  ];

  for (const u of urls) {
    try {
      const res = await fetch(u, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'
        }
      });
      console.log(u, '=> Status:', res.status);
      const html = await res.text();
      const $ = cheerio.load(html);
      console.log('Title:', $('title').text().trim());

      // Check for links to folletos or drive
      const links: string[] = [];
      $('a').each((_i, el) => {
        const href = $(el).attr('href');
        if (href && (href.includes('drive') || href.includes('folleto') || href.includes('compra') || href.includes('oferta'))) {
          links.push(href);
        }
      });
      console.log('Interesting links:', Array.from(new Set(links)));
    } catch (e: any) {
      console.log(u, 'Error:', e.message);
    }
  }
}

testLeclerc().catch(console.error);
