import cron from 'node-cron';
import { scraperManager } from '../scrapers/index.js';

export function setupCronJobs() {
  // Ejecutar scraping automático todos los días a las 04:00 AM
  cron.schedule('0 4 * * *', async () => {
    console.log('[CRON] ⏰ Iniciando actualización automática diaria de precios en Soria...');
    try {
      await scraperManager.runAll();
      console.log('[CRON] ✅ Actualización automática completada.');
    } catch (err: any) {
      console.error('[CRON] ❌ Error en actualización programada:', err.message);
    }
  });

  console.log('⏰ Planificador de tareas automáticas activo (actualización diaria a las 04:00 AM).');
}
