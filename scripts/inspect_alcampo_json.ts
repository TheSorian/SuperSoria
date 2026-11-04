import * as cheerio from 'cheerio';

async function inspectAlcampoJson() {
  const url = `https://www.compraonline.alcampo.es/search?q=${encodeURIComponent('cañada real')}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    },
  });
  const text = await res.text();
  const $ = cheerio.load(text);

  const nextData = $('#__NEXT_DATA__').html();
  if (nextData) {
    console.log('__NEXT_DATA__ found! Length:', nextData.length);
    try {
      const parsed = JSON.parse(nextData);
      console.log('Props keys:', Object.keys(parsed.props?.pageProps || {}));
      console.log('Initial state snippet:', JSON.stringify(parsed.props?.pageProps).slice(0, 500));
    } catch (e: any) {
      console.error(e);
    }
  } else {
    console.log('__NEXT_DATA__ not found. Checking script tags...');
    $('script').each((_i, el) => {
      const src = $(el).attr('src') || '';
      const content = $(el).html() || '';
      if (content.includes('canada') || content.includes('products') || content.includes('api')) {
        console.log('Script content snippet:', content.slice(0, 200));
      }
    });
  }
}

inspectAlcampoJson();
