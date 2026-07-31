import { authFetch, checkAuthOrRedirect, clearAuthSession, getAuthUser } from './auth.js';



// Proteger la página inmediatamente
checkAuthOrRedirect();

// Estado Local del Dashboard
let currentPage = 1;
let currentLimit = 10;
let currentStatus = 'all';
let currentChannel = 'all';
let currentSearch = '';
let currentGuestSearch = '';
let loadedRooms = [];
let guestsData = [];
let currentReservationsList = [];

function initDashboard() {
  setupUserInfo();
  setupSidebarToggle();
  setupTabNavigation();
  loadStats();
  loadRooms();
  loadReservations();
  setupEventListeners();
  setupManualReservationModal();
  setupBlockDatesModal();
  setupEditReservationModal();
  setupExportTools();
  setupSettingsTab();
  setupRecommendationsTab();
}

// Ejecutar init inmediatamente si el DOM ya está listo (soporte para ES Modules)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboard);
} else {
  initDashboard();
}

function setupUserInfo() {
  const user = getAuthUser();
  const userSpan = document.getElementById('admin-email-display');
  if (userSpan && user) {
    userSpan.textContent = user.email || 'Admin';
  }

  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      clearAuthSession();
      window.location.href = 'login.html';
    });
  }
}

function setupSidebarToggle() {
  const toggleBtn = document.getElementById('btn-toggle-sidebar');
  const sidebar = document.getElementById('admin-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const fabAdd = document.getElementById('mobile-fab-add');

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      if (overlay) overlay.classList.toggle('active', sidebar.classList.contains('open'));
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      if (sidebar) sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  }

  if (fabAdd) {
    fabAdd.addEventListener('click', () => {
      const btnOpenManual = document.getElementById('btn-open-manual-modal');
      if (btnOpenManual) btnOpenManual.click();
    });
  }
}

/**
 * Manejador de Navegación por Pestañas (SPA)
 */
function setupTabNavigation() {
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item, .mobile-bottom-nav .mobile-nav-item');
  const views = document.querySelectorAll('.admin-view-section');
  const titleDisplay = document.getElementById('page-title-display');
  const breadcrumbDisplay = document.getElementById('page-breadcrumb-display');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = item.getAttribute('data-target');
      if (!targetId) return;

      // Actualizar links activos en barra lateral y barra móvil
      navItems.forEach(nav => {
        if (nav.getAttribute('data-target') === targetId) {
          nav.classList.add('active');
        } else {
          nav.classList.remove('active');
        }
      });

      // Alternar visibilidad de las vistas
      views.forEach(view => {
        if (view.id === targetId) {
          view.style.display = 'block';
        } else {
          view.style.display = 'none';
        }
      });

      // Cerrar barra lateral y overlay en móvil al navegar
      const sidebar = document.getElementById('admin-sidebar');
      const overlay = document.getElementById('sidebar-overlay');
      if (sidebar) sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('active');

      // Scroll al inicio de la página en móvil
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Actualizar cabecera topbar según la pestaña
      if (targetId === 'view-dashboard') {
        if (titleDisplay) titleDisplay.textContent = 'Dashboard de Operaciones';
        if (breadcrumbDisplay) breadcrumbDisplay.textContent = 'Panel de Administración / Visión General';
        loadStats();
        loadReservations();
      } else if (targetId === 'view-guests') {
        if (titleDisplay) titleDisplay.textContent = 'Directorio de Huéspedes';
        if (breadcrumbDisplay) breadcrumbDisplay.textContent = 'Panel de Administración / Huéspedes';
        loadGuests();
      } else if (targetId === 'view-inquiries') {
        if (titleDisplay) titleDisplay.textContent = 'Consultas & Leads';
        if (breadcrumbDisplay) breadcrumbDisplay.textContent = 'Panel de Administración / Mensajes';
        loadInquiries();
      } else if (targetId === 'view-reports') {
        if (titleDisplay) titleDisplay.textContent = 'Informes & Rendimiento';
        if (breadcrumbDisplay) breadcrumbDisplay.textContent = 'Panel de Administración / Informes';
        loadStats(); // Recargar distribución de canales y métricas
      } else if (targetId === 'view-recommendations') {
        if (titleDisplay) titleDisplay.textContent = 'Gestión de Recomendaciones';
        if (breadcrumbDisplay) breadcrumbDisplay.textContent = 'Panel de Administración / Recomendaciones';
        loadAdminRecommendations();
      } else if (targetId === 'view-settings') {
        if (titleDisplay) titleDisplay.textContent = 'Configuración del Alojamiento';
        if (breadcrumbDisplay) breadcrumbDisplay.textContent = 'Panel de Administración / Configuración';
        loadSettingsRooms();
      }
    });
  });
}

async function loadRooms() {
  try {
    const res = await authFetch('/api/rooms');
    const data = await res.json();
    if (data.success && data.rooms) {
      loadedRooms = data.rooms;
      
      const manualSelect = document.getElementById('manual-room');
      const blockSelect = document.getElementById('block-room');
      const editSelect = document.getElementById('edit-room');

      const roomOptionsHtml = loadedRooms.map(r => `
        <option value="${r.id}">${r.name} (${r.size_m2 || 0}m² - Max ${r.capacity_adults} Adultos)</option>
      `).join('');

      if (manualSelect) manualSelect.innerHTML = roomOptionsHtml;
      if (blockSelect) blockSelect.innerHTML = roomOptionsHtml;
      if (editSelect) editSelect.innerHTML = roomOptionsHtml;
    }
  } catch (err) {
    console.error('Error cargando lista de habitaciones:', err);
  }
}

async function loadStats() {
  try {
    const res = await authFetch('/api/admin/stats');
    const data = await res.json();
    if (data.success && data.stats) {
      const elTotal = document.getElementById('stat-total');
      const elPending = document.getElementById('stat-pending');
      const elConfirmed = document.getElementById('stat-confirmed');
      const elRevenue = document.getElementById('stat-revenue');

      const totalCount = data.stats.total || 0;

      if (elTotal) elTotal.textContent = totalCount;
      if (elPending) elPending.textContent = data.stats.pending || 0;
      if (elConfirmed) elConfirmed.textContent = data.stats.confirmed || 0;
      if (elRevenue) elRevenue.textContent = `$${Number(data.stats.revenue || 0).toLocaleString('es-CL')} CLP`;

      // KPIs nuevos
      const elKpiRevenue = document.getElementById('kpi-revenue');
      if (elKpiRevenue) elKpiRevenue.textContent = `$${Number(data.stats.revenue || 0).toLocaleString('es-CL')} CLP`;

      const elReservations = document.getElementById('kpi-reservations');
      if (elReservations) elReservations.textContent = Number(totalCount).toLocaleString('es-CL');

      const elRooms = document.getElementById('kpi-rooms');
      if (elRooms) elRooms.textContent = Number(data.stats.rooms || 0).toLocaleString('es-CL');

      const elInquiries = document.getElementById('kpi-inquiries');
      if (elInquiries) elInquiries.textContent = Number(data.stats.inquiries || 0).toLocaleString('es-CL');

      // Cargar distribución real de canales basada en todas las reservas
      updateChannelDistribution(data.stats.channels, totalCount);

      // Cargar datos financieros adicionales en la pestaña Informes
      const avgRevenue = totalCount > 0 ? Math.round(Number(data.stats.revenue || 0) / totalCount) : 0;
      const elAvgRevenue = document.getElementById('report-avg-revenue');
      if (elAvgRevenue) elAvgRevenue.textContent = `$${avgRevenue.toLocaleString('es-CL')} CLP`;
    }
  } catch (err) {
    console.error('Error cargando estadísticas:', err);
  }
}

