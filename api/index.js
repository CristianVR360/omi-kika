import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import roomsRouter from '../server/routes/rooms.js';
import reservationsRouter from '../server/routes/reservations.js';
import adminRouter from '../server/routes/admin.js';
import inquiriesRouter from '../server/routes/inquiries.js';
import recommendationsRouter from '../server/routes/recommendations.js';

// Omikika B&B API Server Entrypoint v3
dotenv.config();

const app = express();

// Confiar en el proxy inverso de Vercel para identificar IPs reales en express-rate-limit
app.set('trust proxy', 1);

// Seguridad y Middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Evitar caché HTTP en endpoints de API dinámicos
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Limite de peticiones para evitar abuso
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // Máximo 200 peticiones por IP
  message: { error: 'Demasiadas solicitudes desde esta IP, intente de nuevo en 15 minutos.' }
});

app.use('/api', apiLimiter);

// Rutas API
app.use('/api/rooms', roomsRouter);
app.use('/api/reservations', reservationsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/inquiries', inquiriesRouter);
app.use('/api/recommendations', recommendationsRouter);

// Ruta de estado de la API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'Omikika B&B Reservation API',
    timestamp: new Date().toISOString()
  });
});

// Servir archivos estáticos del frontend público y admin en entorno local
app.use(express.static('.'));

// Manejador 404 para la API
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint API no encontrado.' });
});


// Inicialización local
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor Omikika B&B escuchando en http://localhost:${PORT} y http://127.0.0.1:${PORT}`);
  });
}

// Exportar para Vercel Serverless
export default app;
