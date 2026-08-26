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
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fullUrl = getApiUrl(url);
  const response = await fetch(fullUrl, { ...options, headers });

  if (response.status === 401) {
    clearAuthSession();
    window.location.href = '/admin/login.html';
    throw new Error('Sesión expirada. Inicie sesión nuevamente.');
  }

  return response;
};

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
    try {
      const res = await authFetch(url, options);
      // Solo reintentar en errores de servidor (5xx) o de red, no en 4xx
      if (res.ok || (res.status >= 400 && res.status < 500)) {
        return res;
      }
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      // No reintentar si fue un 401 (redirige a login)
      if (err.message && err.message.includes('Sesión expirada')) throw err;
      lastError = err;
    }
    if (attempt < maxRetries) {
      // Backoff exponencial: 800ms, 1600ms
      await new Promise(r => setTimeout(r, 800 * attempt));
    }
  }
  throw lastError;
};
