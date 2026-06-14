/**
 * services/api.js
 *
 * Cliente HTTP centralizado para consumir la API Embajadores.
 * Patron basado en Event Control (event_control_f/src/utils/apiClient.js).
 */

import config from '../config/config.js';

export const AUTH_STORAGE_KEYS = {
  accessToken: 'embajadores_access_token',
  refreshToken: 'embajadores_refresh_token',
  usuario: 'embajadores_usuario',
};

const getStoredAccessToken = () => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(AUTH_STORAGE_KEYS.accessToken) || '';
};

const clearStoredAuth = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(AUTH_STORAGE_KEYS.accessToken);
  window.localStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken);
  window.localStorage.removeItem(AUTH_STORAGE_KEYS.usuario);
};

class ApiClient {
  constructor() {
    this.baseURL = config.API_URL;
  }

  async request(url, options = {}) {
    const token = getStoredAccessToken();
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const fetchConfig = {
      ...options,
      headers: { ...defaultHeaders, ...options.headers },
    };

    try {
      const response = await fetch(url, fetchConfig);
      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json')
        ? await response.json()
        : null;

      if (!response.ok) {
        if (response.status === 401) {
          clearStoredAuth();
        }

        const detailRaw = data?.error ?? data?.detail;
        let mensaje;
        if (!detailRaw) {
          mensaje = `Error ${response.status}`;
        } else if (typeof detailRaw === 'string') {
          mensaje = detailRaw;
        } else if (typeof detailRaw === 'object') {
          mensaje = detailRaw.message || detailRaw.error || JSON.stringify(detailRaw);
        } else {
          mensaje = `Error ${response.status}`;
        }
        throw new Error(mensaje);
      }

      return { data, status: response.status };
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('No se pudo conectar con el servidor. Verifique que la API este activa.');
      }
      throw error;
    }
  }

  async get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  }

  async post(url, body, options = {}) {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async put(url, body, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async patch(url, body, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async delete(url, options = {}) {
    return this.request(url, { ...options, method: 'DELETE' });
  }

  setAuthSession({ accessToken, refreshToken, usuario }) {
    if (typeof window === 'undefined') return;

    if (accessToken) {
      window.localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, accessToken);
    }

    if (refreshToken) {
      window.localStorage.setItem(AUTH_STORAGE_KEYS.refreshToken, refreshToken);
    }

    if (usuario) {
      window.localStorage.setItem(
        AUTH_STORAGE_KEYS.usuario,
        JSON.stringify(usuario)
      );
    }
  }

  clearAuthSession() {
    clearStoredAuth();
  }

  getAccessToken() {
    return getStoredAccessToken();
  }

  getRefreshToken() {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken) || '';
  }

  getStoredUser() {
    if (typeof window === 'undefined') return null;

    const usuario = window.localStorage.getItem(AUTH_STORAGE_KEYS.usuario);
    if (!usuario) return null;

    try {
      return JSON.parse(usuario);
    } catch {
      return null;
    }
  }
}

export const apiClient = new ApiClient();
export default apiClient;