async function loadReservations() {
  const tbody = document.getElementById('reservations-tbody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 2rem; color: #94a3b8;">Cargando reservas...</td></tr>`;

  try {
    const params = new URLSearchParams({
      page: currentPage,
      limit: currentLimit,
      status: currentStatus,
      channel: currentChannel,
      search: currentSearch
    });

    const res = await authFetch(`/api/admin/reservations?${params.toString()}`);
    const result = await res.json();

    if (!result.success) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color: #f87171; padding: 2rem;">Error: ${result.error}</td></tr>`;
      return;
    }

    renderTable(result.data);
    renderPagination(result.pagination);

  } catch (err) {
    console.error('Error cargando reservas:', err);
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color: #f87171; padding: 2rem;">No se pudieron cargar los datos de reservas. (${err.message})</td></tr>`;
  }
}

function formatDateDDMMYYYY(dateStr) {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const day = parts[2].split('T')[0];
    return `${day}/${parts[1]}/${parts[0]}`;
  }
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  } catch (e) {}
  return dateStr;
}

function renderTable(data) {
  const tbody = document.getElementById('reservations-tbody');
  if (!tbody) return;

  currentReservationsList = data || [];

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 2rem; color: #94a3b8;">No se encontraron reservas con los filtros aplicados.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(res => {
    const roomName = res.rooms ? res.rooms.name : (res.room_name || 'Habitación');
    const statusBadge = getStatusBadge(res.status);
    const channelBadge = getChannelBadge(res.channel || 'Sitio Web');

    return `
      <tr>
        <td>${channelBadge}</td>
        <td>
          <div style="font-weight: 600; color: #fff;">${escapeHtml(res.guest_name)}</div>
          <div style="font-size: 0.78rem; color: #94a3b8;">✉️ ${escapeHtml(res.guest_email)}</div>
          <div style="font-size: 0.78rem; color: #94a3b8;">📞 ${escapeHtml(res.guest_phone)}</div>
        </td>
        <td><strong style="color: #f8fafc;">${escapeHtml(roomName)}</strong></td>
        <td><strong style="color: #60a5fa;">${formatDateDDMMYYYY(res.check_in)}</strong></td>
        <td><strong style="color: #f87171;">${formatDateDDMMYYYY(res.check_out)}</strong></td>
        <td>${res.adults} Ad / ${res.children} Ni</td>
        <td style="font-weight: 700; color: #fff;">$${Number(res.total_price || 0).toLocaleString('es-CL')}</td>
        <td>${statusBadge}</td>
        <td>
          <div style="display: flex; flex-direction: column; gap: 5px; align-items: stretch;">
            <button class="btn-action btn-edit" data-id="${res.id}" data-action="edit" onclick="window.handleReservationAction(event, '${res.id}', 'edit')">✏️ Editar</button>
            ${res.status === 'pending' ? `
              <button class="btn-action btn-confirm" data-id="${res.id}" data-action="confirmed" onclick="window.handleReservationAction(event, '${res.id}', 'confirmed')">Confirmar</button>
              <button class="btn-action btn-cancel" data-id="${res.id}" data-action="cancelled" onclick="window.handleReservationAction(event, '${res.id}', 'cancelled')">Cancelar</button>
            ` : res.status === 'confirmed' ? `
              <button class="btn-action btn-cancel" data-id="${res.id}" data-action="cancelled" onclick="window.handleReservationAction(event, '${res.id}', 'cancelled')">Cancelar</button>
            ` : res.status === 'blocked' ? `
              <button class="btn-action btn-cancel" data-id="${res.id}" data-action="cancelled" onclick="window.handleReservationAction(event, '${res.id}', 'cancelled')">Desbloquear</button>
            ` : ''}
            <button class="btn-action btn-delete" data-id="${res.id}" data-action="delete" onclick="window.handleReservationAction(event, '${res.id}', 'delete')" style="background-color: #dc2626; color: white; border: none; border-radius: 4px; padding: 4px 8px; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">
              Eliminar
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.handleReservationAction = function(e, id, action) {
  if (e) {
    if (typeof e.preventDefault === 'function') e.preventDefault();
    if (typeof e.stopPropagation === 'function') e.stopPropagation();
  }
  if (action === 'delete') {
    deleteReservation(id);
  } else if (action === 'edit') {
    const item = currentReservationsList.find(r => String(r.id) === String(id));
    if (item) {
      openEditModal(item);
    } else {
      console.warn('No se encontró reserva para editar con ID:', id, currentReservationsList);
    }
  } else {
    updateStatus(id, action);
  }
};


function renderPagination(pagination) {
  const infoSpan = document.getElementById('pagination-info');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const pageNumbersSpan = document.getElementById('page-numbers');

  if (!pagination) return;

  const { page, totalPages, totalRecords, limit } = pagination;
  const startItem = totalRecords === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, totalRecords);

  if (infoSpan) infoSpan.textContent = `Mostrando ${startItem} a ${endItem} de ${totalRecords} reservas`;
  if (btnPrev) btnPrev.disabled = !pagination.hasPrev;
  if (btnNext) btnNext.disabled = !pagination.hasNext;
  if (pageNumbersSpan) pageNumbersSpan.textContent = `Página ${page} de ${totalPages}`;
}

/**
 * Cargar y renderizar el directorio de Huéspedes
 */
async function loadGuests() {
  const tbody = document.getElementById('guests-tbody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem; color: #94a3b8;">Cargando huéspedes...</td></tr>`;

  try {
    const res = await authFetch('/api/admin/guests');
    const result = await res.json();

    if (!result.success) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: #f87171; padding: 2rem;">Error: ${result.error}</td></tr>`;
      return;
    }

    guestsData = result.data || [];
    renderGuestsTable(guestsData);

  } catch (err) {
    console.error('Error cargando huéspedes:', err);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: #f87171; padding: 2rem;">No se pudieron cargar los datos de huéspedes.</td></tr>`;
  }
}

