import express from 'express';
import { supabase, hasSupabaseConfigured } from '../config/supabase.js';
import { requireAdminAuth } from '../middleware/auth.js';

const router = express.Router();

// Fallback de recomendaciones para cuando Supabase aún no esté sincronizado
let memoryRecommendations = [
  {
    id: 'rec-1',
    name: 'Termas Geométricas',
    category: 'termas',
    description: 'Impresionante complejo termal con 20 pozas naturales de agua termal encajonadas en una quebrada boscosa en el Parque Nacional Villarrica.',
    phone: '+56 9 9876 5432',
    address: 'Km 16 Camino Coñaripe a Palguín',
    maps_url: 'https://maps.app.goo.gl/g2t18e7X3g',
    website_url: 'https://www.termasgeometricas.cl',
    instagram_url: 'https://instagram.com/termasgeometricas',
    image_url: '',
    is_active: true,
    display_order: 1,
    created_at: new Date().toISOString()
  },
  {
    id: 'rec-2',
    name: 'Termas de Menetúe',
    category: 'termas',
    description: 'Centro termal exclusivo rodeado de naturaleza con piscinas techadas y al aire libre, spa y restaurante.',
    phone: '+56 45 244 1900',
    address: 'Camino Internacional Km 30, Pucón',
    maps_url: 'https://maps.app.goo.gl/m3nETUe',
    website_url: 'https://www.menetue.cl',
    instagram_url: 'https://instagram.com/termasmenetue',
    image_url: '',
    is_active: true,
    display_order: 2,
    created_at: new Date().toISOString()
  },
  {
    id: 'rec-3',
    name: 'La Poza Pizza & Birra',
    category: 'restaurantes',
    description: 'Excelentes pizzas artesanales a la leña, gran selección de cervezas tiradas locales y excelente vista en Pucón.',
    phone: '+56 9 8765 4321',
    address: 'Av. Bernardo O\'Higgins 450, Pucón',
    maps_url: 'https://maps.app.goo.gl/lapozapizza',
    website_url: 'https://www.lapozapucon.cl',
    instagram_url: 'https://instagram.com/lapozapizza',
    image_url: '',
    is_active: true,
    display_order: 3,
    created_at: new Date().toISOString()
  },
  {
    id: 'rec-4',
    name: 'El Rincón Burguer Delivery',
    category: 'delivery',
    description: 'Las mejores hamburguesas gourmet a domicilio en la zona. Entrega rápida y pan artesanal recién horneado.',
    phone: '+56 9 1122 3344',
    address: 'Entrega a Domicilio / Omikika B&B',
    maps_url: 'https://maps.app.goo.gl/elrincon',
    website_url: '',
    instagram_url: 'https://instagram.com/elrinconburguer_pucon',
    image_url: '',
    is_active: true,
    display_order: 4,
    created_at: new Date().toISOString()
  },
  {
    id: 'rec-5',
    name: 'Parque Nacional Huerquehue',
    category: 'entretencion',
    description: 'Trekking espectacular entre alerces milenarios, lagunas cordilleranas y senderos naturales impresionantes.',
    phone: '+56 45 244 1000',
    address: 'Sector Tinquilco, Pucón',
    maps_url: 'https://maps.app.goo.gl/huerquehue',
    website_url: 'https://www.conaf.cl',
    instagram_url: 'https://instagram.com/conaf_chile',
    image_url: '',
    is_active: true,
    display_order: 5,
    created_at: new Date().toISOString()
  },
  {
    id: 'rec-6',
    name: 'Café de la Plaza & Pastelería',
    category: 'cafeterias',
    description: 'Café de especialidad, tortas caseras, kuchen alemán recién horneado y ambiente muy acogedor.',
    phone: '+56 9 3344 5566',
    address: 'Pedro de Valdivia 320, Pucón',
    maps_url: 'https://maps.app.goo.gl/cafedelaplaza',
    website_url: '',
    instagram_url: 'https://instagram.com/cafedelaplaza_pucon',
    image_url: '',
    is_active: true,
    display_order: 6,
    created_at: new Date().toISOString()
  }
];

/**
 * GET /api/recommendations
 * Obtener lista pública de recomendaciones activas
 */
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;

    if (hasSupabaseConfigured) {
      let query = supabase
        .from('recommendations')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (!error && data) {
        return res.json({ success: true, recommendations: data });
      }
    }

    // Fallback de memoria
    let filtered = memoryRecommendations.filter(r => r.is_active);
    if (category && category !== 'all') {
      filtered = filtered.filter(r => r.category === category);
    }
    filtered.sort((a, b) => a.display_order - b.display_order);

    return res.json({ success: true, recommendations: filtered, source: 'fallback' });
  } catch (err) {
    console.error('Error al obtener recomendaciones:', err);
    return res.status(500).json({ error: 'Error al cargar recomendaciones' });
  }
});

