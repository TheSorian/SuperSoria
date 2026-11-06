import { classifyProduct } from './categoryClassifier.js';

export function mapToCategoryId(name: string, categoryHint?: string | null): string {
  const combined = categoryHint ? `${name} ${categoryHint}` : name;
  return classifyProduct(combined);
}
