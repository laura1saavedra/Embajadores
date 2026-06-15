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

function RutaPublica({ children }) {
  const { autenticado, cargando, usuario } = useAuth();

  if (cargando) {
    return <PantallaCargaSesion />;
  }

  if (autenticado && !usuario?.debeCambiarContrasena) {
    return <Navigate to="/registrar-incidente" replace />;
  }

  return children;
}

function RutaProtegida({ children }) {
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

  return children;
}

function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/registrar-incidente" replace />} />
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
              <RutaProtegida>
                <RegistrarIncidente />
              </RutaProtegida>
            }
          />
          <Route
            path="/historial-incidentes"
            element={
              <RutaProtegida>
                <HistorialIncidentes />
              </RutaProtegida>
            }
          />
          <Route
            path="/detalle-incidente/:idIncidente"
            element={
              <RutaProtegida>
                <DetalleIncidente />
              </RutaProtegida>
            }
          />
          <Route
            path="/masivos"
            element={
              <RutaProtegida>
                <Masivos />
              </RutaProtegida>
            }
          />
          <Route
            path="/detalle-masivo/:idMasivo"
            element={
              <RutaProtegida>
                <DetalleMasivo />
              </RutaProtegida>
            }
          />
          <Route
            path="/contactos"
            element={
              <RutaProtegida>
                <Contactos />
              </RutaProtegida>
            }
          />
          <Route
            path="/configuracion-avanzada"
            element={
              <RutaProtegida>
                <ConfiguracionAvanzada />
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
