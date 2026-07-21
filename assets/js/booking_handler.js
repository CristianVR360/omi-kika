/**
 * Manejador del Formulario Público de Reservas para Omikika B&B
 */
document.addEventListener('DOMContentLoaded', () => {
  const btnBookNow = document.getElementById('btn_book_now');
  if (!btnBookNow) return;

  // Insertar Modal de Datos del Cliente al final del DOM
  createBookingModal();

  btnBookNow.addEventListener('click', (e) => {
    e.preventDefault();

    const roomSelect = document.getElementById('room_select');
    const selectedRoom = roomSelect ? roomSelect.value : '';

    if (!selectedRoom || selectedRoom.includes('Seleccionar habitación')) {
      alert('Por favor, selecciona una habitación para continuar.');
      return;
    }

    const dateBookingInput = document.getElementById('date_booking');
    const dateValue = dateBookingInput ? dateBookingInput.value : '';

    const adultsInput = document.getElementById('adults_booking');
    const childsInput = document.getElementById('childs_booking');

    const adults = (adultsInput && adultsInput.value) ? parseInt(adultsInput.value, 10) : 1;
    const children = (childsInput && childsInput.value) ? parseInt(childsInput.value, 10) : 0;

    // Actualizar resumen en el modal
    document.getElementById('modal_summary_room').textContent = selectedRoom;
    document.getElementById('modal_summary_guests').textContent = `${adults} Adultos${children > 0 ? `, ${children} Niños` : ''}`;

    // Desplegar Modal Bootstrap
    const modalEl = document.getElementById('bookingModal');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  });

  // Manejador del submit del formulario del modal
  const form = document.getElementById('bookingModalForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const alertDiv = document.getElementById('modal_booking_alert');
      const btnSubmit = document.getElementById('btn_confirm_booking');
      
      alertDiv.style.display = 'none';
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Enviando solicitud...';

      const roomSelect = document.getElementById('room_select');
      const roomName = roomSelect ? roomSelect.value : '';

      const dateValue = document.getElementById('date_booking').value;
      const dateIn = document.getElementById('modal_check_in').value || getCheckInFromDateRange(dateValue);
      const dateOut = document.getElementById('modal_check_out').value || getCheckOutFromDateRange(dateValue);

      const adults = document.getElementById('adults_booking')?.value || 1;
      const children = document.getElementById('childs_booking')?.value || 0;

      const payload = {
        room_name: roomName,
        check_in: dateIn,
        check_out: dateOut,
        adults,
        children,
        guest_name: document.getElementById('guest_name').value.trim(),
        guest_email: document.getElementById('guest_email').value.trim(),
        guest_phone: document.getElementById('guest_phone').value.trim(),
        notes: document.getElementById('guest_notes').value.trim()
      };

      try {
        const response = await fetch('/api/reservations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'No se pudo procesar la reserva.');
        }

        // Mostrar éxito
        document.getElementById('bookingModalBody').innerHTML = `
          <div style="text-align: center; padding: 2rem 1rem;">
            <div style="font-size: 3rem; color: #16a34a; margin-bottom: 1rem;">🎉</div>
            <h3 style="color: #1e293b; margin-bottom: 0.5rem;">¡Solicitud de Reserva Enviada!</h3>
            <p style="color: #64748b; font-size: 0.95rem; line-height: 1.5;">
              Hemos enviado un comprobante de tu solicitud a <strong>${escapeHtml(payload.guest_email)}</strong>. 
              Nos pondremos en contacto contigo a la brevedad.
            </p>
          </div>
        `;
        document.getElementById('bookingModalFooter').style.display = 'none';

      } catch (err) {
        alertDiv.textContent = err.message;
        alertDiv.style.display = 'block';
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Solicitar Reserva';
      }
    });
  }
  // Manejador del formulario de consultas públicas
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const alertDiv = document.getElementById('contact-alert');
      const btnSend = document.getElementById('btn-send-contact');
      
      if (alertDiv) {
        alertDiv.style.display = 'none';
        alertDiv.className = 'alert';
      }
      
      if (btnSend) {
        btnSend.disabled = true;
        btnSend.textContent = 'Enviando consulta...';
      }

      const payload = {
        name: document.getElementById('contact-name').value.trim(),
        email: document.getElementById('contact-email').value.trim(),
        phone: document.getElementById('contact-phone').value.trim(),
        subject: document.getElementById('contact-subject').value.trim(),
        message: document.getElementById('contact-message').value.trim()
      };

      try {
        const response = await fetch('/api/inquiries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'No se pudo enviar la consulta.');
        }

        if (alertDiv) {
          alertDiv.textContent = data.message || 'Tu consulta ha sido enviada con éxito. Nos comunicaremos contigo pronto.';
          alertDiv.style.backgroundColor = '#d1e7dd';
          alertDiv.style.color = '#0f5132';
          alertDiv.style.border = '1px solid #badbcc';
          alertDiv.style.display = 'block';
        }

        contactForm.reset();

      } catch (err) {
        if (alertDiv) {
          alertDiv.textContent = err.message;
          alertDiv.style.backgroundColor = '#f8d7da';
          alertDiv.style.color = '#842029';
          alertDiv.style.border = '1px solid #f5c2c7';
          alertDiv.style.display = 'block';
        }
      } finally {
        if (btnSend) {
          btnSend.disabled = false;
          btnSend.textContent = 'Enviar Mensaje';
        }
      }
    });
  }
});

