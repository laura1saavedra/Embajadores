import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import LayoutPrincipal from '../../componentes/layout/LayoutPrincipal/LayoutPrincipal';
import ContenedorPagina from '../../componentes/layout/ContenedorPagina/ContenedorPagina';
import SelectBuscable from '../../componentes/incidentes/SelectBuscable/SelectBuscable';
import EstadoIncidente from '../../componentes/incidentes/EstadoIncidente/EstadoIncidente';

import masivoServicio from '../../services/masivoServicio';

import './DetalleMasivo.css';

const CAVS_VISIBLES_INICIALES = 8;

const FORMATO_FECHA = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function DetalleMasivo() {
  const { idMasivo } = useParams();
  const navegar = useNavigate();

  const [masivo, setMasivo] = useState(null);
  const [filtroCiudad, setFiltroCiudad] = useState('');
  const [cargando, setCargando] = useState(true);
  const [cerrando, setCerrando] = useState(false);
  const [confirmandoCierre, setConfirmandoCierre] = useState(false);
  const [mensajeError, setMensajeError] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);

  const tablaRef = useRef(null);

  useEffect(() => {
    cargarDetalle();
  }, [idMasivo]);

  const cargarDetalle = async () => {
    try {
      setCargando(true);
      setMensajeError('');

      const respuesta = await masivoServicio.obtenerMasivoPorId(idMasivo);
      setMasivo(respuesta);
      setPaginaActual(1);
    } catch (error) {
      setMensajeError(error.message || 'No fue posible cargar el masivo.');
    } finally {
      setCargando(false);
    }
  };

  const cerrarMasivo = async () => {
    try {
      setCerrando(true);
      setMensajeError('');

      await masivoServicio.cerrarMasivo(idMasivo);

      setConfirmandoCierre(false);
      await cargarDetalle();
    } catch (error) {
      setMensajeError(error.message || 'No fue posible cerrar el masivo.');
    } finally {
      setCerrando(false);
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return null;
    return FORMATO_FECHA.format(new Date(fecha));
  };

  const formatearUsuarios = (usuariosAfectados, usuariosTotales) => {
    const tieneUsuariosTotales =
      usuariosTotales !== null &&
      usuariosTotales !== undefined &&
      usuariosTotales !== '';

    if (!tieneUsuariosTotales) {
      return usuariosAfectados ?? 0;
    }

    return `${usuariosAfectados ?? 0} / ${usuariosTotales}`;
  };

  const irAlInicioDeTabla = () => {
    if (tablaRef.current) {
      tablaRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  const opcionesCiudades = useMemo(() => {
    if (!masivo?.cavsAfectados) return [{ valor: '', etiqueta: 'Todas' }];

    const ciudades = new Map();

    masivo.cavsAfectados.forEach((cav) => {
      if (cav.ciudadNombre) {
        ciudades.set(cav.ciudadNombre, cav.ciudadNombre);
      }
    });

    return [
      { valor: '', etiqueta: 'Todas' },
      ...Array.from(ciudades.values()).map((ciudad) => ({
        valor: ciudad,
        etiqueta: ciudad,
      })),
    ];
  }, [masivo]);

  const cavsFiltrados = useMemo(() => {
    if (!masivo?.cavsAfectados) return [];

    if (!filtroCiudad) return masivo.cavsAfectados;

    return masivo.cavsAfectados.filter(
      (cav) => cav.ciudadNombre === filtroCiudad
    );
  }, [masivo, filtroCiudad]);

  const totalPaginas = Math.ceil(
    cavsFiltrados.length / CAVS_VISIBLES_INICIALES
  );

  const cavsVisibles = useMemo(() => {
    const inicio = (paginaActual - 1) * CAVS_VISIBLES_INICIALES;
    const fin = inicio + CAVS_VISIBLES_INICIALES;

    return cavsFiltrados.slice(inicio, fin);
  }, [cavsFiltrados, paginaActual]);

  const manejarCambioCiudad = (evento) => {
    setFiltroCiudad(evento.target.value);
    setPaginaActual(1);
  };

  const irPaginaAnterior = () => {
    if (paginaActual === 1) return;

    setPaginaActual((prev) => prev - 1);

    setTimeout(() => {
      irAlInicioDeTabla();
    }, 50);
  };

  const irPaginaSiguiente = () => {
    if (paginaActual === totalPaginas) return;

    setPaginaActual((prev) => prev + 1);

    setTimeout(() => {
      irAlInicioDeTabla();
    }, 50);
  };

  if (cargando) {
    return (
      <LayoutPrincipal>
        <ContenedorPagina>
          <p className="detalle-masivo__texto-simple">
            Cargando detalle del incidente masivo...
          </p>
        </ContenedorPagina>
      </LayoutPrincipal>
    );
  }

  if (!masivo) {
    return (
      <LayoutPrincipal>
        <ContenedorPagina>
          <div className="detalle-masivo__alerta">
            {mensajeError || 'No se encontró el incidente masivo.'}
          </div>
        </ContenedorPagina>
      </LayoutPrincipal>
    );
  }

  const masivoCerrado = masivo.estado === 'cerrado';

  return (
    <LayoutPrincipal>
      <ContenedorPagina>
        <section className="detalle-masivo__hero">
          <button
            type="button"
            className="detalle-masivo__volver"
            onClick={() => navegar('/masivos')}
          >
            ←
          </button>

          <div>
            <h1 className="detalle-masivo__titulo">
              Incidente #{masivo.idMasivo}
            </h1>
            <p className="detalle-masivo__descripcion">
              Aquí puedes revisar la información completa del incidente y su historial.
            </p>
          </div>

          {!masivoCerrado && !confirmandoCierre && (
            <button
              type="button"
              className="detalle-masivo__boton-cerrar"
              onClick={() => setConfirmandoCierre(true)}
              disabled={cerrando}
            >
              Cerrar incidente masivo
            </button>
          )}
        </section>

        {mensajeError && (
          <div className="detalle-masivo__alerta">
            {mensajeError}
          </div>
        )}

        <section className="detalle-masivo__resumen-superior">
          <div className="detalle-masivo__tarjeta-resumen">
            <span>Estado actual</span>
            <EstadoIncidente estado={masivo.estado} />
          </div>

          <div className="detalle-masivo__tarjeta-resumen">
            <span>Aplicación</span>
            <strong>{masivo.aplicacionNombre || 'Sin aplicación'}</strong>
          </div>

          <div className="detalle-masivo__tarjeta-resumen">
            <span>Usuarios afectados</span>
            <strong>
              {formatearUsuarios(
                masivo.usuariosAfectados,
                masivo.usuariosTotales
              )}
            </strong>
          </div>

          <div className="detalle-masivo__tarjeta-resumen">
            <span>Tipo de falla</span>
            <strong>{masivo.tipoFallaNombre || 'Sin tipo de falla'}</strong>
          </div>
        </section>

        <section className="detalle-masivo__fechas">
          <div className="detalle-masivo__fecha-item">
            <span>Fecha generación</span>
            <strong>
              {formatearFecha(masivo.fechaHoraGenerado) || 'Sin registro'}
            </strong>
          </div>

          {masivo.fechaHoraCierre && (
            <>
              <div className="detalle-masivo__fecha-divisor" />

              <div className="detalle-masivo__fecha-item">
                <span>Fecha cierre</span>
                <strong>
                  {formatearFecha(masivo.fechaHoraCierre)}
                </strong>
              </div>
            </>
          )}
        </section>

        {confirmandoCierre && !masivoCerrado && (
          <section className="detalle-masivo__confirmacion-cierre">
            <div className="detalle-masivo__confirmacion-icono">!</div>

            <div className="detalle-masivo__confirmacion-contenido">
              <h3>Cerrar incidente masivo</h3>

              <p>
                El incidente masivo <strong>#{masivo.idMasivo}</strong> cambiará
                a estado <strong>Cerrado</strong> y dejará de recibir asociaciones
                automáticas de nuevos incidentes.
              </p>

              <p>
                Confirma esta acción solo si el seguimiento del masivo ya finalizó.
              </p>
            </div>

            <div className="detalle-masivo__confirmacion-acciones">
              <button
                type="button"
                className="detalle-masivo__btn-cancelar"
                onClick={() => setConfirmandoCierre(false)}
                disabled={cerrando}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="detalle-masivo__btn-confirmar"
                onClick={cerrarMasivo}
                disabled={cerrando}
              >
                {cerrando ? 'Cerrando...' : 'Sí, cerrar incidente'}
              </button>
            </div>
          </section>
        )}

        <section className="detalle-masivo__bloque" ref={tablaRef}>
          <div className="detalle-masivo__cabecera-listado">
            <h2 className="detalle-masivo__subtitulo">
              CAVs afectados
            </h2>

            <div className="detalle-masivo__cabecera-derecha">
              <div className="detalle-masivo__filtro-ciudad">
                <SelectBuscable
                  id="filtroCiudad"
                  label="Ciudad"
                  opciones={opcionesCiudades}
                  valor={filtroCiudad}
                  onChange={manejarCambioCiudad}
                  placeholder="Todas"
                  placeholderBusqueda="Buscar ciudad..."
                />
              </div>

              <div className="detalle-masivo__total">
                <span>Total</span>
                <strong>{cavsFiltrados.length}</strong>
              </div>

              {!cargando && totalPaginas > 1 && (
                <div className="detalle-masivo__paginacion-superior">
                  <button
                    type="button"
                    className="detalle-masivo__boton-ver-mas detalle-masivo__boton-ver-mas--secundario"
                    onClick={irPaginaAnterior}
                    disabled={paginaActual === 1}
                  >
                    ← Anterior
                  </button>

                  <span className="detalle-masivo__paginacion-info">
                    Página {paginaActual} de {totalPaginas}
                  </span>

                  <button
                    type="button"
                    className="detalle-masivo__boton-ver-mas"
                    onClick={irPaginaSiguiente}
                    disabled={paginaActual === totalPaginas}
                  >
                    Siguiente →
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="detalle-masivo__tabla-contenedor">
            <table className="detalle-masivo__tabla">
              <thead>
                <tr>
                  <th>Ciudad</th>
                  <th>CAV</th>
                  <th>Usuarios afectados</th>
                </tr>
              </thead>

              <tbody>
                {cavsVisibles.map((cav) => (
                  <tr key={cav.cavId}>
                    <td>{cav.ciudadNombre || 'Sin ciudad'}</td>
                    <td>{cav.cavNombre || 'Sin CAV'}</td>
                    <td>
                      {formatearUsuarios(
                        cav.usuariosAfectados,
                        cav.usuariosTotalidad
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </ContenedorPagina>
    </LayoutPrincipal>
  );
}

export default DetalleMasivo;