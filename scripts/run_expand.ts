import { expandBoth } from '../src/scrapers/expandLeclercAndLupa.js';

expandBoth().catch((err) => {
  console.error('Error running expandBoth:', err);
  process.exit(1);
});
