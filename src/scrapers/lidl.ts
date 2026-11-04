import { ISupermarketScraper, ScrapedProduct } from './types.js';

export class LidlScraper implements ISupermarketScraper {
  name = 'Lidl';
  supermarketId = 'lidl-valladolid'; // Avda. Valladolid, Soria
  baseUrl = 'https://www.lidl.es';

  private catalog: ScrapedProduct[] = [
    {
      externalId: 'lidl-leche-milbona',
      name: 'Leche entera Milbona 1L',
      brand: 'Milbona',
      format: 'Brik 1L',
      price: 0.89,
      referencePrice: 0.89,
      referenceUnit: 'L',
      originalPrice: null,
      isOffer: false,
      inStock: true,
      imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300',
      categoryHint: 'Huevos, Leche y Lácteos > Leche',
      externalUrl: 'https://www.lidl.es',
      supermarketId: 'lidl-valladolid',
    },
    {
      externalId: 'lidl-aceite-olivia',
      name: 'Aceite de oliva virgen extra Olisone 1L',
      brand: 'Olisone',
      format: 'Botella 1L',
      price: 7.99,
      referencePrice: 7.99,
      referenceUnit: 'L',
      originalPrice: 8.89,
      isOffer: true,
      inStock: true,
      imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300',
      categoryHint: 'Aceite, Vinagre y Salsas > Aceite',
      externalUrl: 'https://www.lidl.es',
      supermarketId: 'lidl-valladolid',
    },
    {
      externalId: 'lidl-huevos-m',
      name: 'Huevos frescos categoría M 12 uds',
      brand: 'Lidl',
      format: 'Docena',
      price: 2.19,
      referencePrice: 0.18,
      referenceUnit: 'ud',
      originalPrice: null,
      isOffer: false,
      inStock: true,
      imageUrl: 'https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?w=300',
      categoryHint: 'Huevos, Leche y Lácteos > Huevos',
      externalUrl: 'https://www.lidl.es',
      supermarketId: 'lidl-valladolid',
    },
    {
      externalId: 'lidl-arroz-campo-largo',
      name: 'Arroz grano redondo Campo Largo 1kg',
      brand: 'Campo Largo',
      format: 'Paquete 1kg',
      price: 1.19,
      referencePrice: 1.19,
      referenceUnit: 'kg',
      originalPrice: null,
      isOffer: false,
      inStock: true,
      imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300',
      categoryHint: 'Pasta, Arroz y Legumbres > Arroz',
      externalUrl: 'https://www.lidl.es',
      supermarketId: 'lidl-valladolid',
    },
    {
      externalId: 'lidl-pan-barra-rustica',
      name: 'Barra rústica recién horneada',
      brand: 'Lidl Panadería',
      format: 'Barra 250g',
      price: 0.55,
      referencePrice: 2.2,
      referenceUnit: 'kg',
      originalPrice: 0.69,
      isOffer: true,
      inStock: true,
      imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300',
      categoryHint: 'Panadería y Pastelería > Pan',
      externalUrl: 'https://www.lidl.es',
      supermarketId: 'lidl-valladolid',
    },
    {
      externalId: 'lidl-yogur-griego',
      name: 'Yogur estilo griego natural Milbona 1kg',
      brand: 'Milbona',
      format: 'Cubo 1kg',
      price: 2.29,
      referencePrice: 2.29,
      referenceUnit: 'kg',
      originalPrice: null,
      isOffer: false,
      inStock: true,
      imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=300',
      categoryHint: 'Huevos, Leche y Lácteos > Yogures',
      externalUrl: 'https://www.lidl.es',
      supermarketId: 'lidl-valladolid',
    },
  ];

  async search(query: string): Promise<ScrapedProduct[]> {
    const qLower = query.toLowerCase().trim();
    return this.catalog.filter(
      (p) => p.name.toLowerCase().includes(qLower) || p.brand?.toLowerCase().includes(qLower)
    );
  }

  async scrapePopular(limit = 10): Promise<ScrapedProduct[]> {
    return this.catalog.slice(0, limit);
  }
}
