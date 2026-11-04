import * as cheerio from 'cheerio';

async function testListaCompraLeclerc() {
  const url = 'https://e-leclerc.es/lista-de-la-compra/';
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  console.log('Heading:', $('h1, h2').text());
  console.log('Body snippet:', $('body').text().slice(0, 400));
}
testListaCompraLeclerc();