function renderGuestsTable(data) {
  const tbody = document.getElementById('guests-tbody');
  if (!tbody) return;

  let filtered = data;
  if (currentGuestSearch) {
    const query = currentGuestSearch.toLowerCase();
    filtered = data.filter(g => 
      g.name.toLowerCase().includes(query) || 
      g.email.toLowerCase().includes(query) || 
      g.phone.toLowerCase().includes(query)
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem; color: #94a3b8;">No se encontraron huéspedes registrados.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(guest => `
    <tr>
      <td><strong style="color: #fff;">${escapeHtml(guest.name)}</strong></td>
      <td>${escapeHtml(guest.email)}</td>
      <td>${escapeHtml(guest.phone)}</td>
      <td style="text-align:center;"><span class="badge-channel" style="color: #3b82f6; border-color: rgba(59, 130, 246, 0.4); font-weight:700;">${guest.total_reservations}</span></td>
      <td style="font-weight:700; color:#34d399;">$${Number(guest.total_spent).toLocaleString('es-CL')}</td>
      <td>${guest.last_stay || 'Sin registro'}</td>
    </tr>
  `).join('');
}

/**
 * Cargar y renderizar bandeja de Consultas / Leads
 */
async function loadInquiries() {
  const tbody = document.getElementById('inquiries-tbody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem; color: #94a3b8;">Cargando bandeja de consultas...</td></tr>`;

  try {
    const res = await authFetch('/api/inquiries/admin');
    const result = await res.json();

    if (!result.success) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: #f87171; padding: 2rem;">Error: ${result.error}</td></tr>`;
      return;
    }

    inquiriesData = result.data || [];
    renderInquiriesTable(inquiriesData);

  } catch (err) {
    console.error('Error cargando consultas:', err);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: #f87171; padding: 2rem;">No se pudieron cargar los mensajes.</td></tr>`;
  }
}

function renderInquiriesTable(data) {
  const tbody = document.getElementById('inquiries-tbody');
  if (!tbody) return;

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem; color: #94a3b8;">Bandeja vacía. No hay consultas de clientes aún.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(inq => {
    const createdDate = new Date(inq.created_at).toLocaleDateString('es-CL', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const statusBadge = inq.status === 'new' 
      ? `<span class="badge-status badge-pending" style="color:#f87171; background:rgba(239, 68, 68, 0.15); border-color: rgba(239, 68, 68, 0.3);">Nuevo Lead</span>`
      : inq.status === 'read'
      ? `<span class="badge-status badge-completed">Leído</span>`
      : `<span class="badge-status badge-confirmed">Respondido</span>`;

    return `
      <tr>
        <td style="font-size:0.8rem; color:var(--text-muted);">${createdDate}</td>
        <td>
          <div style="font-weight: 600; color: #fff;">${escapeHtml(inq.name)}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">✉️ ${escapeHtml(inq.email)}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">📞 ${escapeHtml(inq.phone || 'N/A')}</div>
        </td>
        <td><strong>${escapeHtml(inq.subject)}</strong></td>
        <td><div style="max-width: 320px; white-space: normal; line-height: 1.4; color: #cbd5e1;">${escapeHtml(inq.message)}</div></td>
        <td>${statusBadge}</td>
        <td>
          ${inq.status === 'new' ? `
            <button class="btn-action btn-confirm btn-inq-status" data-id="${inq.id}" data-status="read">Leído</button>
            <button class="btn-action btn-add-manual btn-inq-status" style="background:#10b981; padding:0.4rem 0.65rem; font-size:0.8rem; box-shadow:none;" data-id="${inq.id}" data-status="replied">Respondido</button>
          ` : inq.status === 'read' ? `
            <button class="btn-action btn-add-manual btn-inq-status" style="background:#10b981; padding:0.4rem 0.65rem; font-size:0.8rem; box-shadow:none;" data-id="${inq.id}" data-status="replied">Respondido</button>
          ` : `
            <span style="font-size:0.8rem; color:var(--text-dim);">Finalizado</span>
          `}
        </td>
      </tr>
    `;
  }).join('');

  // Vincular eventos a botones de estado de consulta
  tbody.querySelectorAll('.btn-inq-status').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = btn.getAttribute('data-id');
      const status = btn.getAttribute('data-status');
      await updateInquiryStatus(id, status);
    });
  });
}

async function updateInquiryStatus(id, status) {
  try {
    const res = await authFetch(`/api/inquiries/admin/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    const result = await res.json();

    if (result.success) {
      loadInquiries();
    } else {
      alert(`Error al actualizar consulta: ${result.error}`);
    }
  } catch (err) {
    alert('No se pudo actualizar el estado del mensaje.');
  }
}

/**
 * Actualiza el desglose visual de canales de reserva en base a datos reales agregados
 */
function updateChannelDistribution(channels, total) {
  if (!channels || total === 0) return;

  const counts = {
    booking: channels['Booking.com'] || 0,
    airbnb: channels['Airbnb'] || 0,
    direct: channels['Reserva Directa'] || 0,
    web: (channels['Sitio Web'] || 0) + (channels['web'] || 0)
  };

  const elBooking = document.getElementById('count-booking');
  const elAirbnb = document.getElementById('count-airbnb');
  const elDirect = document.getElementById('count-direct');
  const elWeb = document.getElementById('count-web');

  const fillBooking = document.getElementById('fill-booking');
  const fillAirbnb = document.getElementById('fill-airbnb');
  const fillDirect = document.getElementById('fill-direct');
  const fillWeb = document.getElementById('fill-web');

  const getPercent = (count) => Math.round((count / total) * 100);

  if (elBooking) elBooking.textContent = `${getPercent(counts.booking)}% (${counts.booking})`;
  if (fillBooking) fillBooking.style.width = `${getPercent(counts.booking)}%`;

  if (elAirbnb) elAirbnb.textContent = `${getPercent(counts.airbnb)}% (${counts.airbnb})`;
  if (fillAirbnb) fillAirbnb.style.width = `${getPercent(counts.airbnb)}%`;

  if (elDirect) elDirect.textContent = `${getPercent(counts.direct)}% (${counts.direct})`;
  if (fillDirect) fillDirect.style.width = `${getPercent(counts.direct)}%`;

  if (elWeb) elWeb.textContent = `${getPercent(counts.web)}% (${counts.web})`;
  if (fillWeb) fillWeb.style.width = `${getPercent(counts.web)}%`;
}

async function updateStatus(id, newStatus) {
  const actionName = newStatus === 'cancelled' ? 'cancelar/desbloquear' : newStatus;
  if (!confirm(`¿Está seguro de cambiar el estado de la reserva a "${actionName}"?`)) {
    return;
  }

  try {
    const res = await authFetch(`/api/admin/reservations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();

    if (data.success) {
      loadStats();
      loadReservations();
    } else {
      alert(`Error: ${data.error}`);
    }
  } catch (err) {
    alert('No se pudo actualizar el estado de la reserva.');
  }
}

async function deleteReservation(id) {
  if (!confirm('¿Está seguro de eliminar esta reserva permanentemente? Esta acción no se puede deshacer.')) {
    return;
  }

  try {
    const res = await authFetch(`/api/admin/reservations/${id}`, {
      method: 'DELETE'
    });
    const data = await res.json();

    if (data.success) {
      loadStats();
      loadReservations();
    } else {
      alert(`Error: ${data.error}`);
    }
  } catch (err) {
    alert('No se pudo eliminar la reserva.');
  }
}

function setupEventListeners() {
  let timeout = null;
  const handleSearch = (val) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      currentSearch = val;
      currentPage = 1;
      loadReservations();
    }, 400);
  };

  const inputSearch = document.getElementById('input-search');
  const topbarSearch = document.getElementById('topbar-search-input');

  if (inputSearch) {
    inputSearch.addEventListener('input', (e) => {
      if (topbarSearch) topbarSearch.value = e.target.value;
      handleSearch(e.target.value);
    });
  }

  if (topbarSearch) {
    topbarSearch.addEventListener('input', (e) => {
      if (inputSearch) inputSearch.value = e.target.value;
      handleSearch(e.target.value);
    });
  }

  // Búsqueda de huéspedes específica
  const inputSearchGuests = document.getElementById('input-search-guests');
  if (inputSearchGuests) {
    inputSearchGuests.addEventListener('input', (e) => {
      currentGuestSearch = e.target.value;
      renderGuestsTable(guestsData);
    });
  }

  const selectStatus = document.getElementById('select-status');
  if (selectStatus) {
    selectStatus.addEventListener('change', (e) => {
      currentStatus = e.target.value;
      currentPage = 1;
      loadReservations();
    });
  }

  const selectChannel = document.getElementById('select-channel');
  if (selectChannel) {
    selectChannel.addEventListener('change', (e) => {
      currentChannel = e.target.value;
      currentPage = 1;
      loadReservations();
    });
  }

  const selectLimit = document.getElementById('select-limit');
  if (selectLimit) {
    selectLimit.addEventListener('change', (e) => {
      currentLimit = parseInt(e.target.value, 10);
      currentPage = 1;
      loadReservations();
    });
  }

  const btnPrev = document.getElementById('btn-prev');
  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        loadReservations();
      }
    });
  }

  const btnNext = document.getElementById('btn-next');
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      currentPage++;
      loadReservations();
    });
  }
}

