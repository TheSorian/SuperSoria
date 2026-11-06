import fs from 'fs';
import path from 'path';

const FILE_PATH = path.join(process.cwd(), 'prisma', 'global_equivalences.json');

export interface GlobalEquivalences {
  [productIdOrName: string]: {
    [chain: string]: string; // alternativeProductId o 'none'
  };
}

export function loadGlobalEquivalences(): GlobalEquivalences {
  try {
    if (!fs.existsSync(FILE_PATH)) return {};
    const raw = fs.readFileSync(FILE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveGlobalEquivalence(productIdOrName: string, chain: string, alternativeProductId: string | null | undefined): void {
  if (!productIdOrName || !chain) return;
  const key = productIdOrName.toLowerCase().trim();
  const ch = chain.toLowerCase().trim();
  const all = loadGlobalEquivalences();

  if (!all[key]) all[key] = {};
  if (alternativeProductId === null || alternativeProductId === undefined) {
    delete all[key][ch];
    if (Object.keys(all[key]).length === 0) delete all[key];
  } else {
    all[key][ch] = alternativeProductId;
  }

  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(all, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error guardando equivalencia global:', err);
  }
}

export function findGlobalEquivalence(productId: string | null | undefined, customName: string | null | undefined, chain: string): string | undefined {
  const all = loadGlobalEquivalences();
  const ch = (chain || '').toLowerCase().trim();
  if (productId && all[productId.toLowerCase()]?.[ch] !== undefined) {
    return all[productId.toLowerCase()][ch];
  }
  if (customName && all[customName.toLowerCase().trim()]?.[ch] !== undefined) {
    return all[customName.toLowerCase().trim()][ch];
  }
  return undefined;
}
