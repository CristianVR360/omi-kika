import express from 'express';
import jwt from 'jsonwebtoken';
import { supabase, hasSupabaseConfigured } from '../config/supabase.js';
import { requireAdminAuth } from '../middleware/auth.js';
import { sendStatusUpdateEmail } from '../services/emailService.js';

const router = express.Router();

/**
 * GET /api/admin/diagnose
 * Diagnóstico de conexión y tablas de Supabase
 */
router.get('/diagnose', async (req, res) => {
  try {
    const url = process.env.SUPABASE_URL || 'Not set';
    const keyExists = !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);
    
    let roomsTest = 'Not tested';
    let reservationsTest = 'Not tested';
    let inquiriesTest = 'Not tested';
    
    if (process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)) {
      const { data: rm, error: rmErr } = await supabase.from('rooms').select('*').limit(1);
      roomsTest = rmErr ? `Error: ${rmErr.message}` : `Success (${rm ? rm.length : 0} rooms)`;
      
      const { data: rv, error: rvErr } = await supabase.from('reservations').select('*').limit(1);
      reservationsTest = rvErr ? `Error: ${rvErr.message}` : `Success (${rv ? rv.length : 0} reservations)`;
      
      const { data: iq, error: iqErr } = await supabase.from('inquiries').select('*').limit(1);
      inquiriesTest = iqErr ? `Error: ${iqErr.message}` : `Success (${iq ? iq.length : 0} inquiries)`;
    }
    
    return res.json({
      success: true,
      supabaseUrl: url,
      keyExists,
      roomsTest,
      reservationsTest,
      inquiriesTest,
      env: {
        PORT: process.env.PORT || 3000,
        NODE_ENV: process.env.NODE_ENV || 'development'
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/login
 * Inicio de sesión de administrador
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Proporcione email y contraseña.' });
    }

    // 1. Intentar verificar con Supabase Auth si está configurado
    if (hasSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (!error && data && data.session) {
          return res.json({
            success: true,
            token: data.session.access_token,
            user: { email: data.user.email, id: data.user.id }
          });
        }
      } catch (authCatchErr) {
        console.warn('[LOGIN WARNING] Error de red o credenciales en Supabase Auth:', authCatchErr.message);
      }
    }

    // 2. Fallback a credenciales locales definidas en .env si falla Supabase Auth
    const jwtSecret = process.env.JWT_SECRET || 'omikika-secret-key-2026';
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
      const token = jwt.sign(
        { email: adminEmail, role: 'admin' },
        jwtSecret,
        { expiresIn: '24h' }
      );

      return res.json({
        success: true,
        token,
        user: { email: adminEmail, role: 'admin' }
      });
    }

    return res.status(401).json({
      error: 'Correo o contraseña incorrectos. Por favor verifique sus datos.'
    });

  } catch (err) {
    console.error('Error en login admin:', err);
    return res.status(500).json({ error: 'Error del servidor durante el inicio de sesión.' });
  }
});
// Helper para sembrar reservas iniciales de muestra en Supabase si la tabla está totalmente vacía
const ensureInitialReservationsSeeded = async () => {
  if (!hasSupabaseConfigured) return false;
  try {
    const { count, error } = await supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true });

    if (!error && count === 0) {
      const { data: rooms } = await supabase.from('rooms').select('id, slug');
      if (rooms && rooms.length > 0) {
        const getRoomId = (slug) => {
          const found = rooms.find(r => r.slug === slug);
          return found ? found.id : rooms[0].id;
        };

        const sampleData = [
          {
            room_id: getRoomId('apartamento-planta-baja'),
            channel: 'Booking.com',
            guest_name: 'María González',
            guest_email: 'maria.gonzalez@example.com',
            guest_phone: '+56 9 8765 4321',
            check_in: '2026-08-05',
            check_out: '2026-08-10',
            adults: 3,
            children: 1,
            status: 'confirmed',
            total_price: 375000,
            notes: 'Reserva confirmada vía Booking.com. Solicita cuna suplementaria.'
          },
          {
            room_id: getRoomId('habitacion-doble'),
            channel: 'Airbnb',
            guest_name: 'Carlos Benítez',
            guest_email: 'carlos.b@example.com',
            guest_phone: '+56 9 7654 3210',
            check_in: '2026-08-12',
            check_out: '2026-08-15',
            adults: 2,
            children: 0,
            status: 'confirmed',
            total_price: 135000,
            notes: 'Llegada noche previa coordinada (21:00 hrs).'
          },
          {
            room_id: getRoomId('suite-executive'),
            channel: 'Sitio Web',
            guest_name: 'Andrea Morales',
            guest_email: 'andrea.morales@example.com',
            guest_phone: '+56 9 6543 2109',
            check_in: '2026-08-18',
            check_out: '2026-08-20',
            adults: 2,
            children: 0,
            status: 'pending',
            total_price: 130000,
            notes: 'Pendiente de confirmación de pago por transferencia.'
          },
          {
            room_id: getRoomId('habitacion-doble-economica'),
            channel: 'Reserva Directa',
            guest_name: 'Felipe Soto',
            guest_email: 'fsoto@example.com',
            guest_phone: '+56 9 5432 1098',
            check_in: '2026-07-25',
            check_out: '2026-07-28',
            adults: 2,
            children: 0,
            status: 'completed',
            total_price: 120000,
            notes: 'Cliente frecuente. Check-out realizado con éxito.'
          }
        ];

        const { error: insertErr } = await supabase.from('reservations').insert(sampleData);
        if (!insertErr) {
          console.log('🌱 Se han sembrado 4 reservas iniciales en la base de datos Supabase.');
          return true;
        }
      }
    }
  } catch (err) {
    console.warn('[SEED WARNING] Error al sembrar reservas iniciales:', err.message);
  }
  return false;
};

