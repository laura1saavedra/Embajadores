/**
 * services/authServicio.js
 *
 * Servicio para autenticacion.
 * Consume los endpoints /api/auth adaptados desde el patron de Event Control.
 */

import apiClient from './api.js';
import config from '../config/config.js';

const normalizarUsuario = (usuario = {}) => ({
  idUsuario: Number(usuario.id_usuario ?? usuario.idUsuario ?? usuario.user_id ?? 0),
  nombre: usuario.nombre ?? usuario.first_name ?? '',
  apellido: usuario.apellido ?? usuario.last_name ?? '',
  correo: usuario.correo ?? usuario.email ?? '',
  rolId: Number(usuario.rol_id ?? usuario.rolId ?? 0),
  rolNombre: usuario.rol_nombre ?? usuario.rolNombre ?? '',
  roles: Array.isArray(usuario.roles) ? usuario.roles : [],
  activo: Boolean(usuario.activo ?? usuario.is_active ?? true),
  verificado: Boolean(usuario.is_verified ?? !usuario.debe_cambiar_contrasena),
  debeCambiarContrasena: Boolean(
    usuario.debe_cambiar_contrasena ?? usuario.debeCambiarContrasena
  ),
  ultimoLogin: usuario.last_login ?? usuario.ultimo_login ?? null,
});

const normalizarSesion = (data = {}) => {
  const usuarioBase = data.usuario ?? data.user ?? {};

  return {
    accessToken: data.access_token ?? '',
    refreshToken: data.refresh_token ?? '',
    tokenType: data.token_type ?? 'bearer',
    expiresIn: data.expires_in ?? null,
    sessionId: data.session_id ?? null,
    usuario: normalizarUsuario(usuarioBase),
    user: data.user ?? usuarioBase,
  };
};

class AuthServicio {
  async login({ correo, contrasena, rememberMe = false }) {
    const { data } = await apiClient.post(config.endpoints.auth.login(), {
      correo,
      contrasena,
      remember_me: Boolean(rememberMe),
    });

    return normalizarSesion(data);
  }

  async refresh(refreshToken) {
    const { data } = await apiClient.post(config.endpoints.auth.refresh(), {
      refresh_token: refreshToken,
    });

    return normalizarSesion(data);
  }

  async obtenerUsuarioActual(accessToken) {
    const { data } = await apiClient.get(config.endpoints.auth.me(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return normalizarUsuario(data);
  }

  async logout(refreshToken) {
    const { data } = await apiClient.post(config.endpoints.auth.logout(), {
      refresh_token: refreshToken,
    });

    return data;
  }

  async cambiarContrasena({
    accessToken,
    contrasenaActual,
    nuevaContrasena,
    confirmarContrasena,
  }) {
    const { data } = await apiClient.post(
      config.endpoints.auth.cambiarContrasena(),
      {
        contrasena_actual: contrasenaActual,
        nueva_contrasena: nuevaContrasena,
        confirmar_contrasena: confirmarContrasena,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return normalizarSesion(data);
  }
}

const authServicio = new AuthServicio();

export default authServicio;
export { normalizarSesion, normalizarUsuario };
