document.addEventListener('DOMContentLoaded', () => {
  "use strict";

  const dateBookingEl = document.getElementById('date_booking');
  if (!dateBookingEl || typeof easepick === 'undefined') return;

  const DateTime = easepick.DateTime;
  let dynamicBookedDates = [];

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

  // Función para obtener las fechas reservadas o bloqueadas de la habitación seleccionada
  async function fetchBookedDatesForRoom(roomName = '') {
    try {
      if (!roomName || roomName.includes('Seleccionar')) {
        dynamicBookedDates = [];
        return;
      }

      const url = `/api/reservations/booked-dates?room_name=${encodeURIComponent(roomName)}`;
      const res = await fetch(getApiUrl(url));
      const data = await res.json();

      if (data.success && Array.isArray(data.bookedDates)) {
        dynamicBookedDates = data.bookedDates.map(d => {
          if (Array.isArray(d)) {
            return [new DateTime(d[0], 'YYYY-MM-DD'), new DateTime(d[1], 'YYYY-MM-DD')];
          }
          return new DateTime(d, 'YYYY-MM-DD');
        });
      } else {
        dynamicBookedDates = [];
      }
    } catch (err) {
      console.error('Error al cargar fechas reservadas:', err);
      dynamicBookedDates = [];
    }
  }

  /* Configuración del Calendario Easepick */
  const picker = new easepick.create({
    element: dateBookingEl,
    css: ['assets/css/daterangepicker_v2.css'],
    lang: 'es-ES',
    format: "YYYY-MM-DD",
    calendars: 2,
    grid: 2,
    zIndex: 10,
    inline: true,
    plugins: ['LockPlugin', 'RangePlugin'],
    RangePlugin: {
      tooltipNumber(num) {
        return num - 1;
      },
      locale: {
        one: 'noche',
        other: 'noches',
      },
    },
    LockPlugin: {
      minDate: new Date(),
      minDays: 1,
      inseparable: false,
      filter(date, picked) {
        if (picked && picked.length === 1) {
          const incl = date.isBefore(picked[0]) ? '[)' : '(]';
          return !picked[0].isSame(date, 'day') && date.inArray(dynamicBookedDates, incl);
        }
        return date.inArray(dynamicBookedDates, '[)');
      }
    },
  });

  // Escuchar evento select de easepick para recalcular total
  picker.on('select', (e) => {
    calculateAndShowTotal();
  });

  // Función para calcular y mostrar el precio total
  async function calculateAndShowTotal() {
    const totalDisplay = document.getElementById('booking-total-display');
    const totalValue = document.getElementById('booking-total-value');
    const nightsCount = document.getElementById('booking-nights-count');
    
    if (!totalDisplay || !totalValue || !nightsCount) return;

    const roomSelect = document.getElementById('room_select');
    const roomName = roomSelect ? roomSelect.value : '';
    
    const startD = picker.getStartDate();
    const endD = picker.getEndDate();

    if (!startD || !endD || !roomName || roomName.includes('Seleccionar')) {
      totalDisplay.style.display = 'none';
      return;
    }

    const checkIn = startD.format('YYYY-MM-DD');
    const checkOut = endD.format('YYYY-MM-DD');

    try {
      const url = `/api/reservations/calculate-price?room_name=${encodeURIComponent(roomName)}&check_in=${checkIn}&check_out=${checkOut}`;
      const res = await fetch(getApiUrl(url));
      const data = await res.json();

      if (data.success && data.totalPrice !== undefined) {
        totalValue.textContent = `$${Number(data.totalPrice).toLocaleString('es-CL')} CLP`;
        nightsCount.textContent = `(${data.nights} ${data.nights === 1 ? 'noche' : 'noches'})`;
        totalDisplay.style.display = 'block';
      } else {
        totalDisplay.style.display = 'none';
      }
    } catch (err) {
      console.error('Error al calcular el precio total:', err);
      totalDisplay.style.display = 'none';
    }
  }

  // Función para actualizar la habitación activa y refrescar el calendario
  async function updateCalendarForRoom(roomName) {
    await fetchBookedDatesForRoom(roomName);
    picker.clear();
    picker.render();
    calculateAndShowTotal();
  }

  // Escuchar cambios en el selector de habitación (Vanilla JS y jQuery NiceSelect)
  const roomSelect = document.getElementById('room_select');
  if (roomSelect) {
    roomSelect.addEventListener('change', (e) => {
      updateCalendarForRoom(e.target.value);
    });

    if (typeof $ !== 'undefined') {
      $('#room_select').on('change', function() {
        updateCalendarForRoom($(this).val());
      });
    }

    if (roomSelect.value && !roomSelect.value.includes('Seleccionar')) {
      updateCalendarForRoom(roomSelect.value);
    }
  }
});