import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import LayoutPrincipal from '../../componentes/layout/LayoutPrincipal/LayoutPrincipal';
import ContenedorPagina from '../../componentes/layout/ContenedorPagina/ContenedorPagina';
import EstadoIncidente from '../../componentes/incidentes/EstadoIncidente/EstadoIncidente';
import SelectBuscable from '../../componentes/incidentes/SelectBuscable/SelectBuscable';
import incidenteServicio from '../../services/incidenteServicio';

import './DetalleIncidentes.css';

function DetalleIncidente() {
  const { idIncidente } = useParams();
  const navegar = useNavigate();

  const [incidente, setIncidente] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [mensajeError, setMensajeError] = useState('');

  const [editandoEstado, setEditandoEstado] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [guardandoEstado, setGuardandoEstado] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const rolUsuario = localStorage.getItem('rolUsuario') || 'Embajador';
  const esAdministrador = rolUsuario === 'Administrador';
  const esEmbajador = rolUsuario === 'Embajador';

  const puedeCambiarEstado = esAdministrador || esEmbajador;
  const puedeEliminar = esAdministrador;

  useEffect(() => {
    cargarDetalle();
  }, [idIncidente]);

  const cargarDetalle = async () => {
    try {
      setCargando(true);
      setMensajeError('');

      const [respuesta, historialRespuesta] = await Promise.all([
        incidenteServicio.obtenerIncidentePorId(idIncidente),
        incidenteServicio.obtenerHistorialPorIncidente(idIncidente),
      ]);

      const cierre = historialRespuesta
        .filter((item) => item.estadoNuevo === 'cerrado')
        .sort((a, b) => new Date(b.fechaCambio) - new Date(a.fechaCambio))[0];

      setIncidente({
        ...respuesta,
        fechaHoraCierre: cierre?.fechaCambio || null,
      });

    } catch (error) {
      setMensajeError(error.message || 'No fue posible cargar el incidente.');
    } finally {
      setCargando(false);
    }
  };

  const opcionesEstado = useMemo(() => {
    if (!incidente) return [];

    if (incidente.estado === 'abierto') {
      return [{ valor: 'cerrado', etiqueta: 'Cerrar incidente' }];
    }

    return [];
  }, [incidente]);

  const aplicacionesAfectadas = useMemo(() => {
    if (!Array.isArray(incidente?.aplicacionesAfectadas)) return [];

    return incidente.aplicacionesAfectadas.filter(
      (item) => item.aplicacionNombre || item.tipoFallaNombre
    );
  }, [incidente]);

  const guardarEstado = async () => {
    if (!nuevoEstado) return;

    try {
      setGuardandoEstado(true);
      setMensajeError('');

      await incidenteServicio.actualizarEstadoIncidente(
        idIncidente,
        nuevoEstado
      );

      setEditandoEstado(false);
      setNuevoEstado('');
      await cargarDetalle();
    } catch (error) {
      setMensajeError(error.message || 'No fue posible actualizar el estado.');
    } finally {
      setGuardandoEstado(false);
    }
  };

  const eliminarIncidente = async () => {
    const confirmar = window.confirm('¿Deseas eliminar este incidente?');

    if (!confirmar) return;

    try {
      setEliminando(true);
      setMensajeError('');

      await incidenteServicio.eliminarIncidente(idIncidente);

      navegar('/historial-incidentes');
    } catch (error) {
      setMensajeError(error.message || 'No fue posible eliminar el incidente.');
    } finally {
      setEliminando(false);
    }
  };

  if (cargando) {
    return (
      <LayoutPrincipal>
        <ContenedorPagina>
          <p className="detalle-incidente__texto-simple">
            Cargando incidente...
          </p>
        </ContenedorPagina>
      </LayoutPrincipal>
    );
  }

  if (!incidente) {
    return (
      <LayoutPrincipal>
        <ContenedorPagina>
          <div className="detalle-incidente__alerta">
            {mensajeError || 'No se encontró el incidente.'}
          </div>
        </ContenedorPagina>
      </LayoutPrincipal>
    );
  }

  const formatearFecha = (fecha) => {
    if (!fecha) return 'Sin registrar';

    return new Intl.DateTimeFormat('es-CO', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(fecha));
  };

  return (
    <LayoutPrincipal>
      <ContenedorPagina
        titulo={
          <div className="detalle-incidente__encabezado-titulo">
            <button
              type="button"
              className="detalle-incidente__boton-volver"
              onClick={() => navegar('/historial-incidentes')}
              aria-label="Volver al historial"
            >
              ←
            </button>

            <span className="detalle-incidente__titulo">
              Incidente #{incidente.idIncidente}
            </span>
          </div>
        }
        descripcion="Aquí puedes revisar la información completa del incidente y su historial."
      >
        {mensajeError && (
          <div className="detalle-incidente__alerta">
            {mensajeError}
          </div>
        )}

        <div className="detalle-incidente__resumen-superior">
          <div className="detalle-incidente__tarjeta-resumen">
            <span className="detalle-incidente__etiqueta">Estado</span>
            <EstadoIncidente estado={incidente.estado} />
          </div>

          <div className="detalle-incidente__tarjeta-resumen">
            <span className="detalle-incidente__etiqueta">Ciudad</span>
            <strong>{incidente.ciudadNombre || 'Sin registrar'}</strong>
          </div>

          <div className="detalle-incidente__tarjeta-resumen">
            <span className="detalle-incidente__etiqueta">CAV afectado</span>
            <strong>{incidente.cavNombre || 'Sin registrar'}</strong>
          </div>

          <div className="detalle-incidente__tarjeta-resumen">
            <span className="detalle-incidente__etiqueta">
              Usuarios afectados
            </span>

            <div>
              <strong>
                {incidente.usuariosTotalidad !== null &&
                incidente.usuariosTotalidad !== undefined
                  ? `${incidente.usuariosAfectados ?? 0} / ${incidente.usuariosTotalidad}`
                  : incidente.usuariosAfectados ?? 0}
              </strong>
            </div>
          </div>
        </div>

        <div className="detalle-incidente__fechas">
            <div className="detalle-incidente__fecha-item">
              <span>Fecha generación</span>
              <strong>{formatearFecha(incidente.fechaHoraReporte)}</strong>
            </div>

            {incidente.estado === 'cerrado' && (
              <>
                <div className="detalle-incidente__fecha-divisor" />

                <div className="detalle-incidente__fecha-item">
                  <span>Fecha cierre</span>
                  <strong>{formatearFecha(incidente.fechaHoraCierre)}</strong>
                </div>
              </>
            )}
          </div>

        {(puedeCambiarEstado || puedeEliminar) && (
          <div className="detalle-incidente__barra-acciones">
            {puedeCambiarEstado && incidente.estado !== 'cerrado' && (
              <button
                type="button"
                className="detalle-incidente__boton detalle-incidente__boton--principal"
                onClick={() => setEditandoEstado((prev) => !prev)}
              >
                Cambiar estado
              </button>
            )}

            {puedeEliminar && (
              <button
                type="button"
                className="detalle-incidente__boton detalle-incidente__boton--peligro"
                onClick={eliminarIncidente}
                disabled={eliminando}
              >
                {eliminando ? 'Eliminando...' : 'Eliminar incidente'}
              </button>
            )}
          </div>
        )}

        {editandoEstado && (
          <section className="detalle-incidente__bloque detalle-incidente__bloque--estado">
            <h2 className="detalle-incidente__subtitulo">Cambiar estado</h2>

            <div className="detalle-incidente__grid-edicion">
              <div className="detalle-incidente__campo-edicion">
                <SelectBuscable
                  id="nuevoEstado"
                  label="Nuevo estado"
                  opciones={opcionesEstado}
                  valor={nuevoEstado}
                  onChange={(evento) => setNuevoEstado(evento.target.value)}
                  placeholder="Seleccionar estado"
                  placeholderBusqueda="Buscar estado..."
                />
              </div>
            </div>

            <div className="detalle-incidente__acciones-edicion">
              <button
                type="button"
                className="detalle-incidente__boton detalle-incidente__boton--secundario"
                onClick={() => {
                  setEditandoEstado(false);
                  setNuevoEstado('');
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="detalle-incidente__boton detalle-incidente__boton--principal"
                onClick={guardarEstado}
                disabled={guardandoEstado || !nuevoEstado}
              >
                {guardandoEstado ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </section>
        )}

        <section className="detalle-incidente__bloque detalle-incidente__bloque--ancho-completo">
          <h2 className="detalle-incidente__subtitulo">
            Aplicaciones y tipos de falla afectados
          </h2>

          {aplicacionesAfectadas.length > 0 ? (
            <div className="detalle-incidente__tabla-apps-contenedor">
              <table className="detalle-incidente__tabla-apps">
                <thead>
                  <tr>
                    <th>Aplicación</th>
                    <th>Tipo de falla</th>
                  </tr>
                </thead>

                <tbody>
                  {aplicacionesAfectadas.map((item, index) => (
                    <tr
                      key={
                        item.idAplicacionesAfectados ||
                        `${item.aplicacionId}-${item.tipoFallaId}-${index}`
                      }
                    >
                      <td>{item.aplicacionNombre || 'Sin aplicación'}</td>
                      <td>{item.tipoFallaNombre || 'Sin tipo de falla'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="detalle-incidente__texto-simple">
              Sin aplicaciones registradas.
            </p>
          )}
        </section>
      </ContenedorPagina>
    </LayoutPrincipal>
  );
}

export default DetalleIncidente;