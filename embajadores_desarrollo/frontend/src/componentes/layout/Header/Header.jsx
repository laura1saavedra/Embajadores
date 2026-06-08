import { NavLink } from 'react-router-dom';
import './Header.css';

function Header() {
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

        <nav className="header__navegacion" aria-label="Navegación principal">
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

          <NavLink
            to="/configuracion-avanzada"
            className={({ isActive }) =>
              `header__enlace ${isActive ? 'header__enlace--activo' : ''}`
            }
          >
            Configuración avanzada
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

export default Header;