function getCheckInFromDateRange(rangeStr) {
  if (rangeStr && rangeStr.includes(' - ')) {
    const parts = rangeStr.split(' - ');
    return parts[0];
  }
  const today = new Date();
  return today.toISOString().split('T')[0];
}

function getCheckOutFromDateRange(rangeStr) {
  if (rangeStr && rangeStr.includes(' - ')) {
    const parts = rangeStr.split(' - ');
    return parts[1];
  }
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  return tomorrow.toISOString().split('T')[0];
}

function createBookingModal() {
  if (document.getElementById('bookingModal')) return;

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const modalHtml = `
    <div class="modal fade" id="bookingModal" tabindex="-1" aria-labelledby="bookingModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content" style="border-radius: 12px; border: none; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
          <div class="modal-header" style="background-color: #1f2937; color: #fff; border-top-left-radius: 12px; border-top-right-radius: 12px;">
            <h5 class="modal-title" id="bookingModalLabel" style="font-weight: 600; color: #ffffff !important;">Solicitud de Reserva — Omikika B&B</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          
          <form id="bookingModalForm">
            <div class="modal-body" id="bookingModalBody" style="padding: 1.5rem;">
              <div id="modal_booking_alert" class="alert alert-danger" style="display: none; font-size: 0.9rem;"></div>
              
              <div style="background-color: #f8fafc; padding: 1rem; border-radius: 8px; margin-bottom: 1.25rem; border: 1px solid #e2e8f0;">
                <div style="font-size: 0.85rem; color: #64748b;">Habitación seleccionada:</div>
                <div id="modal_summary_room" style="font-weight: 600; color: #1e293b; font-size: 1rem;">—</div>
                <div style="font-size: 0.85rem; color: #64748b; margin-top: 0.25rem;" id="modal_summary_guests">1 Adulto</div>
              </div>

              <div class="row g-2 mb-3">
                <div class="col-6">
                  <label for="modal_check_in" class="form-label" style="font-size: 0.85rem; font-weight: 500;">Fecha Check-in</label>
                  <input type="date" class="form-control" id="modal_check_in" value="${todayStr}" required>
                </div>
                <div class="col-6">
                  <label for="modal_check_out" class="form-label" style="font-size: 0.85rem; font-weight: 500;">Fecha Check-out</label>
                  <input type="date" class="form-control" id="modal_check_out" value="${tomorrowStr}" required>
                </div>
              </div>

              <div class="mb-3">
                <label for="guest_name" class="form-label" style="font-size: 0.85rem; font-weight: 500;">Nombre Completo *</label>
                <input type="text" class="form-control" id="guest_name" placeholder="Ej: Maria González" required>
              </div>

              <div class="mb-3">
                <label for="guest_email" class="form-label" style="font-size: 0.85rem; font-weight: 500;">Correo Electrónico *</label>
                <input type="email" class="form-control" id="guest_email" placeholder="ejemplo@correo.com" required>
              </div>

              <div class="mb-3">
                <label for="guest_phone" class="form-label" style="font-size: 0.85rem; font-weight: 500;">Teléfono / WhatsApp *</label>
                <input type="tel" class="form-control" id="guest_phone" placeholder="+56 9 1234 5678" required>
              </div>

              <div class="mb-2">
                <label for="guest_notes" class="form-label" style="font-size: 0.85rem; font-weight: 500;">Comentarios o Solicitudes Especiales</label>
                <textarea class="form-control" id="guest_notes" rows="2" placeholder="Hora estimada de llegada, etc."></textarea>
              </div>
            </div>

            <div class="modal-footer" id="bookingModalFooter" style="background-color: #f8fafc; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px;">
              <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancelar</button>
              <button type="submit" id="btn_confirm_booking" class="btn btn-primary btn-sm" style="background-color: #2b6cb0; border-color: #2b6cb0;">Solicitar Reserva</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
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
