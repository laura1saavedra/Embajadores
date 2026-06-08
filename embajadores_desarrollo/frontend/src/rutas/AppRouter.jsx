import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import RegistrarIncidente from '../paginas/RegistrarIncidentes/RegistrarIncidentes';
import HistorialIncidentes from '../paginas/HistorialIncidentes/HistorialIncidentes';
import DetalleIncidente from '../paginas/DetalleIncidente/DetalleIncidente';
import Masivos from '../paginas/Masivos/Masivos';
import DetalleMasivo from '../paginas/DetalleMasivo/DetalleMasivo';
import Contactos from '../paginas/Contactos/Contactos';
import ConfiguracionAvanzada from '../paginas/ConfiguracionAvanzada/ConfiguracionAvanzada';
import NoEncontrada from '../paginas/NoEncontrada/NoEncontrada';

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/registrar-incidente" replace />} />
        <Route path="/registrar-incidente" element={<RegistrarIncidente />} />
        <Route path="/historial-incidentes" element={<HistorialIncidentes />} />
        <Route path="/detalle-incidente/:idIncidente" element={<DetalleIncidente />} />
        <Route path="/masivos" element={<Masivos />} />
        <Route path="/detalle-masivo/:idMasivo" element={<DetalleMasivo />} />
        <Route path="/contactos" element={<Contactos />} />
        <Route path="/configuracion-avanzada" element={<ConfiguracionAvanzada />} />
        <Route path="*" element={<NoEncontrada />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;