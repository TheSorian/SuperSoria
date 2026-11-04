async function testTiendeoLeclerc() {
  const url = 'https://www.tiendeo.com/soria/e-leclerc';
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    console.log('Tiendeo status:', res.status, res.url);
    const html = await res.text();
    console.log('Tiendeo HTML length:', html.length);
    const products = html.match(/"name":\s*"([^"]+)",\s*"offers":\s*{[^}]*"price":\s*"([^"]+)"/g);
    console.log('Tiendeo products found:', products?.slice(0, 5));
  } catch (e: any) {
    console.log('Error:', e.message);
  }
}
testTiendeoLeclerc();
