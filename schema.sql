-- =========================================================
-- ESQUEMA DE BASE DE DATOS SUPABASE - OMIKIKA B&B
-- Copia e ejecuta este script en el Editor SQL de Supabase
-- =========================================================

-- 1. Tabla de Habitaciones
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    size_m2 INT,
    capacity_adults INT NOT NULL DEFAULT 2,
    capacity_children INT NOT NULL DEFAULT 0,
    price_per_night NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de Reservas (Soporta Reservas Web y Manuales de OTAs)
CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE RESTRICT,
    channel VARCHAR(100) DEFAULT 'Sitio Web', -- 'Sitio Web', 'Booking.com', 'Airbnb', 'Tripadvisor', 'Trivago', 'Agoda', 'Hostales.com', 'Kayak', 'Hostelworld', 'Reserva Directa', 'Otro: ...'
    guest_name VARCHAR(255) NOT NULL,
    guest_email VARCHAR(255) NOT NULL,
    guest_phone VARCHAR(50) NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    adults INT NOT NULL DEFAULT 1,
    children INT NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'confirmed', 'cancelled', 'completed', 'blocked'
    total_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Índices de Alto Rendimiento para Consultas Paginadas e Inspección de Disponibilidad
CREATE INDEX IF NOT EXISTS idx_reservations_room_dates ON public.reservations (room_id, check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_reservations_status_created ON public.reservations (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reservations_channel ON public.reservations (channel);
CREATE INDEX IF NOT EXISTS idx_reservations_guest_email ON public.reservations (guest_email);
CREATE INDEX IF NOT EXISTS idx_reservations_created_at ON public.reservations (created_at DESC);

-- 4. Habilitar Row Level Security (RLS) para Protección de Datos
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Política: Permitir lectura pública de las habitaciones
DROP POLICY IF EXISTS "Lectura pública de habitaciones activas" ON public.rooms;
CREATE POLICY "Lectura pública de habitaciones activas" ON public.rooms
FOR SELECT USING (is_active = true);

-- Políticas para la tabla de reservas (reservations)
DROP POLICY IF EXISTS "Permitir inserción pública de reservas" ON public.reservations;
CREATE POLICY "Permitir inserción pública de reservas" ON public.reservations
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir lectura de reservas" ON public.reservations;
CREATE POLICY "Permitir lectura de reservas" ON public.reservations
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir actualización de reservas" ON public.reservations;
CREATE POLICY "Permitir actualización de reservas" ON public.reservations
FOR UPDATE USING (true);

-- 5. Tabla de Consultas / Leads
CREATE TABLE IF NOT EXISTS public.inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    subject VARCHAR(255),
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'new', -- 'new', 'read', 'replied'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Políticas para la tabla de consultas (inquiries)
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir inserción pública de consultas" ON public.inquiries;
CREATE POLICY "Permitir inserción pública de consultas" ON public.inquiries
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir lectura de consultas" ON public.inquiries;
CREATE POLICY "Permitir lectura de consultas" ON public.inquiries
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir actualización de consultas" ON public.inquiries;
CREATE POLICY "Permitir actualización de consultas" ON public.inquiries
FOR UPDATE USING (true);

-- 6. Semillas Iniciales (Datos de Habitaciones de Omikika B&B)
INSERT INTO public.rooms (name, slug, description, size_m2, capacity_adults, capacity_children, price_per_night, image_url)
VALUES 
('Apartamento - Planta baja', 'apartamento-planta-baja', 'Espacioso apartamento de 70 m² con cocina privada y vistas al jardín.', 70, 4, 2, 75000.00, 'assets/img/rooms/1.jpg'),
('Habitación Doble', 'habitacion-doble', 'Habitación acogedora de 18 m² con vistas al lago y cama matrimonial.', 18, 2, 0, 45000.00, 'assets/img/rooms/2.jpg'),
('Habitación Doble Económica', 'habitacion-doble-economica', 'Cómoda habitación de 12 m² ideal para parejas o viajeros individuales.', 12, 2, 0, 35000.00, 'assets/img/rooms/3.jpg'),
('Suite Executive', 'suite-executive', 'Suite de 20 m² con amplia cama king, balcón privado y vista al lago.', 20, 2, 1, 65000.00, 'assets/img/rooms/4.jpg'),
('Habitación Triple Básica', 'habitacion-triple-basica', 'Habitación de 18 m² equipada con 3 camas individuales para grupos o familias.', 18, 3, 1, 55000.00, 'assets/img/rooms/1.jpg')
ON CONFLICT (slug) DO NOTHING;

-- 7. Tabla de Tarifas Especiales / Precios Diarios
CREATE TABLE IF NOT EXISTS public.room_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id, date)
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.room_prices ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad RLS
DROP POLICY IF EXISTS "Permitir lectura de precios especiales" ON public.room_prices;
CREATE POLICY "Permitir lectura de precios especiales" ON public.room_prices
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserción de precios al admin" ON public.room_prices;
CREATE POLICY "Permitir inserción de precios al admin" ON public.room_prices
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualización de precios al admin" ON public.room_prices;
CREATE POLICY "Permitir actualización de precios al admin" ON public.room_prices
FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir borrado de precios al admin" ON public.room_prices;
CREATE POLICY "Permitir borrado de precios al admin" ON public.room_prices
FOR DELETE USING (true);

-- 8. Semillas Iniciales para Reservas de Muestra (Opcional)
INSERT INTO public.reservations (room_id, channel, guest_name, guest_email, guest_phone, check_in, check_out, adults, children, status, total_price, notes)
SELECT id, 'Booking.com', 'María González', 'maria.gonzalez@example.com', '+56 9 8765 4321', '2026-08-05', '2026-08-10', 3, 1, 'confirmed', 375000.00, 'Reserva confirmada vía Booking.com'
FROM public.rooms WHERE slug = 'apartamento-planta-baja'
LIMIT 1;

INSERT INTO public.reservations (room_id, channel, guest_name, guest_email, guest_phone, check_in, check_out, adults, children, status, total_price, notes)
SELECT id, 'Airbnb', 'Carlos Benítez', 'carlos.b@example.com', '+56 9 7654 3210', '2026-08-12', '2026-08-15', 2, 0, 'confirmed', 135000.00, 'Llegada tarde coordinada'
FROM public.rooms WHERE slug = 'habitacion-doble'
LIMIT 1;