/**
 * GET /api/admin/reservations
 * Obtener lista paginada y filtrada de reservas (Ruta Protegida)
 */
router.get('/reservations', requireAdminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const status = req.query.status || 'all';
    const channel = req.query.channel || 'all';
    const search = (req.query.search || '').trim();

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const CHANNELS_DEMO = ['Sitio Web', 'Booking.com', 'Airbnb', 'Tripadvisor', 'Trivago', 'Agoda', 'Hostales.com', 'Kayak', 'Hostelworld', 'Reserva Directa'];

    // Si Supabase no está configurado, simulamos datos paginados de prueba
    if (!hasSupabaseConfigured) {
      const mockReservations = Array.from({ length: 35 }).map((_, i) => ({
        id: `res-mock-${i + 1}`,
        channel: CHANNELS_DEMO[i % CHANNELS_DEMO.length],
        guest_name: `Huésped Demo ${i + 1}`,
        guest_email: `cliente${i + 1}@ejemplo.com`,
        guest_phone: `+56 9 1234 567${i % 10}`,
        check_in: `2026-08-${String((i % 20) + 1).padStart(2, '0')}`,
        check_out: `2026-08-${String((i % 20) + 3).padStart(2, '0')}`,
        adults: (i % 3) + 1,
        children: i % 2,
        status: i % 4 === 0 ? 'pending' : (i % 4 === 1 ? 'confirmed' : 'completed'),
        total_price: 90000 + (i * 5000),
        created_at: new Date(Date.now() - i * 86400000).toISOString(),
        rooms: { name: 'Habitación Doble' }
      }));

      let filtered = mockReservations;
      if (status !== 'all') {
        filtered = filtered.filter(r => r.status === status);
      }
      if (channel !== 'all') {
        filtered = filtered.filter(r => r.channel === channel);
      }
      if (search) {
        filtered = filtered.filter(r => r.guest_name.toLowerCase().includes(search.toLowerCase()) || r.guest_email.toLowerCase().includes(search.toLowerCase()));
      }

      const totalRecords = filtered.length;
      const totalPages = Math.ceil(totalRecords / limit) || 1;
      const paginatedData = filtered.slice(from, from + limit);

      return res.json({
        success: true,
        data: paginatedData,
        pagination: {
          page,
          limit,
          totalRecords,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    }

    // Consulta Paginada en Supabase usando .range()
    let query = supabase
      .from('reservations')
      .select('*, rooms(name)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (channel && channel !== 'all') {
      query = query.eq('channel', channel);
    }

    if (search) {
      query = query.or(`guest_name.ilike.%${search}%,guest_email.ilike.%${search}%`);
    }

    query = query.range(from, to);

    let { data, count, error } = await query;

    if (!error && (count === 0 || !data || data.length === 0) && status === 'all' && channel === 'all' && !search && page === 1) {
      const seeded = await ensureInitialReservationsSeeded();
      if (seeded) {
        const retry = await supabase
          .from('reservations')
          .select('*, rooms(name)', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(from, to);
        if (!retry.error) {
          data = retry.data;
          count = retry.count;
        }
      }
    }

    if (error) {
      console.error('Error al consultar reservas en Supabase:', error);
      if (error.code === 'PGRST205' || error.message.includes('public.reservations')) {
        return res.json({
          success: true,
          data: [],
          pagination: { page: 1, limit, totalRecords: 0, totalPages: 1, hasNext: false, hasPrev: false },
          message: 'La tabla "reservations" no existe aún en tu base de datos de Supabase. Por favor ejecuta el script schema.sql en el SQL Editor de Supabase.'
        });
      }
      return res.status(500).json({ error: 'Error al consultar reservas en la base de datos.' });
    }

    const totalRecords = count || 0;
    const totalPages = Math.ceil(totalRecords / limit) || 1;

    return res.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (err) {
    console.error('Error en listado de reservas admin:', err);
    return res.status(500).json({ error: 'Error del servidor al obtener las reservas.' });
  }
});

/**
 * POST /api/admin/reservations
 * Crear una reserva manual desde el Dashboard (Booking.com, Airbnb, etc.)
 */
router.post('/reservations', requireAdminAuth, async (req, res) => {
  try {
    const {
      channel = 'Reserva Directa',
      room_id,
      guest_name,
      guest_email,
      guest_phone,
      check_in,
      check_out,
      adults = 1,
      children = 0,
      status = 'confirmed',
      total_price = 0,
      notes = ''
    } = req.body;

    if (!guest_name || !check_in || !check_out) {
      return res.status(400).json({ error: 'Proporcione al menos Nombre del huésped, Check-in y Check-out.' });
    }

    // Validar formato UUID para evitar errores de sintaxis en PostgreSQL
    const isValidUUID = (str) => {
      if (!str || typeof str !== 'string') return false;
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str.trim());
    };

    const cleanRoomId = isValidUUID(room_id) ? room_id.trim() : null;

    const newReservation = {
      channel,
      room_id: cleanRoomId,
      guest_name,
      guest_email: guest_email || 'sin-email@manual.local',
      guest_phone: guest_phone || 'Sin teléfono',
      check_in,
      check_out,
      adults: parseInt(adults, 10),
      children: parseInt(children, 10),
      status,
      total_price: parseFloat(total_price) || 0,
      notes
    };

    let created = { ...newReservation, id: 'res-manual-' + Date.now(), created_at: new Date().toISOString() };

    if (hasSupabaseConfigured) {
      const { data, error } = await supabase
        .from('reservations')
        .insert([newReservation])
        .select('*, rooms(name)');

      if (error) {
        console.error('Error creando reserva manual en Supabase:', error);
        return res.status(500).json({ 
          error: `Error al registrar en base de datos: ${error.message} (${error.details || error.code || ''})` 
        });
      }

      if (data && data.length > 0) {
        created = data[0];
      }
    }

    return res.status(201).json({
      success: true,
      message: `Reserva manual (${channel}) creada exitosamente.`,
      reservation: created
    });

  } catch (err) {
    console.error('Error registrando reserva manual:', err);
    return res.status(500).json({ error: `Error del servidor: ${err.message}` });
  }
});

/**
 * PUT /api/admin/reservations/:id
 * Editar una reserva o bloqueo existente (Protegida)
 */
router.put('/reservations/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      channel,
      room_id,
      guest_name,
      guest_email,
      guest_phone,
      check_in,
      check_out,
      adults,
      children,
      status,
      total_price,
      notes
    } = req.body;

    if (!guest_name || !check_in || !check_out) {
      return res.status(400).json({ error: 'Proporcione al menos Nombre, Check-in y Check-out.' });
    }

    const isValidUUID = (str) => {
      if (!str || typeof str !== 'string') return false;
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str.trim());
    };

    const cleanRoomId = isValidUUID(room_id) ? room_id.trim() : null;

    const updates = {
      guest_name,
      check_in,
      check_out,
      updated_at: new Date().toISOString()
    };

    if (channel !== undefined) updates.channel = channel;
    if (cleanRoomId !== null) updates.room_id = cleanRoomId;
    if (guest_email !== undefined) updates.guest_email = guest_email;
    if (guest_phone !== undefined) updates.guest_phone = guest_phone;
    if (adults !== undefined) updates.adults = parseInt(adults, 10);
    if (children !== undefined) updates.children = parseInt(children, 10);
    if (status !== undefined) updates.status = status;
    if (total_price !== undefined) updates.total_price = parseFloat(total_price) || 0;
    if (notes !== undefined) updates.notes = notes;

    let updatedReservation = { id, ...updates };

    if (hasSupabaseConfigured) {
      const { data, error } = await supabase
        .from('reservations')
        .update(updates)
        .eq('id', id)
        .select('*, rooms(name)');

      if (error) {
        console.error('Error actualizando reserva en Supabase:', error);
        return res.status(500).json({ error: `Error en base de datos: ${error.message}` });
      }

      if (data && data.length > 0) {
        updatedReservation = data[0];
      }
    }

    return res.json({
      success: true,
      message: 'Reserva/bloqueo actualizado exitosamente.',
      reservation: updatedReservation
    });

  } catch (err) {
    console.error('Error editando reserva:', err);
    return res.status(500).json({ error: `Error del servidor: ${err.message}` });
  }
});



