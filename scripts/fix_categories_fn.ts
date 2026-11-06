import { applyCategoryClassification } from './apply_category_classification.js';

export async function fixCategories() {
  console.log('🧹 Ejecutando auditoría y corrección de categorías semánticas...');
  await applyCategoryClassification();
  console.log('✅ Categorías verificadas y optimizadas.');
}
