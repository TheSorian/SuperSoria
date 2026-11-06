import prisma from '../src/db/prisma.js';
import { classifyProduct } from '../src/scrapers/categoryClassifier.js';

export async function applyCategoryClassification() {
  console.log('🔄 Asegurando que todas las 16 categorías maestras existan en la base de datos...');

  const masterCategories = [
    { id: 'frutas-verduras', name: 'Frutas y Verduras', icon: '🍎', aisleOrder: 1 },
    { id: 'panaderia-pasteleria', name: 'Panadería y Pastelería', icon: '🥖', aisleOrder: 2 },
    { id: 'carniceria-charcuteria', name: 'Carnicería y Charcutería', icon: '🥩', aisleOrder: 3 },
    { id: 'pescaderia', name: 'Pescadería', icon: '🐟', aisleOrder: 4 },
    { id: 'lacteos-huevos', name: 'Huevos, Leche y Lácteos', icon: '🥛', aisleOrder: 5 },
    { id: 'aceite-especias-salsas', name: 'Aceite, Vinagre y Salsas', icon: '🫒', aisleOrder: 6 },
    { id: 'despensa-legumbres-arroz', name: 'Pasta, Arroz y Legumbres', icon: '🌾', aisleOrder: 7 },
    { id: 'desayuno-dulces', name: 'Café, Desayuno y Dulces', icon: '☕', aisleOrder: 8 },
    { id: 'conservas-comidas', name: 'Conservas y Platos Preparados', icon: '🥫', aisleOrder: 9 },
    { id: 'bebidas-refrescos', name: 'Agua, Refrescos y Cervezas', icon: '🥤', aisleOrder: 10 },
    { id: 'bodega-vinos', name: 'Vinos y Licores', icon: '🍷', aisleOrder: 11 },
    { id: 'congelados', name: 'Congelados', icon: '❄️', aisleOrder: 12 },
    { id: 'limpieza-hogar', name: 'Limpieza y Cuidado del Hogar', icon: '🧹', aisleOrder: 13 },
    { id: 'cuidado-personal', name: 'Cuidado Personal y Belleza', icon: '🧴', aisleOrder: 14 },
    { id: 'mascotas', name: 'Mascotas', icon: '🐾', aisleOrder: 15 },
    { id: 'hogar-bazar', name: 'Hogar, Bazar y Menaje', icon: '🏠', aisleOrder: 16 },
  ];

  for (const cat of masterCategories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: { name: cat.name, icon: cat.icon, aisleOrder: cat.aisleOrder },
      create: { id: cat.id, name: cat.name, icon: cat.icon, aisleOrder: cat.aisleOrder },
    });
  }

  console.log('🔄 Leyendo los 47.150 productos para reclasificación semántica...');
  const products = await prisma.product.findMany({
    select: { id: true, name: true, categoryId: true, brand: true },
  });

  const updates: Array<{ id: string; newCat: string }> = [];
  for (const p of products) {
    const targetCat = classifyProduct(p.name, p.brand);
    if (targetCat !== p.categoryId) {
      updates.push({ id: p.id, newCat: targetCat });
    }
  }

  console.log(`⚡ Actualizando ${updates.length} productos con su categoría real...`);

  // Ejecutar actualizaciones en lotes rápidos de 500
  const BATCH_SIZE = 500;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const chunk = updates.slice(i, i + BATCH_SIZE);
    await prisma.$transaction(
      chunk.map((item) =>
        prisma.product.update({
          where: { id: item.id },
          data: { categoryId: item.newCat },
        })
      )
    );
    if ((i + BATCH_SIZE) % 5000 === 0 || i + BATCH_SIZE >= updates.length) {
      console.log(`  - Procesados ${Math.min(i + BATCH_SIZE, updates.length)} / ${updates.length} productos...`);
    }
  }

  console.log('✅ Reclasificación masiva completada con éxito.');
}

if (process.argv[1]?.endsWith('apply_category_classification.ts')) {
  applyCategoryClassification()
    .then(() => prisma.$disconnect())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
