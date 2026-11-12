import express from 'express';
import crypto from 'crypto';
import { supabase, hasSupabaseConfigured } from '../config/supabase.js';
import { requireAdminAuth } from '../middleware/auth.js';
import { sendPrivacyRequestEmails } from '../services/emailService.js';

const router = express.Router();

const VALID_REQUEST_TYPES = [
  'access',
  'rectification',
  'erasure',
  'objection',
  'portability',
  'blocking'
];

const VALID_STATUSES = ['pending', 'in_review', 'completed', 'rejected'];

// Fallback en memoria si la tabla privacy_requests aún no ha sido creada en Supabase
let memoryPrivacyRequests = [];

const addBusinessDays = (startDate, days) => {
  const result = new Date(startDate);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) {
      added++;
    }
  }
  return result.toISOString().split('T')[0];
};

const generateTrackingCode = () => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randPart = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `ARCOP-${datePart}-${randPart}`;
};

/**
 * POST /api/privacy-requests
 * Recibe solicitudes de derechos ARCOP + Bloqueo conforme a la Ley N° 21.719 (Público)
 */
router.post('/', async (req, res) => {
  try {
    const {
      request_type,
      full_name,
      email,
      phone = '',
      rut_or_id = '',
      details,
      privacy_consent,
      consent_version = '2026-11'
    } = req.body;

    if (!request_type || !VALID_REQUEST_TYPES.includes(request_type)) {
      return res.status(400).json({ error: 'Seleccione un tipo de derecho ARCOP válido.' });
    }

    if (!full_name || !email || !details) {
      return res.status(400).json({ error: 'Complete su nombre completo, correo electrónico y el detalle de su solicitud.' });
    }

    if (privacy_consent !== true) {
      return res.status(400).json({ error: 'Debe aceptar la Política de Privacidad para procesar su solicitud de derechos.' });
    }

    const emailNormalized = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalized)) {
      return res.status(400).json({ error: 'Ingrese un correo electrónico válido.' });
    }

    const tracking_code = generateTrackingCode();
    const due_date = addBusinessDays(new Date(), 15);

    const newRequest = {
      tracking_code,
      request_type,
      full_name: String(full_name).trim(),
      email: emailNormalized,
      phone: phone ? String(phone).trim() : null,
      rut_or_id: rut_or_id ? String(rut_or_id).trim() : null,
      details: String(details).trim(),
      privacy_consent: true,
      consent_version: String(consent_version || '2026-11'),
      status: 'pending',
      due_date
    };

    let created = {
      id: `priv-${Date.now()}`,
      ...newRequest,
      created_at: new Date().toISOString()
    };

    if (hasSupabaseConfigured) {
      const { data, error } = await supabase
        .from('privacy_requests')
        .insert([newRequest])
        .select('*');

      if (error) {
        if (error.code === 'PGRST205') {
          console.warn('[LEY 21.719] Tabla privacy_requests aún no existe en Supabase; guardando respaldo temporal en memoria.');
          memoryPrivacyRequests.unshift(created);
        } else {
          console.error('Error registrando solicitud ARCOP en Supabase:', error);
          return res.status(500).json({ error: 'No se pudo registrar su solicitud en este momento. Inténtelo nuevamente.' });
        }
      } else if (data && data.length > 0) {
        created = data[0];
      }
    } else {
      memoryPrivacyRequests.unshift(created);
    }

    sendPrivacyRequestEmails(created);

    return res.status(201).json({
      success: true,
      message: `Solicitud registrada con código ${created.tracking_code}. Responderemos dentro del plazo legal (máximo ${due_date}).`,
      request: {
        id: created.id,
        tracking_code: created.tracking_code,
        request_type: created.request_type,
        due_date: created.due_date,
        status: created.status
      }
    });
  } catch (err) {
    console.error('Error en POST /api/privacy-requests:', err);
    return res.status(500).json({ error: 'Error interno al procesar la solicitud de privacidad.' });
  }
});

/**
 * GET /api/privacy-requests/admin
 * Listar todas las solicitudes ARCOP (Protegida)
 */
router.get('/admin', requireAdminAuth, async (req, res) => {
  try {
    if (hasSupabaseConfigured) {
      const { data, error } = await supabase
        .from('privacy_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST205') {
          return res.json({
            success: true,
            data: memoryPrivacyRequests,
            tableMissing: true
          });
        }
        console.error('Error leyendo solicitudes ARCOP en Supabase:', error);
        return res.status(500).json({ error: 'Error al consultar solicitudes de privacidad.' });
      }

      return res.json({
        success: true,
        data: data || []
      });
    }

    return res.json({
      success: true,
      data: memoryPrivacyRequests
    });
  } catch (err) {
    console.error('Error en GET /api/privacy-requests/admin:', err);
    return res.status(500).json({ error: 'Error interno al obtener solicitudes de privacidad.' });
  }
});

/**
 * PATCH /api/privacy-requests/admin/:id
 * Actualizar estado y notas de una solicitud ARCOP (Protegida)
 */