/**
 * Configurar herramientas de exportación CSV (Informes)
 */
function setupExportTools() {
  const btnRes = document.getElementById('btn-export-reservations');
  const btnGst = document.getElementById('btn-export-guests');

  if (btnRes) {
    btnRes.addEventListener('click', async () => {
      try {
        const res = await authFetch('/api/admin/reservations?limit=500'); // Cargar hasta 500 para exportar
        const result = await res.json();
        if (result.success && result.data) {
          const headers = ['Canal/Plataforma', 'Huésped', 'Email', 'Teléfono', 'Check-in', 'Check-out', 'Adultos', 'Niños', 'Total CLP', 'Estado', 'Notas'];
          const rows = result.data.map(item => [
            item.channel,
            item.guest_name,
            item.guest_email,
            item.guest_phone,
            item.check_in,
            item.check_out,
            item.adults,
            item.children,
            item.total_price,
            item.status,
            item.notes || ''
          ]);
          downloadCSV('informe-reservas-omikika.csv', headers, rows);
        }
      } catch (err) {
        alert('Error al exportar reservas: ' + err.message);
      }
    });
  }

  if (btnGst) {
    btnGst.addEventListener('click', async () => {
      try {
        const res = await authFetch('/api/admin/guests');
        const result = await res.json();
        if (result.success && result.data) {
          const headers = ['Nombre Completo', 'Email', 'Teléfono', 'Total Estadías', 'Total Invertido (CLP)', 'Último Check-in'];
          const rows = result.data.map(g => [
            g.name,
            g.email,
            g.phone,
            g.total_reservations,
            g.total_spent,
            g.last_stay
          ]);
          downloadCSV('directorio-huespedes-omikika.csv', headers, rows);
        }
      } catch (err) {
        alert('Error al exportar huéspedes: ' + err.message);
      }
    });
  }
}

function downloadCSV(filename, headers, rows) {
  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
    + [headers.join(",")].concat(rows.map(r => r.map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(","))).join("\n");
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function setupManualReservationModal() {
  const modal = document.getElementById('manual-reservation-modal');
  const btnOpen = document.getElementById('btn-open-manual-modal');
  const btnClose = document.getElementById('btn-close-modal');
  const btnCancel = document.getElementById('btn-cancel-modal');
  const channelSelect = document.getElementById('manual-channel');
  const colCustomChannel = document.getElementById('col-custom-channel');
  const form = document.getElementById('manual-reservation-form');
  const errorAlert = document.getElementById('modal-error-alert');

  if (!modal) return;

  const openModal = () => {
    if (errorAlert) errorAlert.style.display = 'none';
    if (form) form.reset();
    if (colCustomChannel) colCustomChannel.style.display = 'none';
    
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const inInput = document.getElementById('manual-checkin');
    const outInput = document.getElementById('manual-checkout');
    if (inInput) inInput.value = today;
    if (outInput) outInput.value = tomorrow.toISOString().split('T')[0];

    modal.style.display = 'flex';
  };

  const closeModal = () => {
    modal.style.display = 'none';
  };

  if (btnOpen) btnOpen.addEventListener('click', openModal);
  if (btnClose) btnClose.addEventListener('click', closeModal);
  if (btnCancel) btnCancel.addEventListener('click', closeModal);

  if (channelSelect) {
    channelSelect.addEventListener('change', (e) => {
      if (e.target.value === 'Otro') {
        if (colCustomChannel) colCustomChannel.style.display = 'block';
        const customInp = document.getElementById('manual-custom-channel');
        if (customInp) customInp.setAttribute('required', 'required');
      } else {
        if (colCustomChannel) colCustomChannel.style.display = 'none';
        const customInp = document.getElementById('manual-custom-channel');
        if (customInp) customInp.removeAttribute('required');
      }
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (errorAlert) errorAlert.style.display = 'none';

      let finalChannel = channelSelect ? channelSelect.value : 'Reserva Directa';
      if (finalChannel === 'Otro') {
        const customVal = (document.getElementById('manual-custom-channel')?.value || '').trim();
        finalChannel = customVal ? `Otro (${customVal})` : 'Otro';
      }

      const payload = {
        channel: finalChannel,
        room_id: document.getElementById('manual-room')?.value,
        status: document.getElementById('manual-status')?.value,
        check_in: document.getElementById('manual-checkin')?.value,
        check_out: document.getElementById('manual-checkout')?.value,
        guest_name: (document.getElementById('manual-guest-name')?.value || '').trim(),
        guest_email: (document.getElementById('manual-guest-email')?.value || '').trim(),
        guest_phone: (document.getElementById('manual-guest-phone')?.value || '').trim(),
        adults: document.getElementById('manual-adults')?.value || 1,
        children: document.getElementById('manual-children')?.value || 0,
        total_price: document.getElementById('manual-price')?.value || 0,
        notes: (document.getElementById('manual-notes')?.value || '').trim()
      };

      try {
        const res = await authFetch('/api/admin/reservations', {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'No se pudo guardar la reserva manual.');
        }

        closeModal();
        loadStats();
        loadReservations();

      } catch (err) {
        if (errorAlert) {
          errorAlert.textContent = err.message;
          errorAlert.style.display = 'block';
        }
      }
    });
  }
}

function setupBlockDatesModal() {
  const modal = document.getElementById('block-modal');
  const btnOpen = document.getElementById('btn-open-block-modal');
  const btnClose = document.getElementById('btn-close-block-modal');
  const btnCancel = document.getElementById('btn-cancel-block');
  const form = document.getElementById('block-form');
  const errorAlert = document.getElementById('block-modal-error');

  if (!modal || !btnOpen) return;

  const openModal = () => {
    if (errorAlert) errorAlert.style.display = 'none';
    if (form) form.reset();
    
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const inInput = document.getElementById('block-checkin');
    const outInput = document.getElementById('block-checkout');
    if (inInput) inInput.value = today;
    if (outInput) outInput.value = tomorrow.toISOString().split('T')[0];

    modal.style.display = 'flex';
  };

  const closeModal = () => {
    modal.style.display = 'none';
  };

  btnOpen.addEventListener('click', openModal);
  if (btnClose) btnClose.addEventListener('click', closeModal);
  if (btnCancel) btnCancel.addEventListener('click', closeModal);

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (errorAlert) errorAlert.style.display = 'none';

      const reason = document.getElementById('block-reason')?.value || 'Mantenimiento';

      const payload = {
        channel: 'Bloqueo Administrador',
        room_id: document.getElementById('block-room')?.value,
        status: 'blocked',
        check_in: document.getElementById('block-checkin')?.value,
        check_out: document.getElementById('block-checkout')?.value,
        guest_name: `[BLOQUEO] ${reason}`,
        guest_email: 'bloqueo@admin.local',
        guest_phone: 'N/A',
        adults: 0,
        children: 0,
        total_price: 0,
        notes: `Bloqueo de disponibilidad realizado por el administrador: ${reason}`
      };

      try {
        const res = await authFetch('/api/admin/reservations', {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'No se pudo bloquear la habitación.');
        }

        closeModal();
        loadStats();
        loadReservations();

      } catch (err) {
        if (errorAlert) {
          errorAlert.textContent = err.message;
          errorAlert.style.display = 'block';
        }
      }
    });
  }
}

