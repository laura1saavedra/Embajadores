/**
 * services/api.js
 *
 * Cliente HTTP centralizado para consumir la API Embajadores.
 * Patron basado en Event Control (event_control_f/src/utils/apiClient.js).
 */

import config from '../config/config.js';

class ApiClient {
  constructor() {
    this.baseURL = config.API_URL;
  }

  async request(url, options = {}) {
    const defaultHeaders = { 'Content-Type': 'application/json' };

    const fetchConfig = {
      ...options,
      headers: { ...defaultHeaders, ...options.headers },
    };

    try {
      const response = await fetch(url, fetchConfig);
      const data = await response.json();

      if (!response.ok) {
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
}

export const apiClient = new ApiClient();
export default apiClient;
