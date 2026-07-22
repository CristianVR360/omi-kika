import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const fromEmail = process.env.RESEND_FROM_EMAIL || 'reservas@omikika.cl';
const adminEmail = process.env.ADMIN_EMAIL || 'reservas@omikika.cl';

/**
 * Envía el correo de confirmación de solicitud de reserva al Huésped
 */
export const sendGuestReservationEmail = async (reservation, roomName) => {
  if (!resend) {
    console.log('[RESEND MOCK] Notificación a Huésped:', reservation.guest_email);
    return { success: true, mock: true };
  }

  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #edf2f7;">
          <h2 style="color: #2b6cb0; margin: 0;">¡Gracias por tu solicitud en Omikika B&B!</h2>
          <p style="color: #718096; margin-top: 5px;">Hemos recibido tu solicitud de reserva.</p>
        </div>
        
        <div style="padding: 20px 0;">
          <p>Hola <strong>${reservation.guest_name}</strong>,</p>
          <p>Tu solicitud ha sido registrada correctamente. A continuación te presentamos los detalles de tu estancia:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr style="background-color: #f7fafc;">
              <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Habitación:</strong></td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${roomName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Check-in:</strong></td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${reservation.check_in}</td>
            </tr>
            <tr style="background-color: #f7fafc;">
              <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Check-out:</strong></td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${reservation.check_out}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Huéspedes:</strong></td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${reservation.adults} Adultos${reservation.children > 0 ? `, ${reservation.children} Niños` : ''}</td>
            </tr>
            <tr style="background-color: #f7fafc;">
              <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Total estimado:</strong></td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">$${Number(reservation.total_price).toLocaleString('es-CL')} CLP</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Estado:</strong></td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;"><span style="color: #d69e2e; font-weight: bold;">Pendiente de Confirmación</span></td>
            </tr>
          </table>

          <p style="margin-top: 20px; color: #4a5568;">Nuestro equipo revisará la disponibilidad y se pondrá en contacto contigo muy pronto para confirmar tu reserva.</p>
        </div>

        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #edf2f7; color: #a0aec0; font-size: 12px;">
          <p>Omikika B&B — Tu hogar junto al lago</p>
        </div>
      </div>
    `;

    const response = await resend.emails.send({
      from: `Omikika B&B <${fromEmail}>`,
      to: [reservation.guest_email],
      subject: `Solicitud de Reserva Recibida — Omikika B&B`,
      html: htmlContent
    });

    return { success: true, data: response };
  } catch (error) {
    console.error('Error enviando email al huésped con Resend:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Envía la alerta de nueva reserva al Administrador
 */
export const sendAdminNotificationEmail = async (reservation, roomName) => {
  if (!resend) {
    console.log('[RESEND MOCK] Notificación a Administrador:', adminEmail);
    return { success: true, mock: true };
  }

  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
        <div style="background-color: #2b6cb0; padding: 15px; border-radius: 6px 6px 0 0; text-align: center;">
          <h3 style="color: #ffffff; margin: 0;">Nueva Solicitud de Reserva Recibida — Dashboard Omikika</h3>
        </div>
        
        <div style="padding: 20px 0;">
          <p>Se ha recibido una nueva solicitud de reserva en la plataforma:</p>
          
          <ul>
            <li><strong>Cliente:</strong> ${reservation.guest_name}</li>
            <li><strong>Email:</strong> ${reservation.guest_email}</li>
            <li><strong>Teléfono:</strong> ${reservation.guest_phone}</li>
            <li><strong>Habitación:</strong> ${roomName}</li>
            <li><strong>Fechas:</strong> del ${reservation.check_in} al ${reservation.check_out}</li>
            <li><strong>Huéspedes:</strong> ${reservation.adults} adultos, ${reservation.children} niños</li>
            <li><strong>Total:</strong> $${Number(reservation.total_price).toLocaleString('es-CL')} CLP</li>
          </ul>

          <p>Accede al panel de administración para revisar y responder a esta solicitud.</p>
        </div>
      </div>
    `;

    const response = await resend.emails.send({
      from: `Sistema Omikika <${fromEmail}>`,
      to: [adminEmail],
      subject: `[Nueva Solicitud de Reserva] ${reservation.guest_name} - ${roomName}`,
      html: htmlContent
    });

    return { success: true, data: response };
  } catch (error) {
    console.error('Error enviando email al administrador con Resend:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Notifica al huésped sobre el cambio de estado (Confirmada / Cancelada)
 */
export const sendStatusUpdateEmail = async (reservation, roomName, newStatus) => {
  if (!resend) {
    console.log(`[RESEND MOCK] Cambio de estado (${newStatus}) a:`, reservation.guest_email);
    return { success: true, mock: true };
  }

  const statusText = newStatus === 'confirmed' ? 'Confirmada ✅' : 'Cancelada ❌';
  const statusColor = newStatus === 'confirmed' ? '#38a169' : '#e53e3e';

  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #edf2f7;">
          <h2 style="color: ${statusColor}; margin: 0;">Tu reserva ha sido ${statusText}</h2>
        </div>
        
        <div style="padding: 20px 0;">
          <p>Hola <strong>${reservation.guest_name}</strong>,</p>
          <p>Te informamos que el estado de tu reserva para la habitación <strong>${roomName}</strong> del <strong>${reservation.check_in}</strong> al <strong>${reservation.check_out}</strong> ha cambiado a:</p>
          <p style="text-align: center; font-size: 18px; font-weight: bold; color: ${statusColor}; background-color: #f7fafc; padding: 12px; border-radius: 6px;">
            ${statusText.toUpperCase()}
          </p>
          <p>Si tienes alguna consulta, no dudes en responder a este correo o contactarnos directamente.</p>
        </div>
      </div>
    `;

    const response = await resend.emails.send({
      from: `Omikika B&B <${fromEmail}>`,
      to: [reservation.guest_email],
      subject: `Actualización de Reserva: ${statusText} — Omikika B&B`,
      html: htmlContent
    });

    return { success: true, data: response };
  } catch (error) {
    console.error('Error enviando actualización de estado con Resend:', error);
    return { success: false, error: error.message };
  }
};
