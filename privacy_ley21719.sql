-- =========================================================
-- MIGRACIÓN LEY N° 21.719 (CHILE) - PROTECCIÓN DE DATOS PERSONALES
-- Ejecutar este script en el SQL Editor de Supabase
-- =========================================================

-- 1. Registro de consentimiento expreso y separable en Reservas
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS privacy_consent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS privacy_consent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS consent_version VARCHAR(32) DEFAULT '2026-11';

-- 2. Registro de consentimiento expreso y separable en Consultas / Leads
ALTER TABLE public.inquiries
  ADD COLUMN IF NOT EXISTS privacy_consent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS privacy_consent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS consent_version VARCHAR(32) DEFAULT '2026-11';

-- 3. Tabla de Solicitudes de Derechos ARCOP + Bloqueo (Ley 21.719)
-- Derechos: access (Acceso), rectification (Rectificación), erasure (Supresión/Cancelación),
--           objection (Oposición), portability (Portabilidad), blocking (Bloqueo)
CREATE TABLE IF NOT EXISTS public.privacy_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_code VARCHAR(40) UNIQUE NOT NULL,
    request_type VARCHAR(30) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    rut_or_id VARCHAR(50),
    details TEXT NOT NULL,
    privacy_consent BOOLEAN NOT NULL DEFAULT TRUE,
    consent_version VARCHAR(32) DEFAULT '2026-11',
    status VARCHAR(30) DEFAULT 'pending', -- 'pending', 'in_review', 'completed', 'rejected'
    admin_notes TEXT,
    due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '15 days'),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_privacy_requests_email ON public.privacy_requests (email);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_status ON public.privacy_requests (status, created_at DESC);

ALTER TABLE public.privacy_requests ENABLE ROW LEVEL SECURITY;

-- Nota: La lectura y gestión administrativa se realizan exclusivamente vía backend con SUPABASE_SERVICE_ROLE_KEY.
DROP POLICY IF EXISTS "Permitir inserción pública de solicitudes ARCOP" ON public.privacy_requests;
CREATE POLICY "Permitir inserción pública de solicitudes ARCOP" ON public.privacy_requests
FOR INSERT WITH CHECK (true);
