import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider, useAuth } from '../context/AuthContext';
import Login from '../paginas/Login/Login';
import RegistrarIncidente from '../paginas/RegistrarIncidentes/RegistrarIncidentes';
import HistorialIncidentes from '../paginas/HistorialIncidentes/HistorialIncidentes';
import DetalleIncidente from '../paginas/DetalleIncidente/DetalleIncidente';
import Masivos from '../paginas/Masivos/Masivos';
import DetalleMasivo from '../paginas/DetalleMasivo/DetalleMasivo';
import Contactos from '../paginas/Contactos/Contactos';
import ConfiguracionAvanzada from '../paginas/ConfiguracionAvanzada/ConfiguracionAvanzada';
import NoEncontrada from '../paginas/NoEncontrada/NoEncontrada';
import {
  PERMISOS,
  obtenerRutaInicialPorPermisos,
  usuarioTienePermiso,
} from '../utils/permisos';

function PantallaCargaSesion() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        color: '#4b5563',
        background: '#f5f7fb',
      }}
    >
      Cargando sesión...
    </div>
  );
}

function PantallaSinPermisos() {
  const { logout } = useAuth();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        color: '#4b5563',
        background: '#f5f7fb',
        textAlign: 'center',
      }}
    >
      <div>
        <h1 style={{ margin: '0 0 8px', color: '#111827' }}>
          Sin permisos asignados
        </h1>
        <p style={{ margin: '0 0 20px' }}>
          Tu rol no tiene secciones habilitadas. Contacta al administrador.
        </p>
        <button
          type="button"
          onClick={logout}
          style={{
            height: 42,
            border: 0,
            borderRadius: 10,
            padding: '0 18px',
            background: '#e30613',
            color: '#ffffff',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          Cerrar sesion
        </button>
      </div>
    </div>
  );
}

function RedireccionInicial() {
  const { autenticado, cargando, usuario } = useAuth();

  if (cargando) {
    return <PantallaCargaSesion />;
  }

  if (!autenticado) {
    return <Navigate to="/login" replace />;
  }

  if (usuario?.debeCambiarContrasena) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={obtenerRutaInicialPorPermisos(usuario)} replace />;
}

function RutaPublica({ children }) {
  const { autenticado, cargando, usuario } = useAuth();

  if (cargando) {
    return <PantallaCargaSesion />;
  }

  if (autenticado && !usuario?.debeCambiarContrasena) {
    return <Navigate to={obtenerRutaInicialPorPermisos(usuario)} replace />;
  }

  return children;
}

function RutaProtegida({ children, permiso }) {
  const { autenticado, cargando, usuario } = useAuth();

  if (cargando) {
    return <PantallaCargaSesion />;
  }

  if (!autenticado) {
    return <Navigate to="/login" replace />;
  }

  if (usuario?.debeCambiarContrasena) {
    return <Navigate to="/login" replace />;
  }

  if (permiso && !usuarioTienePermiso(usuario, permiso)) {
    return <Navigate to={obtenerRutaInicialPorPermisos(usuario)} replace />;
  }

  return children;
}

function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RedireccionInicial />} />
          <Route
            path="/login"
            element={
              <RutaPublica>
                <Login />
              </RutaPublica>
            }
          />
          <Route
            path="/registrar-incidente"
            element={
              <RutaProtegida permiso={PERMISOS.REGISTRAR_INCIDENTE}>
                <RegistrarIncidente />
              </RutaProtegida>
            }
          />
          <Route
            path="/historial-incidentes"
            element={
              <RutaProtegida permiso={PERMISOS.VER_HISTORIAL_INCIDENTES}>
                <HistorialIncidentes />
              </RutaProtegida>
            }
          />
          <Route
            path="/detalle-incidente/:idIncidente"
            element={
              <RutaProtegida permiso={PERMISOS.VER_HISTORIAL_INCIDENTES}>
                <DetalleIncidente />
              </RutaProtegida>
            }
          />
          <Route
            path="/masivos"
            element={
              <RutaProtegida permiso={PERMISOS.VER_INCIDENTES_MASIVOS}>
                <Masivos />
              </RutaProtegida>
            }
          />
          <Route
            path="/detalle-masivo/:idMasivo"
            element={
              <RutaProtegida permiso={PERMISOS.VER_INCIDENTES_MASIVOS}>
                <DetalleMasivo />
              </RutaProtegida>
            }
          />
          <Route
            path="/contactos"
            element={
              <RutaProtegida permiso={PERMISOS.GESTIONAR_CONTACTOS_WA}>
                <Contactos />
              </RutaProtegida>
            }
          />
          <Route
            path="/configuracion-avanzada"
            element={
              <RutaProtegida permiso={PERMISOS.GESTIONAR_CONFIGURACION_AVANZADA}>
                <ConfiguracionAvanzada />
              </RutaProtegida>
            }
          />
          <Route
            path="/sin-permisos"
            element={
              <RutaProtegida>
                <PantallaSinPermisos />
              </RutaProtegida>
            }
          />
          <Route path="*" element={<NoEncontrada />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default AppRouter;