function setupEditReservationModal() {
  const modal = document.getElementById('edit-reservation-modal');
  const btnClose = document.getElementById('btn-close-edit-modal');
  const btnCancel = document.getElementById('btn-cancel-edit-modal');
  const form = document.getElementById('edit-reservation-form');
  const errorAlert = document.getElementById('edit-modal-error');

  if (!modal) return;

  const closeModal = () => {
    modal.style.display = 'none';
  };

  if (btnClose) btnClose.addEventListener('click', closeModal);
  if (btnCancel) btnCancel.addEventListener('click', closeModal);

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (errorAlert) errorAlert.style.display = 'none';

      const id = document.getElementById('edit-reservation-id')?.value;
      if (!id) return;

      const payload = {
        channel: document.getElementById('edit-channel')?.value,
        status: document.getElementById('edit-status')?.value,
        room_id: document.getElementById('edit-room')?.value,
        check_in: document.getElementById('edit-checkin')?.value,
        check_out: document.getElementById('edit-checkout')?.value,
        guest_name: (document.getElementById('edit-guest-name')?.value || '').trim(),
        guest_email: (document.getElementById('edit-guest-email')?.value || '').trim(),
        guest_phone: (document.getElementById('edit-guest-phone')?.value || '').trim(),
        adults: document.getElementById('edit-adults')?.value || 1,
        children: document.getElementById('edit-children')?.value || 0,
        total_price: document.getElementById('edit-price')?.value || 0,
        notes: (document.getElementById('edit-notes')?.value || '').trim()
      };

      try {
        const res = await authFetch(`/api/admin/reservations/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'No se pudo actualizar la reserva/bloqueo.');
        }

        closeModal();
        loadStats();
        loadReservations();

      } catch (err) {
        if (errorAlert) {
          errorAlert.textContent = err.message;
          errorAlert.style.display = 'block';
        }
      }
    });
  }
}

function openEditModal(reservation) {
  const modal = document.getElementById('edit-reservation-modal');
  const errorAlert = document.getElementById('edit-modal-error');
  const titleEl = document.getElementById('edit-modal-title');
  if (!modal || !reservation) return;

  if (errorAlert) errorAlert.style.display = 'none';

  const isBlock = reservation.status === 'blocked' || (reservation.channel && reservation.channel.includes('Bloqueo')) || (reservation.guest_name && reservation.guest_name.startsWith('[BLOQUEO]'));
  if (titleEl) {
    titleEl.textContent = isBlock ? '✏️ Editar Bloqueo de Fechas' : '✏️ Editar Reserva';
  }

  const idInp = document.getElementById('edit-reservation-id');
  if (idInp) idInp.value = reservation.id || '';

  const channelInp = document.getElementById('edit-channel');
  if (channelInp && reservation.channel) {
    let exists = Array.from(channelInp.options).some(opt => opt.value === reservation.channel);
    if (!exists) {
      const newOpt = document.createElement('option');
      newOpt.value = reservation.channel;
      newOpt.textContent = reservation.channel;
      channelInp.appendChild(newOpt);
    }
    channelInp.value = reservation.channel;
  }

  const statusInp = document.getElementById('edit-status');
  if (statusInp) statusInp.value = reservation.status || 'confirmed';

  const roomSelect = document.getElementById('edit-room');
  if (roomSelect) {
    if (loadedRooms && loadedRooms.length > 0) {
      roomSelect.innerHTML = loadedRooms.map(r => `
        <option value="${r.id}">${r.name} (${r.size_m2 || 0}m² - Max ${r.capacity_adults} Adultos)</option>
      `).join('');
    }
    if (reservation.room_id) {
      roomSelect.value = reservation.room_id;
    }
  }

  const checkinInp = document.getElementById('edit-checkin');
  if (checkinInp) checkinInp.value = reservation.check_in ? reservation.check_in.split('T')[0] : '';

  const checkoutInp = document.getElementById('edit-checkout');
  if (checkoutInp) checkoutInp.value = reservation.check_out ? reservation.check_out.split('T')[0] : '';

  const nameInp = document.getElementById('edit-guest-name');
  if (nameInp) nameInp.value = reservation.guest_name || '';

  const emailInp = document.getElementById('edit-guest-email');
  if (emailInp) emailInp.value = reservation.guest_email || '';

  const phoneInp = document.getElementById('edit-guest-phone');
  if (phoneInp) phoneInp.value = reservation.guest_phone || '';

  const adultsInp = document.getElementById('edit-adults');
  if (adultsInp) adultsInp.value = reservation.adults !== undefined ? reservation.adults : 1;

  const childrenInp = document.getElementById('edit-children');
  if (childrenInp) childrenInp.value = reservation.children !== undefined ? reservation.children : 0;

  const priceInp = document.getElementById('edit-price');
  if (priceInp) priceInp.value = reservation.total_price !== undefined ? Math.round(reservation.total_price) : 0;

  const notesInp = document.getElementById('edit-notes');
  if (notesInp) notesInp.value = reservation.notes || '';

  modal.style.display = 'flex';
}

window.openEditModal = openEditModal;

function setupSettingsTab() {
  const selectRoom = document.getElementById('settings-room-select');
  const generalForm = document.getElementById('settings-general-form');
  const priceForm = document.getElementById('settings-special-price-form');
  const calendarStart = document.getElementById('settings-calendar-start');

  if (calendarStart) {
    calendarStart.value = new Date().toISOString().split('T')[0];
    calendarStart.addEventListener('change', () => {
      const roomId = selectRoom?.value;
      if (roomId) loadRoomCalendar(roomId, calendarStart.value);
    });
  }

  if (selectRoom) {
    selectRoom.addEventListener('change', () => {
      const roomId = selectRoom.value;
      if (roomId) {
        loadRoomSettings(roomId);
        loadRoomCalendar(roomId, calendarStart?.value || new Date().toISOString().split('T')[0]);
      }
    });
  }

  if (generalForm) {
    generalForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const roomId = selectRoom?.value;
      if (!roomId) return;

      const alertDiv = document.getElementById('settings-general-alert');
      if (alertDiv) alertDiv.style.display = 'none';

      const payload = {
        price_per_night: Number(document.getElementById('settings-price-base').value),
        is_active: document.getElementById('settings-room-active').checked
      };

      try {
        const res = await authFetch(`/api/admin/rooms/${roomId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          if (alertDiv) {
            alertDiv.textContent = 'Configuración general guardada con éxito.';
            alertDiv.style.display = 'block';
            alertDiv.className = 'alert-success';
          }
          // Recargar rooms y el calendario por si cambió de precio
          await loadRooms();
          loadRoomCalendar(roomId, calendarStart?.value || new Date().toISOString().split('T')[0]);
        } else {
          throw new Error(data.error);
        }
      } catch (err) {
        if (alertDiv) {
          alertDiv.textContent = 'Error: ' + err.message;
          alertDiv.style.display = 'block';
          alertDiv.className = 'alert-error';
        }
      }
    });
  }

  if (priceForm) {
    priceForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const roomId = selectRoom?.value;
      if (!roomId) return;

      const alertDiv = document.getElementById('settings-special-alert');
      if (alertDiv) alertDiv.style.display = 'none';

      const payload = {
        date: document.getElementById('settings-special-date').value,
        price: Number(document.getElementById('settings-special-price').value)
      };

      try {
        const res = await authFetch(`/api/admin/rooms/${roomId}/prices`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          if (alertDiv) {
            alertDiv.textContent = data.message || 'Tarifa especial definida.';
            alertDiv.style.display = 'block';
            alertDiv.className = 'alert-success';
          }
          priceForm.reset();
          loadRoomCalendar(roomId, calendarStart?.value || new Date().toISOString().split('T')[0]);
        } else {
          throw new Error(data.error);
        }
      } catch (err) {
        if (alertDiv) {
          alertDiv.textContent = 'Error: ' + err.message;
          alertDiv.style.display = 'block';
          alertDiv.className = 'alert-error';
        }
      }
    });
  }
}

