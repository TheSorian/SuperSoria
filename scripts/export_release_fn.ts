import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import crypto from 'crypto';
import prisma from '../src/db/prisma.js';

export async function exportRelease() {
  console.log('📦 Preparando paquete de base de datos para release...');
  const outDir = path.join(process.cwd(), 'dist-release');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Base de datos no encontrada en ${dbPath}`);
  }

  // Asegurar índices de rendimiento y actualizar estadísticas de SQLite
  try {
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PriceRecord_prod_super_idx" ON "PriceRecord"("productId", "supermarketId", "price")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Product_brand_idx" ON "Product"("brand")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PriceRecord_super_idx" ON "PriceRecord"("supermarketId", "price")`);
    await prisma.$executeRawUnsafe(`ANALYZE`);
  } catch (idxErr) {
    console.warn('Aviso al optimizar índices SQLite:', idxErr);
  }

  // 1. Obtener estadísticas de la base de datos
  const [totalProducts, totalPriceRecords, supermarkets] = await Promise.all([
    prisma.product.count(),
    prisma.priceRecord.count(),
    prisma.supermarket.findMany(),
  ]);

  const superBreakdown: Record<string, number> = {};
  for (const s of supermarkets) {
    superBreakdown[s.name] = await prisma.priceRecord.count({ where: { supermarketId: s.id } });
  }

  const rawSize = fs.statSync(dbPath).size;
  console.log(`- Tamaño original: ${(rawSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`- Productos: ${totalProducts}`);
  console.log(`- Precios registrados: ${totalPriceRecords}`);

  // 2. Comprimir a .gz
  const gzPath = path.join(outDir, 'supersoria-db.sqlite.gz');
  console.log(`- Comprimiendo a ${gzPath}...`);

  await new Promise<void>((resolve, reject) => {
    const src = fs.createReadStream(dbPath);
    const dest = fs.createWriteStream(gzPath);
    const gzip = zlib.createGzip({ level: 9 });

    src.pipe(gzip).pipe(dest);
    dest.on('finish', () => resolve());
    dest.on('error', reject);
  });

  const gzSize = fs.statSync(gzPath).size;
  console.log(`✅ Comprimido con éxito: ${(gzSize / 1024 / 1024).toFixed(2)} MB (-${Math.round((1 - gzSize / rawSize) * 100)}% de reducción)`);

  // 3. Calcular hash SHA256
  const hash = crypto.createHash('sha256');
  const gzBuffer = fs.readFileSync(gzPath);
  hash.update(gzBuffer);
  const sha256 = hash.digest('hex');

  // 4. Generar metadata.json
  const metadata = {
    appName: 'SuperSoria',
    version: '1.2.7',
    generatedAt: new Date().toISOString(),
    sha256,
    fileSizeCompressedBytes: gzSize,
    fileSizeCompressedMB: Number((gzSize / 1024 / 1024).toFixed(2)),
    fileSizeUncompressedMB: Number((rawSize / 1024 / 1024).toFixed(2)),
    stats: {
      totalProducts,
      totalPriceRecords,
      supermarkets: superBreakdown,
    },
    downloadUrl: 'https://raw.githubusercontent.com/TheSorian/SuperSoria/master/dist-release/supersoria-db.sqlite.gz',
  };

  const metaPath = path.join(outDir, 'metadata.json');
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');
  console.log(`✅ Metadatos guardados en ${metaPath}`);

  // 5. Copiar también a public/assets para empaquetado directo local
  const pubAssetPath = path.join(process.cwd(), 'public', 'assets', 'supersoria.db');
  fs.mkdirSync(path.dirname(pubAssetPath), { recursive: true });
  fs.copyFileSync(dbPath, pubAssetPath);
  console.log(`✅ Copia actualizada en ${pubAssetPath}`);
}
