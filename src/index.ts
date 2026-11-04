import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import apiRouter from './routes/api.js';
import { setupCronJobs } from './services/cron.service.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

// Obtener la IP local de la red Wi-Fi / Ethernet
function getLocalIpAddress(): string {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalIpAddress();

// Endpoint con la información de red para el botón móvil / código QR
app.get('/api/network-info', (_req, res) => {
  res.json({
    localIp,
    port: PORT,
    localUrl: `http://localhost:${PORT}`,
    networkUrl: `http://${localIp}:${PORT}`,
  });
});

// Servir la interfaz web estática
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// Rutas de la API
app.use('/api', apiRouter);

// Fallback para SPA / index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Arrancar servidor escuchando en 0.0.0.0 (todas las interfaces de red)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                 🛒 QUEFALTA SORIA BACKEND & APP               ║
╠═══════════════════════════════════════════════════════════════╣
║  • En este PC:        http://localhost:${PORT}                  ║
║  • En Red Local / Móvil: http://${localIp}:${PORT}            ║
║  • Servidor API:      http://${localIp}:${PORT}/api             ║
║  • Supermercados:     Mercadona, Dia, Lupa, Lidl, Leclerc     ║
║  • Base de datos:     SQLite (35.000+ productos de Soria)     ║
║  • Ciudad:            Soria (CP 42001 - 42005)                ║
╚═══════════════════════════════════════════════════════════════╝

📱 Puedes abrir http://${localIp}:${PORT} desde el navegador de tu móvil conectado al mismo Wi-Fi.
⏰ Planificador de tareas automáticas activo (actualización diaria a las 04:00 AM).
`);

  // Activar cron en segundo plano
  setupCronJobs();
});
