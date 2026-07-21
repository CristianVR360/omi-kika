import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';

export const requireAdminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Acceso no autorizado. Token no proporcionado.' });
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET || 'omikika-secret-key-2026';

    // 1. Intentar verificar si es un JWT interno
    try {
      const decoded = jwt.verify(token, jwtSecret);
      req.user = decoded;
      return next();
    } catch (jwtErr) {
      // 2. Si falla JWT interno, intentar verificar con Supabase Auth
      if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          req.user = user;
          return next();
        }
      }
      return res.status(401).json({ error: 'Token inválido o expirado. Inicie sesión nuevamente.' });
    }
  } catch (err) {
    console.error('Error en middleware de autenticación:', err);
    return res.status(500).json({ error: 'Error al verificar la autenticación del administrador.' });
  }
};
