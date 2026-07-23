import express from 'express';
import { supabase } from '../config/supabase.js';
import { sendGuestReservationEmail, sendAdminNotificationEmail } from '../services/emailService.js';

const router = express.Router();

// Helper para calcular noches
const calculateNights = (checkInStr, checkOutStr) => {
  const start = new Date(checkInStr);
  const end = new Date(checkOutStr);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 1;
};

/**
 * POST /api/reservations
 * Crear una nueva reserva desde el frontend público
 */
router.post('/', async (req, res) => {
  try {
    const {
      room_id,
      room_name,
      guest_name,
      guest_email,
      guest_phone,
      check_in,
      check_out,
      adults = 1,
      children = 0,
      notes = ''
    } = req.body;

    // 1. Validaciones básicas
    if (!guest_name || !guest_email || !guest_phone || !check_in || !check_out) {
      return res.status(400).json({ error: 'Por favor complete todos los campos obligatorios.' });
    }

    const startDate = new Date(check_in);
    const endDate = new Date(check_out);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Las fechas proporcionadas no son válidas.' });
    }

    if (startDate >= endDate) {
      return res.status(400).json({ error: 'La fecha de Check-out debe ser posterior a la fecha de Check-in.' });
    }

    let targetRoomId = room_id;
    let targetRoomName = room_name || 'Habitación Omikika';
    let pricePerNight = 45000;

    // 2. Buscar habitación en Supabase si se configuró BBDD
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      let query = supabase.from('rooms').select('*');
      if (room_id) {
        query = query.eq('id', room_id);
      } else if (room_name) {
        const cleanName = room_name.replace(/\s*\(\d+\s*m²\)/gi, '').trim();
        query = query.ilike('name', `%${cleanName}%`);
      }

      const { data: roomsFound, error: roomError } = await query;
      if (!roomError && roomsFound && roomsFound.length > 0) {
        targetRoomId = roomsFound[0].id;
        targetRoomName = roomsFound[0].name;
        pricePerNight = roomsFound[0].price_per_night || pricePerNight;
      }

      // 3. Validar disponibilidad (Solapamiento de fechas con reservas o bloqueos)
      if (targetRoomId) {
        const { data: overlap, error: overlapErr } = await supabase
          .from('reservations')
          .select('id')
          .eq('room_id', targetRoomId)
          .in('status', ['confirmed', 'blocked'])
          .lt('check_in', check_out)
          .gt('check_out', check_in);

        if (!overlapErr && overlap && overlap.length > 0) {
          return res.status(409).json({
            error: 'La habitación no se encuentra disponible para las fechas seleccionadas. Por favor elija otras fechas.'
          });
        }
      }
    }

    // Calcular noches y precio total día por día sumando tarifas especiales si existen
    const daysList = [];
    let currentDay = new Date(check_in + 'T00:00:00');
    const endDay = new Date(check_out + 'T00:00:00');
    while (currentDay < endDay) {
      daysList.push(currentDay.toISOString().split('T')[0]);
      currentDay.setDate(currentDay.getDate() + 1);
    }

    const nights = daysList.length > 0 ? daysList.length : 1;
    let totalPrice = 0;

    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && targetRoomId) {
      try {
        const { data: customPrices, error: cpErr } = await supabase
          .from('room_prices')
          .select('date, price')
          .eq('room_id', targetRoomId)
          .in('date', daysList);

        const priceMap = {};
        if (!cpErr && customPrices) {
          customPrices.forEach(cp => {
            priceMap[cp.date] = Number(cp.price);
          });
        }

        daysList.forEach(d => {
          if (priceMap[d] !== undefined) {
            totalPrice += priceMap[d];
          } else {
            totalPrice += Number(pricePerNight);
          }
        });
      } catch (err) {
        console.error('Error calculando tarifas diarias especiales:', err);
        totalPrice = nights * pricePerNight;
      }
    } else {
      totalPrice = nights * pricePerNight;
    }

    const newReservationData = {
      room_id: targetRoomId || null,
      channel: 'Sitio Web',
      guest_name,
      guest_email,
      guest_phone,
      check_in,
      check_out,
      adults: parseInt(adults, 10),
      children: parseInt(children, 10),
      status: 'pending',
      total_price: totalPrice,
      notes
    };

    let createdReservation = { ...newReservationData, id: 'res-' + Date.now() };

    // 4. Insertar en Supabase si está activo
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      const { data: inserted, error: insertError } = await supabase
        .from('reservations')
        .insert([newReservationData])
        .select();

      if (insertError) {
        console.error('Error insertando reserva en Supabase:', insertError);
      } else if (inserted && inserted.length > 0) {
        createdReservation = inserted[0];
      }
    }

    // 5. Enviar notificaciones por correo con Resend
    sendGuestReservationEmail(createdReservation, targetRoomName);
    sendAdminNotificationEmail(createdReservation, targetRoomName);

    return res.status(201).json({
      success: true,
      message: '¡Tu solicitud de reserva ha sido enviada con éxito! Te enviamos un correo con los detalles.',
      reservation: createdReservation
    });

  } catch (err) {
    console.error('Error procesando reserva:', err);
    return res.status(500).json({ error: 'Ocurrió un error al procesar tu reserva. Inténtalo nuevamente.' });
  }
});

