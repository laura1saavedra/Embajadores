import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import apiClient from '../services/api.js';
import authServicio from '../services/authServicio.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => apiClient.getStoredUser());
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const accessToken = apiClient.getAccessToken();
  const refreshToken = apiClient.getRefreshToken();
  const autenticado = Boolean(accessToken && usuario);

  const limpiarSesion = useCallback(() => {
    apiClient.clearAuthSession();
    setUsuario(null);
  }, []);

  const cargarUsuarioActual = useCallback(async () => {
    const token = apiClient.getAccessToken();

    if (!token) {
      limpiarSesion();
      return null;
    }

    try {
      setError('');
      const usuarioActual = await authServicio.obtenerUsuarioActual(token);
      apiClient.setAuthSession({ usuario: usuarioActual });
      setUsuario(usuarioActual);
      return usuarioActual;
    } catch (err) {
      limpiarSesion();
      setError(err.message);
      return null;
    }
  }, [limpiarSesion]);

  const login = useCallback(async ({ correo, contrasena, rememberMe = false }) => {
    try {
      setError('');
      const sesion = await authServicio.login({
        correo,
        contrasena,
        rememberMe,
      });

      setUsuario(sesion.usuario);
      return sesion;
    } catch (err) {
      limpiarSesion();
      setError(err.message);
      throw err;
    }
  }, [limpiarSesion]);

  const refreshSesion = useCallback(async () => {
    const token = apiClient.getRefreshToken();

    if (!token) {
      limpiarSesion();
      return null;
    }

    try {
      setError('');
      const sesion = await authServicio.refresh(token);
      setUsuario(sesion.usuario);
      return sesion;
    } catch (err) {
      limpiarSesion();
      setError(err.message);
      return null;
    }
  }, [limpiarSesion]);

  const logout = useCallback(async () => {
    const token = apiClient.getRefreshToken();

    try {
      if (token) {
        await authServicio.logout(token);
      }
    } finally {
      limpiarSesion();
    }
  }, [limpiarSesion]);

  const cambiarContrasena = useCallback(async ({
    contrasenaActual,
    nuevaContrasena,
    confirmarContrasena,
  }) => {
    try {
      setError('');
      const sesion = await authServicio.cambiarContrasena({
        accessToken: apiClient.getAccessToken(),
        contrasenaActual,
        nuevaContrasena,
        confirmarContrasena,
      });

      setUsuario(sesion.usuario);
      return sesion;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  useEffect(() => {
    let activo = true;

    const inicializarSesion = async () => {
      setCargando(true);

      try {
        const token = apiClient.getAccessToken();
        const usuarioGuardado = apiClient.getStoredUser();

        if (!token) {
          limpiarSesion();
          return;
        }

        if (usuarioGuardado && activo) {
          setUsuario(usuarioGuardado);
        }

        await cargarUsuarioActual();
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    };

    inicializarSesion();

    return () => {
      activo = false;
    };
  }, [cargarUsuarioActual, limpiarSesion]);

  const value = useMemo(() => ({
    usuario,
    cargando,
    error,
    autenticado,
    accessToken,
    refreshToken,
    login,
    logout,
    refreshSesion,
    cargarUsuarioActual,
    cambiarContrasena,
    limpiarSesion,
  }), [
    usuario,
    cargando,
    error,
    autenticado,
    accessToken,
    refreshToken,
    login,
    logout,
    refreshSesion,
    cargarUsuarioActual,
    cambiarContrasena,
    limpiarSesion,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }

  return context;
}

export default AuthContext;
