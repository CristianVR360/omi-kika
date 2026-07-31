/**
 * Omikika B&B — Recomendaciones Linktree Client Script
 */

const FALLBACK_RECOMMENDATIONS = [
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
    is_active: true,
    display_order: 1
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
    is_active: true,
    display_order: 2
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
    is_active: true,
    display_order: 3
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
    is_active: true,
    display_order: 4
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
    is_active: true,
    display_order: 5
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
    is_active: true,
    display_order: 6
  }
];

let allRecommendations = [];
let currentCategory = 'all';
let currentSearchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
  setupCustomCursor();
  setupFiltersAndSearch();
  loadRecommendations();
});

/**
 * Puntero/Cursor Animado
 */
function setupCustomCursor() {
  const dot = document.getElementById('cursor-dot');
  const outline = document.getElementById('cursor-outline');

  if (!dot || !outline) return;

  let mouseX = -100;
  let mouseY = -100;
  let outlineX = -100;
  let outlineY = -100;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.left = `${mouseX}px`;
    dot.style.top = `${mouseY}px`;
  });

  function animateOutline() {
    outlineX += (mouseX - outlineX) * 0.2;
    outlineY += (mouseY - outlineY) * 0.2;
    outline.style.left = `${outlineX}px`;
    outline.style.top = `${outlineY}px`;
    requestAnimationFrame(animateOutline);
  }
  animateOutline();

  bindHoverCursorEvents();
}

function bindHoverCursorEvents() {
  const interactiveLinks = document.querySelectorAll('.interactive-link, a, button, input');
  interactiveLinks.forEach(link => {
    link.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
    link.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
  });
}

function getApiUrl(path) {
  if (!path) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const h = window.location.hostname;
  const isLocalNetwork = h === 'localhost' || h === '127.0.0.1' || h.startsWith('192.168.') || h.startsWith('10.') || h.endsWith('.local') || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h);
  if (isLocalNetwork && window.location.port && window.location.port !== '3000') {
    return `${window.location.protocol}//${h}:3000${path.startsWith('/') ? path : '/' + path}`;
  }
  return path;
}

/**
 * Cargar recomendaciones desde la API Express / Supabase
 */
async function loadRecommendations() {
  const container = document.getElementById('recommendations-list');
  if (!container) return;

  try {
    const res = await fetch(getApiUrl('/api/recommendations'));
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.recommendations) && data.recommendations.length > 0) {
        allRecommendations = data.recommendations;
      } else {
        allRecommendations = FALLBACK_RECOMMENDATIONS;
      }
    } else {
      allRecommendations = FALLBACK_RECOMMENDATIONS;
    }
  } catch (e) {
    console.warn('API no accesible, usando fallback de recomendaciones local:', e);
    allRecommendations = FALLBACK_RECOMMENDATIONS;
  }

  renderRecommendations();
}

/**
 * Lógica de filtrado por categoría y búsqueda en tiempo real
 */
function setupFiltersAndSearch() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const searchInput = document.getElementById('search-input');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.getAttribute('data-cat') || 'all';
      renderRecommendations();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value.trim().toLowerCase();
      renderRecommendations();
    });
  }
}

/**
 * Renderizar las tarjetas de recomendación
 */
function renderRecommendations() {
  const container = document.getElementById('recommendations-list');
  if (!container) return;

  let filtered = allRecommendations.filter(rec => {
    if (!rec.is_active && rec.is_active !== undefined) return false;

    // Filtro Categoría
    if (currentCategory !== 'all' && rec.category !== currentCategory) {
      return false;
    }

    // Filtro Búsqueda
    if (currentSearchQuery) {
      const nameMatch = rec.name ? rec.name.toLowerCase().includes(currentSearchQuery) : false;
      const descMatch = rec.description ? rec.description.toLowerCase().includes(currentSearchQuery) : false;
      const catMatch = rec.category ? rec.category.toLowerCase().includes(currentSearchQuery) : false;
      const addrMatch = rec.address ? rec.address.toLowerCase().includes(currentSearchQuery) : false;

      return nameMatch || descMatch || catMatch || addrMatch;
    }

    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-recommendations">
        <div class="empty-icon"><i class="bi bi-search"></i></div>
        <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.4rem; color: var(--color-wood-dark);">No encontramos recomendaciones</h3>
        <p style="font-size: 0.88rem;">Intenta seleccionar otra categoría o cambiar tu término de búsqueda.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(rec => {
    const categoryNames = {
      termas: '♨️ Termas',
      restaurantes: '🍽️ Restaurante',
      comidas: '🍕 Comidas',
      entretencion: '🏔️ Entretención',
      delivery: '🛵 Delivery',
      cafeterias: '☕ Cafetería'
    };

    const categoryLabel = categoryNames[rec.category] || rec.category;

    // Sanitize WhatsApp phone
    const cleanPhone = rec.phone ? rec.phone.replace(/[^0-9+]/g, '') : '';
    const isMobileTel = cleanPhone ? `tel:${cleanPhone}` : '';

    return `
      <article class="rec-card interactive-link" id="rec-card-${rec.id}">
        <div class="rec-card-top">
          <div class="rec-title-group">
            <span class="rec-category-badge" data-cat="${rec.category}">${categoryLabel}</span>
            <h2 class="rec-name">${rec.name}</h2>
          </div>
        </div>

        ${rec.description ? `<p class="rec-desc">${rec.description}</p>` : ''}

        ${rec.address ? `
          <div class="rec-address-line">
            <i class="bi bi-geo-alt-fill" style="color: var(--color-gold);"></i>
            <span>${rec.address}</span>
          </div>
        ` : ''}

        <div class="rec-actions-grid">
          ${rec.phone ? `
            <a href="${isMobileTel}" class="rec-btn-action btn-phone interactive-link" target="_blank" rel="noopener">
              <i class="bi bi-telephone-fill"></i> ${rec.phone}
            </a>
          ` : ''}

          ${rec.maps_url ? `
            <a href="${rec.maps_url}" class="rec-btn-action btn-maps interactive-link" target="_blank" rel="noopener">
              <i class="bi bi-map-fill"></i> Cómo llegar
            </a>
          ` : ''}

          ${rec.instagram_url ? `
            <a href="${rec.instagram_url}" class="rec-btn-action btn-insta interactive-link" target="_blank" rel="noopener">
              <i class="bi bi-instagram"></i> Instagram
            </a>
          ` : ''}

          ${rec.website_url ? `
            <a href="${rec.website_url}" class="rec-btn-action btn-web interactive-link" target="_blank" rel="noopener">
              <i class="bi bi-globe"></i> Sitio Web
            </a>
          ` : ''}
        </div>
      </article>
    `;
  }).join('');

  bindHoverCursorEvents();
}
