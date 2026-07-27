import express from 'express';
import { supabase, hasSupabaseConfigured } from '../config/supabase.js';

const router = express.Router();

const DEFAULT_ROOMS = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Apartamento - Planta baja', slug: 'apartamento-planta-baja', size_m2: 70, capacity_adults: 4, capacity_children: 2, price_per_night: 75000 },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Habitación Doble', slug: 'habitacion-doble', size_m2: 18, capacity_adults: 2, capacity_children: 0, price_per_night: 45000 },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Habitación Doble Económica', slug: 'habitacion-doble-economica', size_m2: 12, capacity_adults: 2, capacity_children: 0, price_per_night: 35000 },
  { id: '44444444-4444-4444-4444-444444444444', name: 'Suite Executive', slug: 'suite-executive', size_m2: 20, capacity_adults: 2, capacity_children: 1, price_per_night: 65000 },
  { id: '55555555-5555-5555-5555-555555555555', name: 'Habitación Triple Básica', slug: 'habitacion-triple-basica', size_m2: 18, capacity_adults: 3, capacity_children: 1, price_per_night: 55000 }
];

router.get('/', async (req, res) => {
  try {
    if (hasSupabaseConfigured) {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (!error && data && data.length > 0) {
        return res.json({ success: true, rooms: data });
      }
    }
    
    // Fallback si no hay conexión a Supabase configurada aún
    return res.json({ success: true, rooms: DEFAULT_ROOMS, source: 'fallback' });
  } catch (err) {
    console.error('Error al obtener habitaciones:', err);
    return res.status(500).json({ error: 'Error al obtener la lista de habitaciones' });
  }
});

export default router;
