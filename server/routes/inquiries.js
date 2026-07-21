import express from 'express';
import { supabase } from '../config/supabase.js';
import { requireAdminAuth } from '../middleware/auth.js';

const router = express.Router();

// Mock array en memoria en caso de que Supabase no esté configurado
let mockInquiries = [
  {
    id: 'inq-mock-1',
    name: 'Carlos Mendoza',
    email: 'carlos@ejemplo.com',
    phone: '+56 9 8765 4321',
    subject: 'Consulta sobre reserva grupal',
    message: 'Hola, queremos reservar el hostal completo para un grupo de 12 personas a mediados de septiembre. ¿Tienen tarifas especiales?',
    status: 'new',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() // hace 3 horas
  },
  {
    id: 'inq-mock-2',
    name: 'Ana María Gómez',
    email: 'ana.maria@ejemplo.com',
    phone: '+56 9 1122 3344',
    subject: 'Estacionamiento y mascotas',
    message: 'Buenas tardes, quisiera consultar si tienen estacionamiento privado y si se permiten mascotas pequeñas de apoyo emocional.',
    status: 'read',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() // hace 1 día
  }
];

/**
 * POST /api/inquiries
 * Crear una nueva consulta / lead desde el formulario público (Público)
 */
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Por favor, complete los campos obligatorios: Nombre, Email y Mensaje.' });
    }

    const newInquiry = {
      name: name.trim(),
      email: email.trim(),
      phone: phone ? phone.trim() : null,
      subject: subject ? subject.trim() : 'Consulta general',
      message: message.trim(),
      status: 'new'
    };

    let created = { ...newInquiry, id: 'inq-manual-' + Date.now(), created_at: new Date().toISOString() };

    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      const { data, error } = await supabase
        .from('inquiries')
        .insert([newInquiry])
        .select('*');

      if (error) {
        console.error('Error al insertar consulta en Supabase:', error);
        return res.status(500).json({ error: `Error en base de datos: ${error.message}` });
      }

      if (data && data.length > 0) {
        created = data[0];
      }
    } else {
      // Guardar en mock local
      mockInquiries.unshift(created);
    }

    return res.status(201).json({
      success: true,
      message: 'Tu consulta ha sido enviada con éxito. Nos comunicaremos contigo pronto.',
      inquiry: created
    });

  } catch (err) {
    console.error('Error en creación de consulta:', err);
    return res.status(500).json({ error: `Error del servidor: ${err.message}` });
  }
});

/**
 * GET /api/inquiries/admin
 * Obtener listado de consultas / leads para el panel administrativo (Protegida)
 */
router.get('/admin', requireAdminAuth, async (req, res) => {
  try {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error al leer consultas de Supabase:', error);
        return res.status(500).json({ error: `Error en base de datos: ${error.message}` });
      }

      return res.json({
        success: true,
        data: data || []
      });
    }

    return res.json({
      success: true,
      data: mockInquiries
    });

  } catch (err) {
    console.error('Error al obtener consultas admin:', err);
    return res.status(500).json({ error: `Error del servidor: ${err.message}` });
  }
});

/**
 * PATCH /api/inquiries/admin/:id/status
 * Actualizar el estado de una consulta (Protegida)
 */
router.patch('/admin/:id/status', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['new', 'read', 'replied'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Estado de consulta inválido. Debe ser: new, read, o replied.' });
    }

    let updated = null;

    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      const { data, error } = await supabase
        .from('inquiries')
        .update({ status })
        .eq('id', id)
        .select('*');

      if (error) {
        console.error('Error actualizando estado de consulta en Supabase:', error);
        return res.status(500).json({ error: `Error en base de datos: ${error.message}` });
      }

      if (data && data.length > 0) {
        updated = data[0];
      }
    } else {
      const inq = mockInquiries.find(i => i.id === id);
      if (inq) {
        inq.status = status;
        updated = inq;
      }
    }

    if (!updated) {
      return res.status(404).json({ error: 'Consulta no encontrada.' });
    }

    return res.json({
      success: true,
      message: `El estado de la consulta se actualizó a: ${status}`,
      inquiry: updated
    });

  } catch (err) {
    console.error('Error actualizando consulta:', err);
    return res.status(500).json({ error: `Error del servidor: ${err.message}` });
  }
});

export default router;
