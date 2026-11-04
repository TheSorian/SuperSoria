import * as cheerio from 'cheerio';

const headers = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9',
};

async function testLupaSearch(query: string) {
  const url = `https://www.lupaonline.com/santander/catalogsearch/result/?q=${encodeURIComponent(query)}`;
  console.log('Fetching Lupa online:', url);
  const res = await fetch(url, { headers });
  console.log('Lupa Status:', res.status);
  const html = await res.text();
  const $ = cheerio.load(html);

  const items: any[] = [];
  $('.product-item-info').each((_i, el) => {
    const name = $(el).find('.product-item-link').text().trim();
    const priceText = $(el).find('[data-price-type="finalPrice"] .price, .price').first().text().trim();
    const img = $(el).find('.product-image-photo').attr('src');
    if (name) {
      items.push({ name, price: priceText, img });
    }
  });

  console.log(`✅ ¡Encontrados ${items.length} productos reales en Lupa!`);
  items.slice(0, 8).forEach((it) => {
    console.log(` - ${it.name} => ${it.price}`);
  });
}

testLupaSearch('leche').catch(console.error);
