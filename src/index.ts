import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './routes/api.js';
import { setupCronJobs } from './services/cron.service.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Servir la interfaz web estática
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// Rutas de la API
app.use('/api', apiRouter);

// Fallback para SPA / index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Arrancar servidor
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                 🛒 QUEFALTA SORIA BACKEND & APP               ║
╠═══════════════════════════════════════════════════════════════╣
║  • Servidor API:      http://localhost:${PORT}/api              ║
║  • Panel / Web App:   http://localhost:${PORT}                  ║
║  • Supermercados:     Mercadona, Dia, Lupa, Lidl, Leclerc     ║
║  • Base de datos:     SQLite (Prisma ORM)                     ║
║  • Ciudad:            Soria (CP 42001 - 42005)                ║
╚═══════════════════════════════════════════════════════════════╝
`);

  // Activar cron en segundo plano
  setupCronJobs();
});
