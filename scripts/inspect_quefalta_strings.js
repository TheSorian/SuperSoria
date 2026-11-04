const fs = require('fs');
const strings = JSON.parse(fs.readFileSync('C:\\Users\\gsmsa\\.gemini\\antigravity\\brain\\46384c45-6974-4979-82ae-c48c050f2a75\\scratch\\extracted_strings.json', 'utf8'));

console.log('Total strings:', strings.length);

const tabMatches = strings.filter(s => typeof s === 'string' && (
  s.includes('Lista') || s.includes('Compar') || s.includes('Super') || s.includes('Buscar') || s.includes('Ajustes') || s.includes('Carrito') || s.includes('Total') || s.includes('Ahorro')
));

console.log('Sample tab/feature strings:');
console.log(Array.from(new Set(tabMatches)).slice(0, 40));
