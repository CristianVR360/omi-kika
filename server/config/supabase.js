import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'placeholder-key';

if (!process.env.SUPABASE_URL) {
  console.warn('[SUPABASE WARNING] SUPABASE_URL no está configurado en las variables de entorno.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

/**
 * Crea un cliente aislado para operaciones de Supabase Auth (login / verificación de tokens)
 * sin contaminar el estado ni los encabezados del cliente principal de base de datos.
 */
export const createAuthClient = () => {
  const authKey = process.env.SUPABASE_ANON_KEY || supabaseKey;
  return createClient(supabaseUrl, authKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
};

export const hasSupabaseConfigured = !!(
  process.env.SUPABASE_URL &&
  !process.env.SUPABASE_URL.includes('placeholder') &&
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
);