async function loadSettingsRooms() {
  const selectRoom = document.getElementById('settings-room-select');
  if (!selectRoom) return;

  try {
    if (loadedRooms.length === 0) {
      await loadRooms();
    }

    selectRoom.innerHTML = loadedRooms.map(r => `
      <option value="${r.id}">${r.name}</option>
    `).join('');

    const firstRoomId = selectRoom.value;
    if (firstRoomId) {
      loadRoomSettings(firstRoomId);
      const calendarStart = document.getElementById('settings-calendar-start');
      loadRoomCalendar(firstRoomId, calendarStart?.value || new Date().toISOString().split('T')[0]);
    }
  } catch (err) {
    console.error('Error cargando selector de configuración de habitaciones:', err);
  }
}

function loadRoomSettings(roomId) {
  const room = loadedRooms.find(r => r.id === roomId);
  if (!room) return;

  const priceBaseInput = document.getElementById('settings-price-base');
  const roomActiveCheck = document.getElementById('settings-room-active');

  if (priceBaseInput) priceBaseInput.value = Math.round(Number(room.price_per_night || 0));
  if (roomActiveCheck) roomActiveCheck.checked = room.is_active !== false;
}

async function loadRoomCalendar(roomId, startDate) {
  const grid = document.getElementById('settings-calendar-grid');
  if (!grid) return;

  grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #94a3b8;">Cargando calendario...</div>';

  try {
    const res = await authFetch(`/api/admin/rooms/${roomId}/calendar?start_date=${startDate}`);
    const data = await res.json();

    if (!data.success) {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #f87171;">Error: ${data.error}</div>`;
      return;
    }

    grid.innerHTML = data.calendar.map(day => {
      const d = new Date(day.date + 'T00:00:00');
      const dateFormatted = d.toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: 'short' });
      const priceFormatted = `$${Number(day.price).toLocaleString('es-CL')}`;
      
      const badgeTarifa = day.isSpecial 
        ? `<span style="font-size:0.72rem; background:rgba(16, 185, 129, 0.2); color:#34d399; padding: 2px 6px; border-radius: 4px; font-weight: 600;">Especial</span>`
        : `<span style="font-size:0.72rem; background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.6); padding: 2px 6px; border-radius: 4px;">Base</span>`;

      const statusHtml = day.available
        ? `<div style="color: #34d399; font-size: 0.8rem; font-weight:600; margin-top: 0.5rem;">🟢 Disponible</div>`
        : `<div style="color: #f87171; font-size: 0.78rem; margin-top: 0.5rem; line-height:1.3;" title="Reservado / Bloqueado">
            🔴 Ocupado
            <div style="font-size:0.7rem; color:#94a3b8; font-weight: 500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
              ${day.reservation?.guest_name}
            </div>
           </div>`;

      const deleteBtn = day.isSpecial
        ? `<button class="btn-clear-price" data-date="${day.date}" style="margin-top: 8px; border: 1px solid rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.1); color: #f87171; font-size: 0.7rem; padding: 3px 6px; border-radius: 4px; cursor: pointer; width: 100%; transition: all 0.2s;">
            Restablecer Base
           </button>`
        : '';

      return `
        <div style="background: #1e293b; border: 1px solid ${day.isSpecial ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255,255,255,0.06)'}; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="font-size: 0.85rem; font-weight: 600; color: #fff; text-transform: capitalize; margin-bottom: 4px;">${dateFormatted}</div>
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 6px;">
              <span style="font-weight:700; color:#fff; font-size: 0.95rem;">${priceFormatted}</span>
              ${badgeTarifa}
            </div>
          </div>
          <div>
            ${statusHtml}
            ${deleteBtn}
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.btn-clear-price').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const dateStr = btn.getAttribute('data-date');
        if (confirm(`¿Seguro que deseas eliminar la tarifa especial del día ${dateStr}?`)) {
          try {
            const res = await authFetch(`/api/admin/rooms/${roomId}/prices/${dateStr}`, {
              method: 'DELETE'
            });
            const result = await res.json();
            if (result.success) {
              loadRoomCalendar(roomId, startDate);
            }
          } catch (err) {
            alert('Error al restablecer precio base.');
          }
        }
      });
    });

  } catch (err) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #f87171;">Error al consultar calendario: ${err.message}</div>`;
  }
}