/**
 * PATCH /api/admin/reservations/:id/status
 * Actualizar el estado de una reserva (Protegida)
 */
router.patch('/reservations/:id/status', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Estado inválido. Debe ser: pending, confirmed, cancelled, o completed.' });
    }

    let updatedReservation = null;
    let roomName = 'Habitación Omikika';

    if (hasSupabaseConfigured) {
      const { data, error } = await supabase
        .from('reservations')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*, rooms(name)');

      if (error) {
        console.error('Error actualizando estado en Supabase:', error);
        return res.status(500).json({ error: 'No se pudo actualizar el estado de la reserva.' });
      }

      if (data && data.length > 0) {
        updatedReservation = data[0];
        roomName = updatedReservation.rooms ? updatedReservation.rooms.name : roomName;
      }
    } else {
      updatedReservation = {
        id,
        status,
        guest_name: 'Huésped',
        guest_email: 'guest@example.com',
        check_in: '2026-08-01',
        check_out: '2026-08-05'
      };
    }

    // Notificar al huésped por email sobre la actualización de su reserva
    if (updatedReservation && (status === 'confirmed' || status === 'cancelled')) {
      sendStatusUpdateEmail(updatedReservation, roomName, status);
    }

    return res.json({
      success: true,
      message: `El estado de la reserva se ha actualizado a: ${status}`,
      reservation: updatedReservation
    });

  } catch (err) {
    console.error('Error actualizando estado de reserva:', err);
    return res.status(500).json({ error: 'Error interno al actualizar la reserva.' });
  }
});

