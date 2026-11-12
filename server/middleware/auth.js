import jwt from 'jsonwebtoken';
import { createAuthClient, hasSupabaseConfigured } from '../config/supabase.js';

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
      // 2. Fallback: verificar con Supabase Auth en cliente aislado
      if (hasSupabaseConfigured) {
        try {
          const authClient = createAuthClient();
          const { data: { user }, error } = await authClient.auth.getUser(token);
          if (!error && user) {
            req.user = user;
            return next();
          }
        } catch (supabaseAuthErr) {
          console.error('Error de red al verificar token con Supabase Auth:', supabaseAuthErr);
          return res.status(503).json({ error: 'Servicio de autenticación temporalmente no disponible.' });
        }
      }
      return res.status(401).json({ error: 'Token inválido o expirado. Inicie sesión nuevamente.' });
    }
  } catch (err) {
    console.error('Error en middleware de autenticación:', err);
    return res.status(500).json({ error: 'Error al verificar la autenticación del administrador.' });
  }
};