function getChannelBadge(channel) {
  const ch = (channel || '').toLowerCase();
  let badgeClass = 'ch-otro';
  let icon = '🏷️';

  if (ch.includes('booking')) { badgeClass = 'ch-booking'; icon = '🏨'; }
  else if (ch.includes('airbnb')) { badgeClass = 'ch-airbnb'; icon = '🏠'; }
  else if (ch.includes('tripadvisor')) { badgeClass = 'ch-tripadvisor'; icon = '🦉'; }
  else if (ch.includes('trivago')) { badgeClass = 'ch-trivago'; icon = '🔍'; }
  else if (ch.includes('agoda')) { badgeClass = 'ch-agoda'; icon = '🌏'; }
  else if (ch.includes('hostales')) { badgeClass = 'ch-hostales'; icon = '🛌'; }
  else if (ch.includes('kayak')) { badgeClass = 'ch-kayak'; icon = '🛶'; }
  else if (ch.includes('hostelworld')) { badgeClass = 'ch-hostelworld'; icon = '🌐'; }
  else if (ch.includes('directa')) { badgeClass = 'ch-directa'; icon = '📞'; }
  else if (ch.includes('sitio web') || ch.includes('web')) { badgeClass = 'ch-web'; icon = '💻'; }
  else if (ch.includes('bloqueo')) { badgeClass = 'ch-otro'; icon = '🚫'; }

  return `<span class="badge-channel ${badgeClass}">${icon} ${escapeHtml(channel)}</span>`;
}

function getStatusBadge(status) {
  switch (status) {
    case 'pending': return `<span class="badge-status badge-pending">Pendiente</span>`;
    case 'confirmed': return `<span class="badge-status badge-confirmed">Confirmada</span>`;
    case 'cancelled': return `<span class="badge-status badge-cancelled">Cancelada</span>`;
    case 'completed': return `<span class="badge-status badge-completed">Completada</span>`;
    case 'blocked': return `<span class="badge-status badge-cancelled" style="background: rgba(239, 68, 68, 0.25); color: #f87171; border-color: rgba(239, 68, 68, 0.5);">Bloqueada</span>`;
    default: return `<span class="badge-status badge-pending">${status}</span>`;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[m]);
}

/* =========================================================
   GESTIÓN DE RECOMENDACIONES (/recomendaciones)
   ========================================================= */

let adminRecommendationsList = [];
let currentAdminRecCategory = 'all';
let currentAdminRecSearch = '';

function setupRecommendationsTab() {
  const btnOpenModal = document.getElementById('btn-open-rec-modal');
  const btnCloseModal = document.getElementById('btn-close-rec-modal');
  const btnCancelModal = document.getElementById('btn-cancel-rec-modal');
  const modal = document.getElementById('modal-recommendation');
  const form = document.getElementById('rec-modal-form');
  const searchInput = document.getElementById('admin-rec-search');
  const filterBtns = document.querySelectorAll('#admin-rec-category-filters .btn-filter-tag');

  if (btnOpenModal) {
    btnOpenModal.addEventListener('click', () => openRecommendationModal(null));
  }

  if (btnCloseModal) btnCloseModal.addEventListener('click', closeRecommendationModal);
  if (btnCancelModal) btnCancelModal.addEventListener('click', closeRecommendationModal);

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeRecommendationModal();
    });
  }

  if (form) {
    form.addEventListener('submit', saveRecommendationForm);
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentAdminRecSearch = e.target.value.trim().toLowerCase();
      renderAdminRecommendationsTable();
    });
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.classList.remove('active');
        b.style.background = 'transparent';
        b.style.color = 'var(--text-muted)';
        b.style.borderColor = 'rgba(255,255,255,0.1)';
      });
      btn.classList.add('active');
      btn.style.background = '#334155';
      btn.style.color = '#fff';
      btn.style.borderColor = 'rgba(255,255,255,0.2)';

      currentAdminRecCategory = btn.getAttribute('data-filter') || 'all';
      renderAdminRecommendationsTable();
    });
  });
}

async function loadAdminRecommendations() {
  const tbody = document.getElementById('table-recommendations-body');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-muted);">
        ⌛ Cargando recomendaciones desde el servidor...
      </td>
    </tr>
  `;

  try {
    const res = await authFetch('/api/recommendations/admin');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.recommendations)) {
        adminRecommendationsList = data.recommendations;
      } else {
        adminRecommendationsList = [];
      }
    } else {
      console.warn('Endpoint admin/recommendations no retornó ok, intentando GET público...');
      const publicRes = await authFetch('/api/recommendations');
      const publicData = await publicRes.json();
      adminRecommendationsList = publicData.recommendations || [];
    }
  } catch (err) {
    console.error('Error al cargar recomendaciones admin:', err);
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 2rem; color: #f87171;">
          ⚠️ Error al cargar las recomendaciones: ${escapeHtml(err.message)}
        </td>
      </tr>
    `;
    return;
  }

  renderAdminRecommendationsTable();
}

