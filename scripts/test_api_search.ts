async function test() {
  const q = 'soria';
  const url = 'http://localhost:3000/api/products?q=' + encodeURIComponent(q);
  const res = await fetch(url);
  const data = await res.json();
  console.log(`\n🔎 Búsqueda: "${q}" (Total: ${data.total})`);
  for (const item of data.products.slice(0, 10)) {
    console.log(`  * ${item.name} (${item.brand})`);
    console.log('    Precios:', item.prices.map((p: any) => `${p.supermarket.name}: ${p.price} €`).join(' | '));
  }
}

test();
