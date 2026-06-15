import { NavLink, useNavigate } from 'react-router-dom';

import { useAuth } from '../../../context/AuthContext';
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
  const esAdministrador = rolNombre.toLowerCase().includes('admin');

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
            <p className="header__subtitulo">Gestion de incidentes</p>
            <h1 className="header__titulo">Incident Center EC</h1>
          </div>
        </div>

        <div className="header__acciones">
          <nav className="header__navegacion" aria-label="Navegacion principal">
            <NavLink
              to="/registrar-incidente"
              className={({ isActive }) =>
                `header__enlace ${isActive ? 'header__enlace--activo' : ''}`
              }
            >
              Registrar incidente
            </NavLink>

            <NavLink
              to="/masivos"
              className={({ isActive }) =>
                `header__enlace ${isActive ? 'header__enlace--activo' : ''}`
              }
            >
              Resumen
            </NavLink>

            <NavLink
              to="/historial-incidentes"
              className={({ isActive }) =>
                `header__enlace ${isActive ? 'header__enlace--activo' : ''}`
              }
            >
              Historial
            </NavLink>

            <NavLink
              to="/contactos"
              className={({ isActive }) =>
                `header__enlace ${isActive ? 'header__enlace--activo' : ''}`
              }
            >
              Contactos WA
            </NavLink>

            {esAdministrador && (
              <NavLink
                to="/configuracion-avanzada"
                className={({ isActive }) =>
                  `header__enlace ${isActive ? 'header__enlace--activo' : ''}`
                }
              >
                Configuracion avanzada
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
