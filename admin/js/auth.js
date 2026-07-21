// Manejador de Autenticación de Administrador en Frontend
const TOKEN_KEY = 'omikika_admin_token';
const USER_KEY = 'omikika_admin_user';

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

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    clearAuthSession();
    window.location.href = 'login.html';
    throw new Error('Sesión expirada. Por favor inicie sesión de nuevo.');
  }

  return response;
};
