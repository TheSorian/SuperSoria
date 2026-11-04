import prisma from './prisma.js';

export async function seedDatabase() {
  console.log('🌱 Poblando supermercados y categorías en Soria...');

  // 1. Categorías con orden inteligente de pasillo / recorrido
  const categories = [
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
    { id: 'congelados', name: 'Congelados', icon: '🧊', aisleOrder: 12 },
    { id: 'limpieza-hogar', name: 'Limpieza y Cuidado del Hogar', icon: '🧼', aisleOrder: 13 },
    { id: 'cuidado-personal', name: 'Cuidado Personal y Belleza', icon: '🧴', aisleOrder: 14 },
    { id: 'mascotas', name: 'Mascotas', icon: '🐾', aisleOrder: 15 },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: cat,
      create: cat,
    });
  }

  // 2. Supermercados reales en Soria
  const supermarkets = [
    // Mercadona
    {
      id: 'mercadona-saavedra',
      name: 'Mercadona - C/ Eduardo Saavedra',
      chain: 'Mercadona',
      address: 'Calle Eduardo Saavedra, 40',
      postalCode: '42004',
      city: 'Soria',
      website: 'https://tienda.mercadona.es',
      active: true,
    },
    {
      id: 'mercadona-palomar',
      name: 'Mercadona - C/ José Luis Palomar',
      chain: 'Mercadona',
      address: 'Calle José Luis Palomar, s/n',
      postalCode: '42003',
      city: 'Soria',
      website: 'https://tienda.mercadona.es',
      active: true,
    },
    // Dia
    {
      id: 'dia-aguirre',
      name: 'Dia - Calle Aguirre',
      chain: 'Dia',
      address: 'Calle Aguirre, 6',
      postalCode: '42002',
      city: 'Soria',
      website: 'https://www.dia.es',
      active: true,
    },
    {
      id: 'dia-valladolid',
      name: 'Dia - Avda. Valladolid',
      chain: 'Dia',
      address: 'Avenida Valladolid, 35',
      postalCode: '42004',
      city: 'Soria',
      website: 'https://www.dia.es',
      active: true,
    },
    // Lupa (Soria capital + provincia)
    {
      id: 'lupa-granados',
      name: 'Lupa - Plaza Mariano Granados',
      chain: 'Lupa',
      address: 'Plaza Mariano Granados, 7-8',
      postalCode: '42002',
      city: 'Soria',
      website: 'https://www.lupaonline.com',
      active: true,
    },
    {
      id: 'lupa-almazan',
      name: 'Lupa - Almazán',
      chain: 'Lupa',
      address: 'Avenida de Soria, 40',
      postalCode: '42200',
      city: 'Almazán',
      website: 'https://www.lupaonline.com',
      active: true,
    },
    // Lidl
    {
      id: 'lidl-valladolid',
      name: 'Lidl - Avda. Valladolid',
      chain: 'Lidl',
      address: 'Avenida de Valladolid, 102',
      postalCode: '42004',
      city: 'Soria',
      website: 'https://www.lidl.es',
      active: true,
    },
    // E.Leclerc
    {
      id: 'eleclerc-las-casas',
      name: 'Hipermercado E.Leclerc - Polígono Las Casas',
      chain: 'E.Leclerc',
      address: 'Polígono Industrial Las Casas, C/ J, Parcela 1',
      postalCode: '42005',
      city: 'Soria',
      website: 'https://e-leclerc.es/soria',
      active: true,
    },
    {
      id: 'eleclerc-express',
      name: 'E.Leclerc Express - C/ Mariano Vicén',
      chain: 'E.Leclerc',
      address: 'Calle Mariano Vicén, 24',
      postalCode: '42003',
      city: 'Soria',
      website: 'https://e-leclerc.es/soria',
      active: true,
    },
    // Alcampo
    {
      id: 'alcampo-camaretas',
      name: 'Alcampo - Centro Comercial Camaretas',
      chain: 'Alcampo',
      address: 'Calle Las Balsas s/n, CC Camaretas (Golmayo)',
      postalCode: '42190',
      city: 'Soria / Golmayo',
      website: 'https://www.compraonline.alcampo.es',
      active: true,
    },
    // Calservi (Supermercado local soriano)
    {
      id: 'calservi-soria',
      name: 'Supermercados Calservi - C/ Francisco de Soto',
      chain: 'Calservi',
      address: 'Calle Francisco de Soto, 2',
      postalCode: '42004',
      city: 'Soria',
      website: null,
      active: true,
    },
  ];

  for (const sm of supermarkets) {
    await prisma.supermarket.upsert({
      where: { id: sm.id },
      update: sm,
      create: sm,
    });
  }

  console.log(`✅ ${supermarkets.length} supermercados de Soria registrados (incluido Aldi Soria).`);
}

if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seedDatabase()
    .catch((err) => {
      console.error('Error en seed:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