function renderAdminRecommendationsTable() {
  const tbody = document.getElementById('table-recommendations-body');
  if (!tbody) return;

  let filtered = adminRecommendationsList.filter(rec => {
    if (currentAdminRecCategory !== 'all' && rec.category !== currentAdminRecCategory) {
      return false;
    }

    if (currentAdminRecSearch) {
      const name = (rec.name || '').toLowerCase();
      const desc = (rec.description || '').toLowerCase();
      const phone = (rec.phone || '').toLowerCase();
      const addr = (rec.address || '').toLowerCase();
      return name.includes(currentAdminRecSearch) || desc.includes(currentAdminRecSearch) || phone.includes(currentAdminRecSearch) || addr.includes(currentAdminRecSearch);
    }

    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-muted);">
          No hay recomendaciones registradas que coincidan con el filtro.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(rec => {
    const categoryBadges = {
      termas: '<span style="background: rgba(2,132,199,0.2); color: #38bdf8; padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">♨️ Termas</span>',
      restaurantes: '<span style="background: rgba(225,29,72,0.2); color: #fb7185; padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">🍽️ Restaurantes</span>',
      delivery: '<span style="background: rgba(147,51,234,0.2); color: #c084fc; padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">🛵 Deliverys</span>',
      entretencion: '<span style="background: rgba(22,163,74,0.2); color: #4ade80; padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">🏔️ Entretención</span>',
      cafeterias: '<span style="background: rgba(180,83,9,0.2); color: #fbbf24; padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">☕ Cafeterías</span>',
      comidas: '<span style="background: rgba(217,119,6,0.2); color: #f59e0b; padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">🍕 Comidas</span>'
    };

    const catBadge = categoryBadges[rec.category] || `<span style="background: #334155; color: #94a3b8; padding: 3px 8px; border-radius: 6px; font-size: 0.75rem;">${escapeHtml(rec.category)}</span>`;

    const statusBadge = rec.is_active !== false
      ? `<span style="background: rgba(34,197,94,0.2); color: #4ade80; padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">● Activa</span>`
      : `<span style="background: rgba(239,68,68,0.2); color: #f87171; padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">○ Inactiva</span>`;

    const linksHtml = [];
    if (rec.maps_url) linksHtml.push(`<a href="${escapeHtml(rec.maps_url)}" target="_blank" title="Ver en Maps" style="color: #ef4444; margin-right: 6px;">📍 Maps</a>`);
    if (rec.instagram_url) linksHtml.push(`<a href="${escapeHtml(rec.instagram_url)}" target="_blank" title="Instagram" style="color: #ec4899; margin-right: 6px;">📸 IG</a>`);
    if (rec.website_url) linksHtml.push(`<a href="${escapeHtml(rec.website_url)}" target="_blank" title="Sitio Web" style="color: #3b82f6;">🌐 Web</a>`);

    return `
      <tr>
        <td style="font-weight: 700; color: var(--gold, #c89d5b); text-align: center;">${rec.display_order || 0}</td>
        <td>
          <div style="font-weight: 700; color: #fff; font-size: 0.92rem;">${escapeHtml(rec.name)}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted); max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;">${escapeHtml(rec.description || '')}</div>
        </td>
        <td>${catBadge}</td>
        <td style="font-size: 0.85rem; color: #cbd5e1;">${escapeHtml(rec.phone || '-')}</td>
        <td style="font-size: 0.85rem; color: #cbd5e1; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(rec.address || '-')}</td>
        <td style="font-size: 0.82rem;">${linksHtml.join('') || '<span style="color: #64748b;">-</span>'}</td>
        <td>${statusBadge}</td>
        <td style="text-align: right; white-space: nowrap;">
          <div style="display: inline-flex; gap: 4px; justify-content: flex-end;">
            <button class="btn-rec-action btn-edit-rec" data-id="${rec.id}" title="Editar Recomendación">✏️</button>
            <button class="btn-rec-action btn-toggle-status-rec" data-id="${rec.id}" data-active="${rec.is_active !== false}" title="${rec.is_active !== false ? 'Desactivar / Ocultar' : 'Activar / Mostrar'}">
              ${rec.is_active !== false ? '👁️' : '🙈'}
            </button>
            <button class="btn-rec-action btn-delete btn-delete-rec" data-id="${rec.id}" title="Eliminar Recomendación">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Event Listeners en la tabla
  tbody.querySelectorAll('.btn-edit-rec').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const item = adminRecommendationsList.find(r => r.id === id);
      if (item) openRecommendationModal(item);
    });
  });

  tbody.querySelectorAll('.btn-toggle-status-rec').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const isCurrentlyActive = btn.getAttribute('data-active') === 'true';
      await toggleRecommendationStatusItem(id, !isCurrentlyActive);
    });
  });

  tbody.querySelectorAll('.btn-delete-rec').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm('¿Está seguro de eliminar esta recomendación?')) {
        await deleteRecommendationItem(id);
      }
    });
  });
}

function openRecommendationModal(rec = null) {
  const modal = document.getElementById('modal-recommendation');
  const title = document.getElementById('rec-modal-title');
  const errAlert = document.getElementById('rec-modal-error-alert');

  if (!modal) return;
  if (errAlert) errAlert.style.display = 'none';

  document.getElementById('rec-id-hidden').value = rec ? rec.id : '';
  document.getElementById('rec-form-name').value = rec ? rec.name : '';
  document.getElementById('rec-form-category').value = rec ? rec.category : 'restaurantes';
  document.getElementById('rec-form-phone').value = rec ? rec.phone || '' : '';
  document.getElementById('rec-form-address').value = rec ? rec.address || '' : '';
  document.getElementById('rec-form-maps').value = rec ? rec.maps_url || '' : '';
  document.getElementById('rec-form-instagram').value = rec ? rec.instagram_url || '' : '';
  document.getElementById('rec-form-website').value = rec ? rec.website_url || '' : '';
  document.getElementById('rec-form-order').value = rec ? (rec.display_order !== undefined ? rec.display_order : 1) : (adminRecommendationsList.length + 1);
  document.getElementById('rec-form-description').value = rec ? rec.description || '' : '';
  document.getElementById('rec-form-active').checked = rec ? rec.is_active !== false : true;

  if (title) {
    title.textContent = rec ? '✏️ Editar Recomendación' : '⭐ Crear Nueva Recomendación';
  }

  modal.style.display = 'flex';
}

function closeRecommendationModal() {
  const modal = document.getElementById('modal-recommendation');
  if (modal) modal.style.display = 'none';
}

async function saveRecommendationForm(e) {
  e.preventDefault();
  const errAlert = document.getElementById('rec-modal-error-alert');
  const btnSave = document.getElementById('btn-save-rec');

  const id = document.getElementById('rec-id-hidden').value;
  const name = document.getElementById('rec-form-name').value.trim();
  const category = document.getElementById('rec-form-category').value;
  const phone = document.getElementById('rec-form-phone').value.trim();
  const address = document.getElementById('rec-form-address').value.trim();
  const maps_url = document.getElementById('rec-form-maps').value.trim();
  const instagram_url = document.getElementById('rec-form-instagram').value.trim();
  const website_url = document.getElementById('rec-form-website').value.trim();
  const display_order = parseInt(document.getElementById('rec-form-order').value || '0', 10);
  const description = document.getElementById('rec-form-description').value.trim();
  const is_active = document.getElementById('rec-form-active').checked;

  if (!name || !category) {
    if (errAlert) {
      errAlert.textContent = 'Por favor complete el nombre y la categoría.';
      errAlert.style.display = 'block';
    }
    return;
  }

  const payload = {
    name,
    category,
    phone,
    address,
    maps_url,
    instagram_url,
    website_url,
    display_order,
    description,
    is_active
  };

  try {
    if (btnSave) btnSave.disabled = true;

    const url = id ? `/api/recommendations/admin/${id}` : '/api/recommendations/admin';
    const method = id ? 'PUT' : 'POST';

    const res = await authFetch(url, {
      method,
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Error al guardar la recomendación.');
    }

    closeRecommendationModal();
    await loadAdminRecommendations();
  } catch (err) {
    console.error('Error al guardar recomendación:', err);
    if (errAlert) {
      errAlert.textContent = err.message || 'Error al guardar recomendación.';
      errAlert.style.display = 'block';
    }
  } finally {
    if (btnSave) btnSave.disabled = false;
  }
}

async function toggleRecommendationStatusItem(id, newStatus) {
  try {
    const res = await authFetch(`/api/recommendations/admin/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: newStatus })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      await loadAdminRecommendations();
    } else {
      alert(data.error || 'Error al cambiar estado.');
    }
  } catch (err) {
    console.error('Error toggle status:', err);
    alert('Error al actualizar el estado de la recomendación.');
  }
}

async function deleteRecommendationItem(id) {
  try {
    const res = await authFetch(`/api/recommendations/admin/${id}`, {
      method: 'DELETE'
    });

    const data = await res.json();
    if (res.ok && data.success) {
      await loadAdminRecommendations();
    } else {
      alert(data.error || 'Error al eliminar recomendación.');
    }
  } catch (err) {
    console.error('Error delete recommendation:', err);
    alert('Error al eliminar recomendación.');
  }
}

