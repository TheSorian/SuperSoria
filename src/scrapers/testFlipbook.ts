async function inspectFlipbook() {
  const url = 'https://folletos.e-leclerc.es/eleclerc-spain/2026/nacional/multiofertas/folleto-eleclerc-noviembre-2026/';
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'
    }
  });
  const html = await res.text();
  // Look for product hot spots or price items in flipbook
  const matches = html.match(/class="[^"]*price[^"]*"[^>]*>[^<]+/gi);
  console.log('Price elements:', matches?.slice(0, 5));

  const jsonInScript = html.match(/var\s+[a-zA-Z0-9_]+\s*=\s*(\[[^;]+\]|{[^;]+});/g);
  console.log('Scripts variables count:', jsonInScript?.length);

  // Check for .json file requests
  const jsonUrls = html.match(/https?:\/\/[^"'\s]+\.json/gi);
  console.log('JSON URLs:', jsonUrls);
}

inspectFlipbook().catch(console.error);