/**
 * DELETE /api/admin/reservations/:id
 * Eliminar una reserva (Protegida)
 */
router.delete('/reservations/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (hasSupabaseConfigured) {
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error eliminando reserva en Supabase:', error);
        return res.status(500).json({ error: 'No se pudo eliminar la reserva en la base de datos.' });
      }
    }

    return res.json({
      success: true,
      message: 'La reserva ha sido eliminada con éxito.'
    });

  } catch (err) {
    console.error('Error eliminando reserva:', err);
    return res.status(500).json({ error: 'Error interno al eliminar la reserva.' });
  }
});

/**
 * GET /api/admin/stats
 * Métricas generales para las tarjetas KPI del Dashboard (Protegida)
 */
router.get('/stats', requireAdminAuth, async (req, res) => {
  try {
    if (hasSupabaseConfigured) {
      let { data, error } = await supabase.from('reservations').select('status, total_price, channel');
      if (!error && (!data || data.length === 0)) {
        const seeded = await ensureInitialReservationsSeeded();
        if (seeded) {
          const retry = await supabase.from('reservations').select('status, total_price, channel');
          if (!retry.error) data = retry.data;
        }
      }

      if (!error && data) {
        const total = data.length;
        const pending = data.filter(r => r.status === 'pending').length;
        const confirmed = data.filter(r => r.status === 'confirmed').length;
        const cancelled = data.filter(r => r.status === 'cancelled').length;
        const revenue = data
          .filter(r => r.status === 'confirmed' || r.status === 'completed')
          .reduce((sum, r) => sum + Number(r.total_price || 0), 0);

        // Calcular distribución de canales
        const channels = {};
        data.forEach(r => {
          const ch = r.channel || 'Sitio Web';
          channels[ch] = (channels[ch] || 0) + 1;
        });

        return res.json({
          success: true,
          stats: { total, pending, confirmed, cancelled, revenue, channels }
        });
      } else if (error) {
        console.error('Error al obtener stats de Supabase:', error);
        return res.json({
          success: true,
          stats: { total: 0, pending: 0, confirmed: 0, cancelled: 0, revenue: 0, channels: {} }
        });
      }
    }

    return res.json({
      success: true,
      stats: { 
        total: 35, 
        pending: 9, 
        confirmed: 18, 
        cancelled: 4, 
        revenue: 1450000,
        channels: {
          'Booking.com': 15,
          'Airbnb': 10,
          'Reserva Directa': 6,
        }
      }
    });
  } catch (err) {
    console.error('Error al obtener métricas:', err);
    return res.status(500).json({ error: 'Error al obtener métricas.' });
  }
});