/**
 * GET /api/reservations/check-availability
 * Consultar si hay disponibilidad
 */
router.get('/check-availability', async (req, res) => {
  try {
    const { room_id, check_in, check_out } = req.query;
    if (!check_in || !check_out) {
      return res.status(400).json({ error: 'Debe especificar check_in y check_out.' });
    }

    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && room_id) {
      const { data: overlap, error } = await supabase
        .from('reservations')
        .select('id')
        .eq('room_id', room_id)
        .in('status', ['confirmed', 'blocked'])
        .lt('check_in', check_out)
        .gt('check_out', check_in);

      if (!error && overlap) {
        return res.json({ available: overlap.length === 0 });
      }
    }

    return res.json({ available: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error al consultar disponibilidad.' });
  }
});

/**
 * GET /api/reservations/booked-dates
 * Devuelve todas las fechas reservadas o bloqueadas para deshabilitarlas en el calendario del sitio web
 */
router.get('/booked-dates', async (req, res) => {
  try {
    const { room_id, room_name } = req.query;

    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      let targetRoomId = room_id;

      // Si nos envían el nombre de la habitación (ej: 'Apartamento - Planta baja (70 m²)'), buscamos su UUID en Supabase
      if (!targetRoomId && room_name && !room_name.includes('Seleccionar')) {
        const cleanName = room_name.replace(/\s*\(\d+\s*m²\)/gi, '').trim();
        const { data: roomsFound } = await supabase
          .from('rooms')
          .select('id')
          .ilike('name', `%${cleanName}%`);

        if (roomsFound && roomsFound.length > 0) {
          targetRoomId = roomsFound[0].id;
        } else {
          // Si no se encuentra la habitación especificada, devolvemos sin fechas bloqueadas
          return res.json({ success: true, bookedDates: [] });
        }
      }

      // Si no se ha especificado ninguna habitación válida, devolvemos lista vacía
      if (!targetRoomId) {
        return res.json({ success: true, bookedDates: [] });
      }

      const { data, error } = await supabase
        .from('reservations')
        .select('check_in, check_out, room_id, status')
        .eq('room_id', targetRoomId)
        .in('status', ['confirmed', 'blocked']);

      if (!error && data) {
        const bookedDates = data.map(r => [r.check_in, r.check_out]);
        return res.json({ success: true, bookedDates, room_id: targetRoomId });
      }
    }

    return res.json({ success: true, bookedDates: [] });
  } catch (err) {
    console.error('Error al obtener fechas reservadas:', err);
    return res.json({ success: true, bookedDates: [] });
  }
});

/**
 * GET /api/reservations/calculate-price
 * Calcula el precio total de una reserva día por día considerando tarifas especiales
 */
router.get('/calculate-price', async (req, res) => {
  try {
    const { room_name, check_in, check_out } = req.query;

    if (!room_name || room_name.includes('Seleccionar') || !check_in || !check_out) {
      return res.status(400).json({ error: 'Faltan parámetros obligatorios.' });
    }

    const startDate = new Date(check_in);
    const endDate = new Date(check_out);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Fechas no válidas.' });
    }

    if (startDate >= endDate) {
      return res.status(400).json({ error: 'La fecha de check-out debe ser posterior.' });
    }

    let targetRoomId = null;
    let pricePerNight = 45000;

    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      const cleanName = room_name.replace(/\s*\(\d+\s*m²\)/gi, '').trim();
      const { data: roomsFound } = await supabase
        .from('rooms')
        .select('*')
        .ilike('name', `%${cleanName}%`);

      if (roomsFound && roomsFound.length > 0) {
        targetRoomId = roomsFound[0].id;
        pricePerNight = Number(roomsFound[0].price_per_night);
      }
    }

    const daysList = [];
    let currentDay = new Date(check_in + 'T00:00:00');
    const endDay = new Date(check_out + 'T00:00:00');
    while (currentDay < endDay) {
      daysList.push(currentDay.toISOString().split('T')[0]);
      currentDay.setDate(currentDay.getDate() + 1);
    }

    const nights = daysList.length;
    let totalPrice = 0;

    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && targetRoomId) {
      const { data: customPrices, error: cpErr } = await supabase
        .from('room_prices')
        .select('date, price')
        .eq('room_id', targetRoomId)
        .in('date', daysList);

      const priceMap = {};
      if (!cpErr && customPrices) {
        customPrices.forEach(cp => {
          priceMap[cp.date] = Number(cp.price);
        });
      }

      daysList.forEach(d => {
        if (priceMap[d] !== undefined) {
          totalPrice += priceMap[d];
        } else {
          totalPrice += Number(pricePerNight);
        }
      });
    } else {
      totalPrice = nights * pricePerNight;
    }

    return res.json({
      success: true,
      nights,
      totalPrice
    });

  } catch (err) {
    console.error('Error calculando precio de reserva pública:', err);
    return res.status(500).json({ error: 'Error al calcular el precio total.' });
  }
});

export default router;
