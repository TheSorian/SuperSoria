import prisma from '../src/db/prisma.js';

export async function fixCategories() {
  console.log('🧹 Ejecutando auditoría y corrección de categorías semánticas...');

  // Asegurar que existan las categorías limpieza-hogar y cuidado-personal
  const cleaningCat = await prisma.category.upsert({
    where: { id: 'limpieza-hogar' },
    update: {},
    create: {
      id: 'limpieza-hogar',
      name: 'Limpieza y Hogar',
      icon: '🧹',
      sortOrder: 11,
    },
  });

  const personalCat = await prisma.category.upsert({
    where: { id: 'cuidado-personal' },
    update: {},
    create: {
      id: 'cuidado-personal',
      name: 'Cuidado Personal e Higiene',
      icon: '🧴',
      sortOrder: 12,
    },
  });

  const cleaningKeywords = [
    'bolsa de basura', 'bolsas de basura', 'bolsa basura', 'bolsas basura', 'saco basura',
    'detergente', 'suavizante', 'lavavajillas', 'friegasuelos', 'limpiador', 'lejía', 'lejia',
    'estropajo', 'bayeta', 'fregona', 'desengrasante', 'antical', 'pastillas lavavajillas',
    'quitamanchas', 'insecticida', 'ambientador', 'papel cocina', 'aluminio', 'papel film',
  ];

  for (const kw of cleaningKeywords) {
    await prisma.product.updateMany({
      where: {
        name: { contains: kw },
        categoryId: { not: 'limpieza-hogar' },
      },
      data: {
        categoryId: 'limpieza-hogar',
      },
    });
  }

  const personalKeywords = [
    'champú', 'champu', 'gel de ducha', 'gel de baño', 'desodorante',
    'dentífrico', 'dentifrico', 'pasta de dientes', 'cepillo dental',
    'enjuague bucal', 'papel higiénico', 'papel higienico', 'toallitas',
    'compresa', 'tampon', 'tampón', 'maquinilla afeitar', 'espuma afeitar',
    'crema hidratante', 'loción corporal', 'protector solar',
  ];

  for (const kw of personalKeywords) {
    await prisma.product.updateMany({
      where: {
        name: { contains: kw },
        categoryId: { not: 'cuidado-personal' },
      },
      data: {
        categoryId: 'cuidado-personal',
      },
    });
  }

  console.log('✅ Categorías de limpieza y cuidado personal verificadas.');
}