/**
 * GET /api/admin/guests
 * Obtener listado de huéspedes agregados con total de estadías e ingresos (Protegida)
 */
router.get('/guests', requireAdminAuth, async (req, res) => {
  try {
    let reservations = [];

    if (hasSupabaseConfigured) {
      const { data, error } = await supabase
        .from('reservations')
        .select('guest_name, guest_email, guest_phone, total_price, status, check_in');

      if (error) {
        console.error('Error al obtener reservas para huéspedes:', error);
        return res.status(500).json({ error: `Error en base de datos: ${error.message}` });
      }
      reservations = data || [];
    } else {
      // Mock data local si no hay conexión
      reservations = Array.from({ length: 25 }).map((_, i) => ({
        guest_name: `Huésped Demo ${i % 5 + 1}`,
        guest_email: `cliente${i % 5 + 1}@ejemplo.com`,
        guest_phone: `+56 9 1234 567${i % 5}`,
        total_price: 45000 * ((i % 3) + 1),
        status: i % 4 === 0 ? 'pending' : (i % 4 === 1 ? 'confirmed' : 'completed'),
        check_in: `2026-07-${String((i % 20) + 1).padStart(2, '0')}`
      }));
    }

    // Agregar huéspedes en memoria
    const guestsMap = {};
    reservations.forEach(r => {
      const email = (r.guest_email || '').trim().toLowerCase();
      if (!email) return;

      const name = r.guest_name || 'Huésped sin nombre';
      const phone = r.guest_phone || 'Sin teléfono';

      if (!guestsMap[email]) {
        guestsMap[email] = {
          name,
          email,
          phone,
          total_reservations: 0,
          total_spent: 0,
          last_stay: r.check_in
        };
      }

      guestsMap[email].total_reservations++;

      // Sumar ingresos solo de reservas válidas
      if (r.status === 'confirmed' || r.status === 'completed') {
        guestsMap[email].total_spent += Number(r.total_price || 0);
      }

      // Última fecha de check-in
      if (new Date(r.check_in) > new Date(guestsMap[email].last_stay)) {
        guestsMap[email].last_stay = r.check_in;
      }
    });

    const guestsList = Object.values(guestsMap);

    return res.json({
      success: true,
      data: guestsList
    });

  } catch (err) {
    console.error('Error al obtener huéspedes:', err);
    return res.status(500).json({ error: `Error del servidor: ${err.message}` });
  }
});