/**
 * GET /api/recommendations/admin
 * Obtener todas las recomendaciones (activas e inactivas) para el dashboard admin
 */
router.get('/admin', requireAdminAuth, async (req, res) => {
  try {
    if (hasSupabaseConfigured) {
      const { data, error } = await supabase
        .from('recommendations')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (!error && data) {
        return res.json({ success: true, recommendations: data });
      }
    }

    return res.json({ success: true, recommendations: memoryRecommendations });
  } catch (err) {
    console.error('Error admin recomendaciones:', err);
    return res.status(500).json({ error: 'Error al obtener recomendaciones para administración' });
  }
});

/**
 * POST /api/recommendations/admin
 * Crear una nueva recomendación
 */
router.post('/admin', requireAdminAuth, async (req, res) => {
  try {
    const {
      name,
      category,
      description,
      phone,
      address,
      maps_url,
      website_url,
      instagram_url,
      image_url,
      display_order,
      is_active
    } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: 'Nombre y categoría son requeridos.' });
    }

    const payload = {
      name: name.trim(),
      category: category.trim().toLowerCase(),
      description: description ? description.trim() : '',
      phone: phone ? phone.trim() : '',
      address: address ? address.trim() : '',
      maps_url: maps_url ? maps_url.trim() : '',
      website_url: website_url ? website_url.trim() : '',
      instagram_url: instagram_url ? instagram_url.trim() : '',
      image_url: image_url ? image_url.trim() : '',
      display_order: Number.isInteger(Number(display_order)) ? Number(display_order) : 0,
      is_active: is_active !== undefined ? Boolean(is_active) : true,
      updated_at: new Date().toISOString()
    };

    if (hasSupabaseConfigured) {
      const { data, error } = await supabase
        .from('recommendations')
        .insert([payload])
        .select()
        .single();

      if (!error && data) {
        return res.status(201).json({ success: true, recommendation: data });
      }
    }

    // Guardar en memoria como fallback
    const newRec = {
      id: 'rec-' + Date.now(),
      ...payload,
      created_at: new Date().toISOString()
    };
    memoryRecommendations.unshift(newRec);

    return res.status(201).json({ success: true, recommendation: newRec, source: 'fallback' });
  } catch (err) {
    console.error('Error al crear recomendación:', err);
    return res.status(500).json({ error: 'Error al crear la recomendación' });
  }
});

/**
 * PUT /api/recommendations/admin/:id
 * Actualizar una recomendación existente
 */
router.put('/admin/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      category,
      description,
      phone,
      address,
      maps_url,
      website_url,
      instagram_url,
      image_url,
      display_order,
      is_active
    } = req.body;

    const payload = {
      name: name ? name.trim() : undefined,
      category: category ? category.trim().toLowerCase() : undefined,
      description: description !== undefined ? description.trim() : undefined,
      phone: phone !== undefined ? phone.trim() : undefined,
      address: address !== undefined ? address.trim() : undefined,
      maps_url: maps_url !== undefined ? maps_url.trim() : undefined,
      website_url: website_url !== undefined ? website_url.trim() : undefined,
      instagram_url: instagram_url !== undefined ? instagram_url.trim() : undefined,
      image_url: image_url !== undefined ? image_url.trim() : undefined,
      display_order: display_order !== undefined ? Number(display_order) : undefined,
      is_active: is_active !== undefined ? Boolean(is_active) : undefined,
      updated_at: new Date().toISOString()
    };

    // Filtrar llaves undefined
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    if (hasSupabaseConfigured) {
      const { data, error } = await supabase
        .from('recommendations')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        return res.json({ success: true, recommendation: data });
      }
    }

    // Actualizar en memoria
    const idx = memoryRecommendations.findIndex(r => r.id === id);
    if (idx !== -1) {
      memoryRecommendations[idx] = { ...memoryRecommendations[idx], ...payload };
      return res.json({ success: true, recommendation: memoryRecommendations[idx], source: 'fallback' });
    }

    return res.status(404).json({ error: 'Recomendación no encontrada' });
  } catch (err) {
    console.error('Error al actualizar recomendación:', err);
    return res.status(500).json({ error: 'Error al actualizar la recomendación' });
  }
});

/**
 * DELETE /api/recommendations/admin/:id
 * Eliminar una recomendación
 */
router.delete('/admin/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (hasSupabaseConfigured) {
      const { error } = await supabase
        .from('recommendations')
        .delete()
        .eq('id', id);

      if (!error) {
        return res.json({ success: true, message: 'Recomendación eliminada correctamente.' });
      }
    }

    // Eliminar de memoria
    memoryRecommendations = memoryRecommendations.filter(r => r.id !== id);
    return res.json({ success: true, message: 'Recomendación eliminada correctamente.' });
  } catch (err) {
    console.error('Error al eliminar recomendación:', err);
    return res.status(500).json({ error: 'Error al eliminar recomendación' });
  }
});

export default router;
