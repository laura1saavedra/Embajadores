import { Link } from 'react-router-dom';
import LayoutPrincipal from '../../componentes/layout/LayoutPrincipal/LayoutPrincipal';
import ContenedorPagina from '../../componentes/layout/ContenedorPagina/ContenedorPagina';
import './NoEncontrada.css';

function NoEncontrada() {
  return (
    <LayoutPrincipal>
      <ContenedorPagina
        titulo="Página no encontrada"
        descripcion="La ruta que intentas abrir no existe o todavía no ha sido creada dentro de esta versión del sistema."
      >
        <section className="no-encontrada">
          <div className="no-encontrada__tarjeta">
            <div className="no-encontrada__codigo">404</div>

            <h2 className="no-encontrada__subtitulo">
              No fue posible encontrar esta página
            </h2>

            <p className="no-encontrada__texto">
              Puede que la dirección esté mal escrita o que esta vista todavía no
              haya sido implementada en el MVP.
            </p>

            <div className="no-encontrada__acciones">
              <Link
                to="/registrar-incidente"
                className="no-encontrada__boton no-encontrada__boton--principal"
              >
                Ir a registrar incidente
              </Link>

              <Link
                to="/historial-incidentes"
                className="no-encontrada__boton no-encontrada__boton--secundario"
              >
                Ir al historial
              </Link>
            </div>
          </div>
        </section>
      </ContenedorPagina>
    </LayoutPrincipal>
  );
}

export default NoEncontrada;