// Cache temporal en memoria de tarifas y overrides si falla Supabase
let mockRoomPrices = [];
let mockRoomsOverride = {};

/**
 * PATCH /api/admin/rooms/:id
 * Actualizar configuración de la habitación (Precio base e is_active)
 */
router.patch('/rooms/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { price_per_night, is_active } = req.body;

    if (price_per_night === undefined && is_active === undefined) {
      return res.status(400).json({ error: 'No se enviaron propiedades para actualizar.' });
    }

    const updates = {};
    if (price_per_night !== undefined) updates.price_per_night = Number(price_per_night);
    if (is_active !== undefined) updates.is_active = Boolean(is_active);

    let updated = null;

    if (hasSupabaseConfigured) {
      const { data, error } = await supabase
        .from('rooms')
        .update(updates)
        .eq('id', id)
        .select('*');

      if (!error && data && data.length > 0) {
        updated = data[0];
      } else if (error) {
        console.error('Error al actualizar habitación en Supabase:', error);
      }
    }

    // Fallback local
    mockRoomsOverride[id] = {
      ...(mockRoomsOverride[id] || {}),
      ...updates
    };

    if (!updated) {
      updated = {
        id,
        price_per_night: updates.price_per_night !== undefined ? updates.price_per_night : 45000,
        is_active: updates.is_active !== undefined ? updates.is_active : true,
        name: 'Habitación de Respaldo'
      };
    }

    return res.json({
      success: true,
      message: 'Configuración de habitación actualizada con éxito.',
      room: updated
    });

  } catch (err) {
    console.error('Error al actualizar habitación:', err);
    return res.status(500).json({ error: `Error interno del servidor: ${err.message}` });
  }
});

/**
 * POST /api/admin/rooms/:id/prices
 * Definir precio especial para un día específico
 */
router.post('/rooms/:id/prices', requireAdminAuth, async (req, res) => {
  try {
    const { id: room_id } = req.params;
    const { date, price } = req.body;

    if (!date || price === undefined) {
      return res.status(400).json({ error: 'Se requiere fecha y precio.' });
    }

    const priceNum = Number(price);
    if (isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({ error: 'El precio debe ser un número válido mayor o igual a 0.' });
    }

    let createdOrUpdated = { room_id, date, price: priceNum };

    if (hasSupabaseConfigured) {
      const { data, error } = await supabase
        .from('room_prices')
        .upsert({ room_id, date, price: priceNum }, { onConflict: 'room_id,date' })
        .select('*');

      if (!error && data && data.length > 0) {
        createdOrUpdated = data[0];
      } else if (error) {
        console.error('Error al guardar precio especial en Supabase:', error);
        if (error.code !== 'PGRST205') {
          return res.status(500).json({ error: `Error en base de datos: ${error.message}` });
        }
      }
    }

    // Sincronizar en memoria
    mockRoomPrices = mockRoomPrices.filter(p => !(p.room_id === room_id && p.date === date));
    mockRoomPrices.push({ room_id, date, price: priceNum });

    return res.json({
      success: true,
      message: `Tarifa de $${priceNum.toLocaleString('es-CL')} CLP asignada al día ${date}.`,
      price: createdOrUpdated
    });

  } catch (err) {
    console.error('Error al guardar precio diario:', err);
    return res.status(500).json({ error: `Error interno del servidor: ${err.message}` });
  }
});

/**
 * DELETE /api/admin/rooms/:id/prices/:date
 * Eliminar precio especial para una fecha específica
 */
