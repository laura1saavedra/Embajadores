import { NavLink, useNavigate } from 'react-router-dom';

import { useAuth } from '../../../context/AuthContext';
import { PERMISOS, usuarioTienePermiso } from '../../../utils/permisos';
import './Header.css';

function Header() {
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();

  const nombreCompleto = usuario
    ? `${usuario.nombre ?? ''} ${usuario.apellido ?? ''}`.trim()
    : '';
  const rolNombre = usuario?.rolNombre ?? '';
  const iniciales = nombreCompleto
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join('') || 'US';

  const puedeRegistrarIncidente = usuarioTienePermiso(
    usuario,
    PERMISOS.REGISTRAR_INCIDENTE
  );
  const puedeVerMasivos = usuarioTienePermiso(
    usuario,
    PERMISOS.VER_INCIDENTES_MASIVOS
  );
  const puedeVerHistorial = usuarioTienePermiso(
    usuario,
    PERMISOS.VER_HISTORIAL_INCIDENTES
  );
  const puedeGestionarContactos = usuarioTienePermiso(
    usuario,
    PERMISOS.GESTIONAR_CONTACTOS_WA
  );
  const puedeGestionarConfiguracion = usuarioTienePermiso(
    usuario,
    PERMISOS.GESTIONAR_CONFIGURACION_AVANZADA
  );

  const cerrarSesion = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="header">
      <div className="header__contenedor">
        <div className="header__marca">
          <div className="header__logo">GI</div>

          <div>
            <p className="header__subtitulo">Gestión de incidentes</p>
            <h1 className="header__titulo">Incident Center EC</h1>
          </div>
        </div>

        <div className="header__acciones">
          <nav className="header__navegacion" aria-label="Navegación principal">
            {puedeRegistrarIncidente && (
              <NavLink
                to="/registrar-incidente"
                target="_self"
                className={({ isActive }) =>
                  `header__enlace ${isActive ? 'header__enlace--activo' : ''}`
                }
              >
                Registrar incidente
              </NavLink>
            )}

            {puedeVerMasivos && (
              <NavLink
                to="/masivos"
                target="_self"
                className={({ isActive }) =>
                  `header__enlace ${isActive ? 'header__enlace--activo' : ''}`
                }
              >
                Resumen
              </NavLink>
            )}

            {puedeVerHistorial && (
              <NavLink
                to="/historial-incidentes"
                target="_self"
                className={({ isActive }) =>
                  `header__enlace ${isActive ? 'header__enlace--activo' : ''}`
                }
              >
                Historial
              </NavLink>
            )}

            {puedeGestionarContactos && (
              <NavLink
                to="/contactos"
                target="_self"
                className={({ isActive }) =>
                  `header__enlace ${isActive ? 'header__enlace--activo' : ''}`
                }
              >
                Contactos WA
              </NavLink>
            )}

            {puedeGestionarConfiguracion && (
              <NavLink
                to="/configuracion-avanzada"
                target="_self"
                className={({ isActive }) =>
                  `header__enlace ${isActive ? 'header__enlace--activo' : ''}`
                }
              >
                Configuración avanzada
              </NavLink>
            )}
          </nav>

          {usuario && (
            <div className="header__usuario">
              <div className="header__avatar" aria-hidden="true">
                {iniciales}
              </div>

              <div className="header__usuario-info">
                <strong>{nombreCompleto || usuario.correo}</strong>
                <span>{rolNombre || 'Usuario'}</span>
              </div>

              <button
                className="header__logout"
                type="button"
                onClick={cerrarSesion}
              >
                Salir
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
