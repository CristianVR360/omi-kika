// Manejador de Autenticación de Administrador en Frontend
const TOKEN_KEY = 'omikika_admin_token';
const USER_KEY = 'omikika_admin_user';

export const getApiUrl = (path) => {
  if (!path) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  
  const h = window.location.hostname;
  const isLocalNetwork = h === 'localhost' || h === '127.0.0.1' || h.startsWith('192.168.') || h.startsWith('10.') || h.endsWith('.local') || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h);
  
  if (isLocalNetwork && window.location.port && window.location.port !== '3000') {
    const protocol = window.location.protocol;
    return `${protocol}//${h}:3000${path.startsWith('/') ? path : '/' + path}`;
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
    window.location.href = 'login.html';
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
    window.location.href = 'login.html';
    throw new Error('Sesión expirada. Inicie sesión nuevamente.');
  }

  return response;
};
