-- =========================================================
-- ESQUEMA DE BASE DE DATOS SUPABASE - TABLA DE RECOMENDACIONES
-- Copia y ejecuta este script en el Editor SQL de Supabase
-- =========================================================

-- 1. Crear Tabla de Recomendaciones
CREATE TABLE IF NOT EXISTS public.recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'restaurantes', -- 'termas', 'restaurantes', 'comidas', 'entretencion', 'delivery', 'cafeterias'
    description TEXT,
    phone VARCHAR(50),
    address VARCHAR(255),
    maps_url TEXT,
    website_url TEXT,
    instagram_url TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear Índices de Rendimiento
CREATE INDEX IF NOT EXISTS idx_recommendations_category ON public.recommendations (category);
CREATE INDEX IF NOT EXISTS idx_recommendations_active_order ON public.recommendations (is_active, display_order ASC, created_at DESC);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Seguridad RLS
DROP POLICY IF EXISTS "Lectura pública de recomendaciones activas" ON public.recommendations;
CREATE POLICY "Lectura pública de recomendaciones activas" ON public.recommendations
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserción de recomendaciones" ON public.recommendations;
CREATE POLICY "Permitir inserción de recomendaciones" ON public.recommendations
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualización de recomendaciones" ON public.recommendations;
CREATE POLICY "Permitir actualización de recomendaciones" ON public.recommendations
FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir borrado de recomendaciones" ON public.recommendations;
CREATE POLICY "Permitir borrado de recomendaciones" ON public.recommendations
FOR DELETE USING (true);

-- 5. Semillas Iniciales (Recomendaciones Destacadas de la Zona Lacustre)
INSERT INTO public.recommendations (name, category, description, phone, address, maps_url, website_url, instagram_url, display_order)
VALUES
(
    'Termas Geométricas',
    'termas',
    'Impresionante complejo termal con 20 pozas naturales de agua termal encajonadas en una quebrada boscosa en el Parque Nacional Villarrica.',
    '+56 9 9876 5432',
    'Km 16 Camino Coñaripe a Palguín',
    'https://maps.app.goo.gl/g2t18e7X3g',
    'https://www.termasgeometricas.cl',
    'https://instagram.com/termasgeometricas',
    1
),
(
    'Termas de Menetúe',
    'termas',
    'Centro termal exclusivo rodeado de naturaleza con piscinas techadas y al aire libre, spa y restaurante.',
    '+56 45 244 1900',
    'Camino Internacional Km 30, Pucón',
    'https://maps.app.goo.gl/m3nETUe',
    'https://www.menetue.cl',
    'https://instagram.com/termasmenetue',
    2
),
(
    'La Poza Pizza & Birra',
    'restaurantes',
    'Excelentes pizzas artesanales a la leña, gran selección de cervezas tiradas locales y excelente vista en Pucón.',
    '+56 9 8765 4321',
    'Av. Bernardo O''Higgins 450, Pucón',
    'https://maps.app.goo.gl/lapozapizza',
    'https://www.lapozapucón.cl',
    'https://instagram.com/lapozapizza',
    3
),
(
    'El Rincón Burguer Delivery',
    'delivery',
    'Las mejores hamburguesas gourmet a domicilio en la zona. Entrega rápida y pan artesanal recién horneado.',
    '+56 9 1122 3344',
    'Entrega a Domicilio / Omikika B&B',
    'https://maps.app.goo.gl/elrincon',
    '',
    'https://instagram.com/elrinconburguer_pucon',
    4
),
(
    'Parque Nacional Huerquehue',
    'entretencion',
    'Trekking espectacular entre alerces milenarios, lagunas cordilleranas y senderos naturales impresionantes.',
    '+56 45 244 1000',
    'Sector Tinquilco, Pucón',
    'https://maps.app.goo.gl/huerquehue',
    'https://www.conaf.cl',
    'https://instagram.com/conaf_chile',
    5
),
(
    'Café de la Plaza & Pastelería',
    'cafeterias',
    'Café de especialidad, tortas caseras, kuchen alemán recién horneado y ambiente muy acogedor.',
    '+56 9 3344 5566',
    'Pedro de Valdivia 320, Pucón',
    'https://maps.app.goo.gl/cafedelaplaza',
    '',
    'https://instagram.com/cafedelaplaza_pucon',
    6
)
ON CONFLICT DO NOTHING;