router.delete('/rooms/:id/prices/:date', requireAdminAuth, async (req, res) => {
  try {
    const { id: room_id, date } = req.params;

    if (hasSupabaseConfigured) {
      const { error } = await supabase
        .from('room_prices')
        .delete()
        .eq('room_id', room_id)
        .eq('date', date);

      if (error && error.code !== 'PGRST205') {
        console.error('Error al borrar precio especial en Supabase:', error);
        return res.status(500).json({ error: `Error en base de datos: ${error.message}` });
      }
    }

    mockRoomPrices = mockRoomPrices.filter(p => !(p.room_id === room_id && p.date === date));

    return res.json({
      success: true,
      message: 'Tarifa especial eliminada con éxito.'
    });

  } catch (err) {
    console.error('Error al borrar precio diario:', err);
    return res.status(500).json({ error: `Error interno del servidor: ${err.message}` });
  }
});

/**
 * GET /api/admin/rooms/:id/calendar
 * Obtener calendario de ocupación y tarifas diarias por 30 días
 */
router.get('/rooms/:id/calendar', requireAdminAuth, async (req, res) => {
  try {
    const { id: room_id } = req.params;
    const { start_date } = req.query;

    const start = start_date ? new Date(start_date + 'T00:00:00') : new Date();
    if (isNaN(start.getTime())) {
      return res.status(400).json({ error: 'La fecha de inicio no es válida.' });
    }

    let basePrice = 45000;
    let roomName = 'Habitación';
    if (hasSupabaseConfigured) {
      const { data: room, error: roomErr } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', room_id)
        .single();
      if (!roomErr && room) {
        basePrice = Number(room.price_per_night);
        roomName = room.name;
      }
    }

    if (mockRoomsOverride[room_id]) {
      if (mockRoomsOverride[room_id].price_per_night !== undefined) {
        basePrice = mockRoomsOverride[room_id].price_per_night;
      }
    }

    const dates = [];
    const dateStrings = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const str = d.toISOString().split('T')[0];
      dates.push(str);
      dateStrings.push(str);
    }

    let specialPrices = [];
    if (hasSupabaseConfigured) {
      const { data, error } = await supabase
        .from('room_prices')
        .select('date, price')
        .eq('room_id', room_id)
        .in('date', dateStrings);

      if (!error && data) {
        specialPrices = data;
      }
    }

    const mergedPrices = {};
    mockRoomPrices.forEach(p => {
      if (p.room_id === room_id) {
        mergedPrices[p.date] = p.price;
      }
    });
    specialPrices.forEach(p => {
      mergedPrices[p.date] = Number(p.price);
    });

    const minDate = dateStrings[0];
    const maxDate = dateStrings[dateStrings.length - 1];

    let reservations = [];
    if (hasSupabaseConfigured) {
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('room_id', room_id)
        .neq('status', 'cancelled')
        .lte('check_in', maxDate)
        .gte('check_out', minDate);

      if (!error && data) {
        reservations = data;
      }
    }

    const calendar = dates.map(dateStr => {
      const targetDate = new Date(dateStr + 'T00:00:00');
      const reservation = reservations.find(r => {
        const inDate = new Date(r.check_in + 'T00:00:00');
        const outDate = new Date(r.check_out + 'T00:00:00');
        return targetDate >= inDate && targetDate < outDate;
      });

      const price = mergedPrices[dateStr] !== undefined ? mergedPrices[dateStr] : basePrice;
      const isSpecial = mergedPrices[dateStr] !== undefined;

      return {
        date: dateStr,
        price,
        isSpecial,
        available: !reservation,
        reservation: reservation ? {
          guest_name: reservation.guest_name,
          status: reservation.status,
          channel: reservation.channel,
          check_in: reservation.check_in,
          check_out: reservation.check_out
        } : null
      };
    });

    return res.json({
      success: true,
      room_id,
      room_name: roomName,
      calendar
    });

  } catch (err) {
    console.error('Error al generar calendario de habitación:', err);
    return res.status(500).json({ error: `Error del servidor: ${err.message}` });
  }
});

export default router;
