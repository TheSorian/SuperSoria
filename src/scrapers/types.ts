export interface ScrapedProduct {
  externalId: string;
  name: string;
  brand: string | null;
  format: string | null;
  price: number;
  referencePrice: number | null;
  referenceUnit: string | null;
  originalPrice: number | null;
  isOffer: boolean;
  inStock: boolean;
  imageUrl: string | null;
  categoryHint: string | null;
  externalUrl: string | null;
  supermarketId: string;
}

export interface ScraperResult {
  supermarket: string;
  productsFound: number;
  productsSaved: number;
  errors: string[];
  durationMs: number;
}

export interface ISupermarketScraper {
  name: string;
  supermarketId: string;
  search(query: string): Promise<ScrapedProduct[]>;
  scrapePopular(limit?: number): Promise<ScrapedProduct[]>;
}
