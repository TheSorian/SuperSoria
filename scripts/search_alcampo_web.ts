import * as cheerio from 'cheerio';

async function testAlcampoWeb() {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9',
  };

  const queries = ['canada real', 'cañada real', 'leche fresca cañada'];

  for (const q of queries) {
    const url = `https://www.compraonline.alcampo.es/search?q=${encodeURIComponent(q)}`;
    console.log(`Fetching ${url}...`);
    try {
      const res = await fetch(url, { headers });
      console.log('Status:', res.status);
      const text = await res.text();
      console.log('Length:', text.length);
      const $ = cheerio.load(text);
      console.log('Title:', $('title').text());
      console.log('Product elements count:', $('[data-test="product-card"], .product-card, [class*="product"]').length);
    } catch (e: any) {
      console.error('Error:', e.message);
    }
  }
}

testAlcampoWeb();
