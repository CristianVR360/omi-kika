// Manejador de Autenticación de Administrador en Frontend
const TOKEN_KEY = 'omikika_admin_token';
const USER_KEY = 'omikika_admin_user';

export const getApiUrl = (path) => {
  if (!path) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  
  const h = window.location.hostname;
  const proto = window.location.protocol;
  const isFile = proto === 'file:' || !h;
  const isLocalNetwork = isFile || h === 'localhost' || h === '127.0.0.1' || h.startsWith('192.168.') || h.startsWith('10.') || h.endsWith('.local') || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h);
  
  if (isFile) {
    return `http://127.0.0.1:3000${path.startsWith('/') ? path : '/' + path}`;
  }

  if (isLocalNetwork && window.location.port && window.location.port !== '3000') {
    return `${proto}//${h || '127.0.0.1'}:3000${path.startsWith('/') ? path : '/' + path}`;
  }
  
  return path;
};

export const getAuthToken = () => localStorage.getItem(TOKEN_KEY);

export const getAuthUser = () => {
  const userStr = localStorage.getItem(USER_KEY);
  try {
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    return null;
  }
};

export const setAuthSession = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearAuthSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const checkAuthOrRedirect = () => {
  const token = getAuthToken();
  if (!token) {
    window.location.href = '/admin/login.html';
  }
};

export const authFetch = async (url, options = {}) => {
  const token = getAuthToken();
  const { timeoutMs = 15000, signal: externalSignal, ...fetchOptions } = options;

  const headers = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  let timedOut = false;

  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  const timeoutId = timeoutMs > 0
    ? setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs)
    : null;

  try {
    const fullUrl = getApiUrl(url);
    const response = await fetch(fullUrl, {
      cache: 'no-store',
      ...fetchOptions,
      headers,
      signal: controller.signal
    });

    if (response.status === 401) {
      clearAuthSession();
      window.location.href = '/admin/login.html';
      throw new Error('Sesión expirada. Inicie sesión nuevamente.');
    }

    return response;
  } catch (err) {
    if (timedOut) {
      const timeoutErr = new Error('Tiempo de espera agotado al conectar con el servidor.');
      timeoutErr.name = 'TimeoutError';
      throw timeoutErr;
    }
    throw err;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
};

const isRetryableStatus = (status) => status === 408 || status === 429 || status >= 500;

/**
 * Wrapper de authFetch con reintentos automáticos y backoff exponencial.
 * Útil para mitigar cold starts de Vercel Serverless o latencia de red.
 * @param {string} url - URL a solicitar
 * @param {object} options - Opciones de fetch
 * @param {number} maxRetries - Número máximo de reintentos (por defecto 3)
 * @returns {Promise<Response>}
 */
export const authFetchWithRetry = async (url, options = {}, maxRetries = 3) => {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (options.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    try {
      const res = await authFetch(url, options);
      if (!isRetryableStatus(res.status)) {
        return res;
      }
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      if (err.name === 'AbortError' || options.signal?.aborted) throw err;
      if (err.message && err.message.includes('Sesión expirada')) throw err;
      lastError = err;
    }
    if (attempt < maxRetries) {
      const delay = 700 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 200);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
};

/**
 * Ejecuta authFetch y parsea JSON dentro del ciclo de reintentos para cubrir
 * respuestas HTML/truncadas de errores transitorios (502/504/429) o timeouts.
 * @param {string} url - URL a solicitar
 * @param {object} options - Opciones de fetch
 * @param {number} maxRetries - Número máximo de intentos (por defecto 3)
 * @returns {Promise<{res: Response, data: any}>}
 */
export const authFetchJsonWithRetry = async (url, options = {}, maxRetries = 3) => {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (options.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    try {
      const res = await authFetch(url, options);
      if (isRetryableStatus(res.status)) {
        lastError = new Error(`HTTP ${res.status}`);
      } else {
        const text = await res.text();
        let data;
        try {
          data = text ? JSON.parse(text) : {};
        } catch (parseErr) {
          throw new Error(`Respuesta inválida del servidor (HTTP ${res.status})`);
        }
        return { res, data };
      }
    } catch (err) {
      if (err.name === 'AbortError' || options.signal?.aborted) throw err;
      if (err.message && err.message.includes('Sesión expirada')) throw err;
      lastError = err;
    }
    if (attempt < maxRetries) {
      const delay = 700 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 200);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
};
