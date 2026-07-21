import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import roomsRouter from '../server/routes/rooms.js';
import reservationsRouter from '../server/routes/reservations.js';
import adminRouter from '../server/routes/admin.js';
import inquiriesRouter from '../server/routes/inquiries.js';

dotenv.config();

const app = express();

// Seguridad y Middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

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
    console.log(`🚀 Servidor Omikika B&B escuchando en http://localhost:${PORT}`);
  });
}

// Exportar para Vercel Serverless
export default app;
