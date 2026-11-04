import * as cheerio from 'cheerio';

async function testFolleto() {
  const url = 'https://folletos.e-leclerc.es/eleclerc-spain/2026/nacional/multiofertas/folleto-eleclerc-noviembre-2026/';
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'
    }
  });
  console.log('Folleto status:', res.status, res.url);
  const html = await res.text();
  console.log('HTML size:', html.length);
  // Check if there are product items or viewer
  const viewer = html.match(/viewer|flipping|publitas|tiendeo|issuu|pdf|catalog/gi);
  console.log('Viewer keywords:', viewer?.slice(0, 5));

  // Check script content or json
  const jsonMatches = html.match(/{[^{}]*"title"[^{}]*}/g);
  console.log('Json matches:', jsonMatches?.slice(0, 3));
}

testFolleto().catch(console.error);
