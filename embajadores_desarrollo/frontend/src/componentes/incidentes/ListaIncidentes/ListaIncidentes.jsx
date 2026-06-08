import { Link } from 'react-router-dom';
import EstadoIncidente from '../EstadoIncidente/EstadoIncidente';
import './ListaIncidentes.css';

const FORMATO_FECHA = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'short',
  timeStyle: 'short',
});

function ListaIncidentes({
  incidentes = [],
  textoSinResultados = 'No se encontraron incidentes para mostrar.',
}) {
  const formatearFecha = (fecha) => {
    if (!fecha) return 'Sin fecha';
    return FORMATO_FECHA.format(new Date(fecha));
  };

  const obtenerTexto = (valor, textoVacio = 'Sin información') => {
    if (!valor) return textoVacio;
    return valor;
  };

  if (!incidentes.length) {
    return (
      <div className="lista-incidentes__vacio">
        <p>{textoSinResultados}</p>
      </div>
    );
  }

  return (
    <div className="lista-incidentes__tabla-contenedor">
      <table className="lista-incidentes__tabla">
        <thead>
          <tr>
            <th>ID</th>
            <th>Ciudad</th>
            <th>CAV</th>
            <th>Aplicación</th>
            <th>Tipo de falla</th>
            <th>Estado</th>
            <th>Usuarios afectados</th>
            <th>Fecha de reporte</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {incidentes.map((incidente) => (
            <tr key={incidente.idIncidente}>
              <td>#{incidente.idIncidente}</td>

              <td>
                {obtenerTexto(incidente.ciudadNombre, 'Sin ciudad')}
              </td>

              <td>
                {obtenerTexto(incidente.cavNombre, 'Sin CAV')}
              </td>

              <td>
                {incidente.aplicacionesTexto ? (
                  <div className="lista-incidentes__texto-resumido">
                    <span>
                      {incidente.aplicacionesTexto.split(' +')[0]}
                    </span>

                    {incidente.aplicacionesTexto.includes('+') && (
                      <span className="lista-incidentes__texto-extra">
                        +{incidente.aplicacionesTexto.split('+')[1]}
                      </span>
                    )}
                  </div>
                ) : (
                  'Sin aplicaciones'
                )}
              </td>

              <td>
                {incidente.tiposFallaTexto ? (
                  <div className="lista-incidentes__texto-resumido">
                    <span>
                      {incidente.tiposFallaTexto.split(' +')[0]}
                    </span>

                    {incidente.tiposFallaTexto.includes('+') && (
                      <span className="lista-incidentes__texto-extra">
                        +{incidente.tiposFallaTexto.split('+')[1]}
                      </span>
                    )}
                  </div>
                ) : (
                  'Sin tipo'
                )}
              </td>

              <td>
                <EstadoIncidente estado={incidente.estado} />
              </td>

              <td>
                {incidente.usuariosTotalidad
                  ? `${incidente.usuariosAfectados} / ${incidente.usuariosTotalidad}`
                  : incidente.usuariosAfectados}
              </td>

              <td>
                {formatearFecha(incidente.fechaHoraReporte)}
              </td>

              <td>
                <Link
                  to={`/detalle-incidente/${incidente.idIncidente}`}
                  className="lista-incidentes__enlace"
                >
                  Ver detalle
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ListaIncidentes;