router.patch('/admin/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Estado inválido.' });
    }

    const updates = {
      updated_at: new Date().toISOString()
    };
    if (status) {
      updates.status = status;
      if (status === 'completed' || status === 'rejected') {
        updates.resolved_at = new Date().toISOString();
      }
    }
    if (admin_notes !== undefined) {
      updates.admin_notes = String(admin_notes).trim();
    }

    if (hasSupabaseConfigured) {
      const { data, error } = await supabase
        .from('privacy_requests')
        .update(updates)
        .eq('id', id)
        .select('*');

      if (error && error.code !== 'PGRST205') {
        console.error('Error actualizando solicitud ARCOP:', error);
        return res.status(500).json({ error: 'No se pudo actualizar la solicitud.' });
      }
      if (data && data.length > 0) {
        return res.json({ success: true, request: data[0] });
      }
    }

    const memItem = memoryPrivacyRequests.find(item => String(item.id) === String(id));
    if (!memItem) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }
    Object.assign(memItem, updates);
    return res.json({ success: true, request: memItem });
  } catch (err) {
    console.error('Error en PATCH /api/privacy-requests/admin/:id:', err);
    return res.status(500).json({ error: 'Error al actualizar solicitud ARCOP.' });
  }
});

/**
 * GET /api/privacy-requests/admin/export?email=...
 * Exportar todos los datos personales asociados a un titular en formato JSON (Derecho de Portabilidad - Ley 21.719)
 */
router.get('/admin/export', requireAdminAuth, async (req, res) => {
  try {
    const email = (req.query.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'Debe proporcionar el correo del titular (?email=...).' });
    }

    let reservations = [];
    let inquiries = [];
    let privacyRequests = [];

    if (hasSupabaseConfigured) {
      const [resResult, inqResult, privResult] = await Promise.all([
        supabase.from('reservations').select('*, rooms(name)').ilike('guest_email', email),
        supabase.from('inquiries').select('*').ilike('email', email),
        supabase.from('privacy_requests').select('*').ilike('email', email)
      ]);

      if (resResult.error) {
        return res.status(500).json({ error: 'Error consultando reservas del titular.' });
      }
      if (inqResult.error && inqResult.error.code !== 'PGRST205') {
        return res.status(500).json({ error: 'Error consultando consultas del titular.' });
      }

      reservations = resResult.data || [];
      inquiries = inqResult.data || [];
      privacyRequests = (!privResult.error && privResult.data) ? privResult.data : [];
    }

    const portableBundle = {
      schema_version: 'ley-21719-portabilidad-v1',
      exported_at: new Date().toISOString(),
      data_controller: {
        name: 'Omikika B&B',
        address: 'Valentín Letelier 1055, Villarrica, Chile',
        contact_email: 'reservas@omikika.cl'
      },
      data_subject_email: email,
      reservations,
      inquiries,
      privacy_requests: privacyRequests
    };

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="portabilidad-${email.replace(/[^a-z0-9]/gi, '_')}.json"`);
    return res.send(JSON.stringify(portableBundle, null, 2));
  } catch (err) {
    console.error('Error en portabilidad de datos:', err);
    return res.status(500).json({ error: 'Error al generar exportación de portabilidad.' });
  }
});

/**
 * POST /api/privacy-requests/admin/anonymize
 * Suprimir / anonimizar datos personales de un titular (Derecho de Supresión/Cancelación - Ley 21.719)
 */
router.post('/admin/anonymize', requireAdminAuth, async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'Debe proporcionar el correo del titular a suprimir/anonimizar.' });
    }

    const hash = crypto.createHash('sha256').update(email + Date.now()).digest('hex').slice(0, 12);
    const anonymizedEmail = `suprimido-${hash}@anonimizado.local`;

    let updatedReservations = 0;
    let deletedInquiries = 0;

    if (hasSupabaseConfigured) {
      const { data: resData, error: resErr } = await supabase
        .from('reservations')
        .update({
          guest_name: 'Titular Suprimido (Ley 21.719)',
          guest_email: anonymizedEmail,
          guest_phone: 'Suprimido',
          notes: '[Datos personales suprimidos conforme a solicitud ARCOP - Ley N° 21.719]',
          updated_at: new Date().toISOString()
        })
        .ilike('guest_email', email)
        .select('id');

      if (resErr) {
        console.error('Error anonimizando reservas:', resErr);
        return res.status(500).json({ error: 'Error al suprimir datos en reservas.' });
      }
      updatedReservations = resData ? resData.length : 0;

      const { data: inqData, error: inqErr } = await supabase
        .from('inquiries')
        .delete()
        .ilike('email', email)
        .select('id');

      if (inqErr && inqErr.code !== 'PGRST205') {
        console.error('Error eliminando consultas en supresión:', inqErr);
        return res.status(500).json({ error: 'Error al eliminar consultas del titular.' });
      }
      deletedInquiries = inqData ? inqData.length : 0;
    }

    return res.json({
      success: true,
      message: `Supresión completada: ${updatedReservations} reserva(s) anonimizada(s) y ${deletedInquiries} consulta(s) eliminada(s).`,
      updatedReservations,
      deletedInquiries
    });
  } catch (err) {
    console.error('Error en supresión de datos:', err);
    return res.status(500).json({ error: 'Error al suprimir datos personales.' });
  }
});

export default router;

