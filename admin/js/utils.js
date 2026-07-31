/**
 * Utilidades comunes para el dashboard de administración
 */

/**
 * Wrapper de fetch con reintentos automáticos y timeout.
 * @param {string} url - URL completa (incluye protocolo).
 * @param {Object} [options={}] - Opciones de fetch (method, headers, body, etc.).
 * @param {number} [retries=3] - Número máximo de intentos.
 * @param {number} [backoff=500] - Tiempo inicial de back‑off en ms (exponencial).
 * @returns {Promise<Response>} Resolución con la respuesta exitosa.
 */
export async function fetchWithRetry(url, options = {}, retries = 3, backoff = 500) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 s timeout
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        // Reintentar solo errores de servidor (5xx)
        if (response.status >= 500 && attempt < retries) {
          await new Promise(r => setTimeout(r, backoff * Math.pow(2, attempt)));
          continue;
        }
        const errText = await response.text();
        throw new Error(`Error ${response.status}: ${errText}`);
      }
      return response;
    } catch (err) {
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, backoff * Math.pow(2, attempt)));
      } else {
        throw err;
      }
    }
  }
  throw new Error('Máximo número de reintentos alcanzado');
}

/**
 * Toast simple para notificaciones al usuario.
 * @param {string} message - Mensaje a mostrar.
 * @param {string} [type='error'] - Tipo: 'error' | 'info' | 'success'.
 */
export function showToast(message, type = 'error') {
  const toast = document.createElement('div');
  toast.className = `admin-toast admin-toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}
