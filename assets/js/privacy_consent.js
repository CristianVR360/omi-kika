/**
 * Gestor de Consentimiento de Cookies y Recursos de Terceros
 * Cumplimiento Ley N° 21.719 (Protección de Datos Personales — Chile)
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'omikika_cookie_consent_v1';
  const CONSENT_VERSION = '2026-11';
  const PRIVACY_URL = '/privacidad.html';

  function getSavedConsent() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.version === CONSENT_VERSION) {
        return parsed;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  function saveConsent(preferences) {
    const record = {
      version: CONSENT_VERSION,
      necessary: true,
      third_party: Boolean(preferences.third_party),
      updated_at: new Date().toISOString()
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch (e) {
      // Ignorar si almacenamiento local está bloqueado
    }
    applyConsentToEmbeds(record);
    hideBanner();
    closeModal();
    return record;
  }

  function applyConsentToEmbeds(consent) {
    const allowThirdParty = Boolean(consent && consent.third_party);
    const embeds = document.querySelectorAll('iframe[data-consent-category="third_party"]');

    embeds.forEach((iframe) => {
      const targetSrc = iframe.getAttribute('data-src');
      if (!targetSrc) return;

      const wrapper = iframe.closest('.map-responsive') || iframe.parentElement;
      let placeholder = wrapper ? wrapper.querySelector('.omikika-embed-blocked') : null;

      if (allowThirdParty) {
        if (iframe.getAttribute('src') !== targetSrc) {
          iframe.setAttribute('src', targetSrc);
        }
        iframe.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
      } else {
        if (iframe.getAttribute('src')) {
          iframe.removeAttribute('src');
        }
        iframe.style.display = 'none';

        if (!placeholder && wrapper) {
          placeholder = document.createElement('div');
          placeholder.className = 'omikika-embed-blocked';
          placeholder.innerHTML = `
            <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:1.25rem;text-align:center;color:#334155;font-size:0.9rem;">
              <p style="margin:0 0 0.75rem 0;line-height:1.45;">
                <strong>Mapa interactivo bloqueado (Ley N° 21.719)</strong><br/>
                Para ver Google Maps en esta sección debes autorizar servicios y cookies de terceros.
              </p>
              <div style="display:flex;gap:0.5rem;justify-content:center;flex-wrap:wrap;">
                <button type="button" class="omikika-btn-enable-map" style="background:#1f2937;color:#fff;border:none;border-radius:6px;padding:0.45rem 0.9rem;font-size:0.85rem;font-weight:600;cursor:pointer;">
                  Activar Google Maps
                </button>
                <a href="${PRIVACY_URL}" style="color:#2b6cb0;font-size:0.85rem;align-self:center;text-decoration:underline;">
                  Política de Privacidad
                </a>
              </div>
            </div>
          `;
          wrapper.appendChild(placeholder);
          const enableBtn = placeholder.querySelector('.omikika-btn-enable-map');
          if (enableBtn) {
            enableBtn.addEventListener('click', () => {
              saveConsent({ third_party: true });
            });
          }
        }
        if (placeholder) placeholder.style.display = 'block';
      }
    });
  }

  function injectStyles() {
    if (document.getElementById('omikika-privacy-styles')) return;
    const style = document.createElement('style');
    style.id = 'omikika-privacy-styles';
    style.textContent = `
      .omikika-cookie-banner {
        position: fixed;
        left: 16px;
        right: 16px;
        bottom: 16px;
        z-index: 99990;
        max-width: 960px;
        margin: 0 auto;
        background: #111827;
        color: #f8fafc;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 12px;
        padding: 1rem 1.25rem;
        box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        font-family: 'Montserrat', system-ui, -apple-system, sans-serif;
      }
      .omikika-cookie-banner-text {
        flex: 1 1 320px;
        font-size: 0.84rem;
        line-height: 1.5;
        color: #e2e8f0;
      }
      .omikika-cookie-banner-text a {
        color: #93c5fd;
        text-decoration: underline;
      }
      .omikika-cookie-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        align-items: center;
      }
      .omikika-cbtn {
        border-radius: 7px;
        padding: 0.5rem 0.9rem;
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
        border: 1px solid transparent;
        transition: opacity 0.15s ease;
      }
      .omikika-cbtn:hover { opacity: 0.9; }
      .omikika-cbtn-reject {
        background: transparent;
        color: #f8fafc;
        border-color: rgba(255, 255, 255, 0.35);
      }
      .omikika-cbtn-config {
        background: #1e293b;
        color: #e2e8f0;
        border-color: rgba(255, 255, 255, 0.2);
      }
      .omikika-cbtn-accept {
        background: #c89d5b;
        color: #111827;
      }
      .omikika-cookie-modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.72);
        z-index: 99995;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        font-family: 'Montserrat', system-ui, -apple-system, sans-serif;
      }
      .omikika-cookie-modal {
        background: #ffffff;
        color: #1e293b;
        width: 100%;
        max-width: 540px;
        border-radius: 12px;
        padding: 1.5rem;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.35);
        max-height: 90vh;
        overflow-y: auto;
      }
      .omikika-cookie-cat {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 0.9rem;
        margin-bottom: 0.85rem;
        background: #f8fafc;
      }
      .omikika-cookie-cat-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        font-weight: 600;
        font-size: 0.9rem;
        margin-bottom: 0.35rem;
      }
      .omikika-cookie-cat p {
        margin: 0;
        font-size: 0.8rem;
        color: #475569;
        line-height: 1.45;
      }
      @media (max-width: 600px) {
        .omikika-cookie-banner {
          left: 10px;
          right: 10px;
          bottom: 10px;
          padding: 0.9rem;
        }
        .omikika-cookie-actions {
          width: 100%;
        }
        .omikika-cbtn {
          flex: 1 1 auto;
          text-align: center;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function showBanner() {
    if (document.getElementById('omikika-cookie-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'omikika-cookie-banner';
    banner.className = 'omikika-cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Preferencias de cookies y privacidad');
    banner.innerHTML = `
      <div class="omikika-cookie-banner-text">
        <strong>Tu privacidad importa (Ley N° 21.719)</strong><br/>
        Usamos almacenamiento técnico esencial para que el sitio funcione y, solo si lo autorizas, cargamos servicios de terceros (como Google Maps). Puedes aceptar, rechazar o configurar tus preferencias en nuestra
        <a href="${PRIVACY_URL}">Política de Privacidad</a>.
      </div>
      <div class="omikika-cookie-actions">
        <button type="button" id="omikika-cookie-reject" class="omikika-cbtn omikika-cbtn-reject">Rechazar no esenciales</button>
        <button type="button" id="omikika-cookie-config" class="omikika-cbtn omikika-cbtn-config">Configurar</button>
        <button type="button" id="omikika-cookie-accept" class="omikika-cbtn omikika-cbtn-accept">Aceptar todas</button>
      </div>
    `;
    document.body.appendChild(banner);

    document.getElementById('omikika-cookie-reject').addEventListener('click', () => {
      saveConsent({ third_party: false });
    });
    document.getElementById('omikika-cookie-accept').addEventListener('click', () => {
      saveConsent({ third_party: true });
    });
    document.getElementById('omikika-cookie-config').addEventListener('click', () => {
      openModal();
    });
  }

  function hideBanner() {
    const banner = document.getElementById('omikika-cookie-banner');
    if (banner) banner.remove();
  }

  function ensureModal() {
    let backdrop = document.getElementById('omikika-cookie-modal-backdrop');
    if (backdrop) return backdrop;

    backdrop = document.createElement('div');
    backdrop.id = 'omikika-cookie-modal-backdrop';
    backdrop.className = 'omikika-cookie-modal-backdrop';
    backdrop.innerHTML = `
      <div class="omikika-cookie-modal" role="dialog" aria-modal="true" aria-labelledby="omikika-cookie-modal-title">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
          <h4 id="omikika-cookie-modal-title" style="margin:0;font-size:1.1rem;font-weight:700;color:#111827;">Configuración de Cookies y Privacidad</h4>
          <button type="button" id="omikika-cookie-modal-close" aria-label="Cerrar" style="background:none;border:none;font-size:1.4rem;line-height:1;cursor:pointer;color:#64748b;">&times;</button>
        </div>
        <p style="font-size:0.83rem;color:#475569;margin-bottom:1rem;line-height:1.5;">
          De acuerdo con la <strong>Ley N° 21.719</strong> de Chile, ninguna cookie o servicio no esencial se activa sin tu consentimiento previo, libre y específico. Consulta los detalles en nuestra <a href="${PRIVACY_URL}" style="color:#2b6cb0;text-decoration:underline;">Política de Privacidad y Derechos ARCOP</a>.
        </p>

        <div class="omikika-cookie-cat">
          <div class="omikika-cookie-cat-header">
            <span>Cookies y almacenamiento técnico necesario</span>
            <span style="font-size:0.75rem;background:#dcfce7;color:#166534;padding:2px 8px;border-radius:999px;">Siempre activo</span>
          </div>
          <p>Indispensables para recordar tu elección de consentimiento, navegar por el sitio y procesar solicitudes de reserva.</p>
        </div>

        <div class="omikika-cookie-cat">
          <div class="omikika-cookie-cat-header">
            <label for="omikika-toggle-third-party" style="cursor:pointer;margin:0;">Servicios y mapas de terceros (Google Maps)</label>
            <input type="checkbox" id="omikika-toggle-third-party" style="width:18px;height:18px;cursor:pointer;">
          </div>
          <p>Permite cargar el mapa interactivo de ubicación de Google Maps. Al activarlo, Google puede recibir tu IP y establecer cookies propias.</p>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:0.5rem;flex-wrap:wrap;margin-top:1.15rem;">
          <button type="button" id="omikika-modal-reject" class="omikika-cbtn" style="background:#f1f5f9;color:#1e293b;border-color:#cbd5e1;">Rechazar opcionales</button>
          <button type="button" id="omikika-modal-save" class="omikika-cbtn" style="background:#1f2937;color:#fff;">Guardar preferencias</button>
          <button type="button" id="omikika-modal-accept" class="omikika-cbtn omikika-cbtn-accept">Aceptar todas</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    document.getElementById('omikika-cookie-modal-close').addEventListener('click', closeModal);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    });
    document.getElementById('omikika-modal-reject').addEventListener('click', () => {
      saveConsent({ third_party: false });
    });
    document.getElementById('omikika-modal-accept').addEventListener('click', () => {
      saveConsent({ third_party: true });
    });
    document.getElementById('omikika-modal-save').addEventListener('click', () => {
      const checked = document.getElementById('omikika-toggle-third-party').checked;
      saveConsent({ third_party: checked });
    });

    return backdrop;
  }

  function openModal() {
    const backdrop = ensureModal();
    const saved = getSavedConsent();
    const toggle = document.getElementById('omikika-toggle-third-party');
    if (toggle) {
      // Nunca premarcado si aún no existe consentimiento previo
      toggle.checked = Boolean(saved && saved.third_party);
    }
    backdrop.style.display = 'flex';
  }

  function closeModal() {
    const backdrop = document.getElementById('omikika-cookie-modal-backdrop');
    if (backdrop) backdrop.style.display = 'none';
  }

  function init() {
    injectStyles();
    const saved = getSavedConsent();
    applyConsentToEmbeds(saved || { third_party: false });

    if (!saved) {
      showBanner();
    }

    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-open-cookie-settings]');
      if (trigger) {
        e.preventDefault();
        openModal();
      }
    });
  }

  window.openCookiePreferences = openModal;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

