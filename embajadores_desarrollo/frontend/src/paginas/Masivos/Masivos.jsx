import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import LayoutPrincipal from '../../componentes/layout/LayoutPrincipal/LayoutPrincipal';
import ContenedorPagina from '../../componentes/layout/ContenedorPagina/ContenedorPagina';
import SelectBuscable from '../../componentes/incidentes/SelectBuscable/SelectBuscable';
import EstadoIncidente from '../../componentes/incidentes/EstadoIncidente/EstadoIncidente';

import incidenteServicio from '../../services/incidenteServicio';
import masivoServicio from '../../services/masivoServicio';

import './Masivos.css';

const MASIVOS_VISIBLES_INICIALES = 8;

const FORMATO_FECHA = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const FILTROS_INICIALES = {
  aplicacionId: '',
  tipoFallaId: '',
};

function Masivos() {
  const [masivos, setMasivos] = useState([]);
  const [aplicaciones, setAplicaciones] = useState([]);
  const [tiposFalla, setTiposFalla] = useState([]);
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);

  const [resumen, setResumen] = useState({
    total: 0,
    abiertos: 0,
    cerrados: 0,
  });

  const [cargando, setCargando] = useState(true);
  const [cargandoFiltros, setCargandoFiltros] = useState(false);
  const [mensajeError, setMensajeError] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);

  const listadoRef = useRef(null);

  useEffect(() => {
    cargarInformacionInicial();

    const intervalo = setInterval(() => {
      cargarInformacionInicial();
     }, 60000); // refresca cada 1 minuto 
     
     return () => clearInterval(intervalo);
  }, []);

  const cargarInformacionInicial = async () => {
    try {
      setCargando(true);
      setMensajeError('');

      const [
        masivosRespuesta,
        resumenRespuesta,
        aplicacionesRespuesta,
        tiposFallaRespuesta,
      ] = await Promise.all([
        masivoServicio.listarMasivos(FILTROS_INICIALES),
        masivoServicio.obtenerResumen(),
        incidenteServicio.obtenerAplicaciones(),
        incidenteServicio.obtenerTiposFalla(),
      ]);

      setMasivos(masivosRespuesta);
      setResumen(resumenRespuesta);
      setAplicaciones(aplicacionesRespuesta);
      setTiposFalla(tiposFallaRespuesta);
      setPaginaActual(1);
    } catch (error) {
      setMensajeError(
        error.message || 'No fue posible cargar los incidentes masivos.'
      );
    } finally {
      setCargando(false);
    }
  };

  const manejarCambioFiltro = (evento) => {
    const { name, value } = evento.target;

    setFiltros((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const aplicarFiltros = async () => {
    try {
      setCargandoFiltros(true);
      setMensajeError('');

      const respuesta = await masivoServicio.listarMasivos(filtros);
      setMasivos(respuesta);
      setPaginaActual(1);
    } catch (error) {
      setMensajeError(error.message || 'No fue posible aplicar los filtros.');
    } finally {
      setCargandoFiltros(false);
    }
  };

  const limpiarFiltros = async () => {
    try {
      setCargandoFiltros(true);
      setMensajeError('');

      setFiltros(FILTROS_INICIALES);

      const respuesta = await masivoServicio.listarMasivos(FILTROS_INICIALES);
      setMasivos(respuesta);
      setPaginaActual(1);
    } catch (error) {
      setMensajeError(error.message || 'No fue posible limpiar los filtros.');
    } finally {
      setCargandoFiltros(false);
    }
  };

  const irAlInicioDelListado = () => {
    if (listadoRef.current) {
      listadoRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'Sin registrar';
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

  const opcionesAplicaciones = useMemo(() => {
    return [
      { valor: '', etiqueta: 'Todas' },
      ...aplicaciones.map((app) => ({
        valor: app.id,
        etiqueta: app.nombre,
      })),
    ];
  }, [aplicaciones]);

  const opcionesTiposFalla = useMemo(() => {
    return [
      { valor: '', etiqueta: 'Todos' },
      ...tiposFalla.map((tipo) => ({
        valor: tipo.id,
        etiqueta: tipo.nombre,
      })),
    ];
  }, [tiposFalla]);

  const totalPaginas = Math.ceil(
    masivos.length / MASIVOS_VISIBLES_INICIALES
  );

  const masivosVisibles = useMemo(() => {
    const inicio = (paginaActual - 1) * MASIVOS_VISIBLES_INICIALES;
    const fin = inicio + MASIVOS_VISIBLES_INICIALES;

    return masivos.slice(inicio, fin);
  }, [masivos, paginaActual]);

  const irPaginaAnterior = () => {
    if (paginaActual === 1) return;

    setPaginaActual((prev) => prev - 1);

    setTimeout(() => {
      irAlInicioDelListado();
    }, 50);
  };

  const irPaginaSiguiente = () => {
    if (paginaActual === totalPaginas) return;

    setPaginaActual((prev) => prev + 1);

    setTimeout(() => {
      irAlInicioDelListado();
    }, 50);
  };

  return (
    <LayoutPrincipal>
      <ContenedorPagina>
        <section className="masivos__hero">
          <div className="masivos__hero-texto">
            <span className="masivos__hero-etiqueta">Embajador/a</span>

            <h1 className="masivos__hero-titulo">
              Incidentes <span>masivos</span>
            </h1>

            <p className="masivos__hero-descripcion">
              Consulta los incidentes masivos generados automáticamente por
              aplicación y tipo de falla, revisa su impacto y realiza seguimiento.
            </p>
          </div>
        </section>

        {mensajeError && (
          <div className="masivos__alerta">
            {mensajeError}
          </div>
        )}

        <div className="masivos__cabecera">
          <div className="masivos__resumen">
            <div className="masivos__tarjeta-resumen masivos__tarjeta-resumen--total">
              <span>Total</span>
              <strong>{resumen.total}</strong>
            </div>
          </div>

          <section className="masivos__bloque masivos__bloque--filtros">
            <div className="masivos__filtros">
              <SelectBuscable
                id="aplicacionId"
                label="Aplicación"
                opciones={opcionesAplicaciones}
                valor={filtros.aplicacionId}
                onChange={manejarCambioFiltro}
                disabled={cargandoFiltros}
                placeholder="Todas"
                placeholderBusqueda="Buscar aplicación..."
              />

              <SelectBuscable
                id="tipoFallaId"
                label="Tipo de falla"
                opciones={opcionesTiposFalla}
                valor={filtros.tipoFallaId}
                onChange={manejarCambioFiltro}
                disabled={cargandoFiltros}
                placeholder="Todos"
                placeholderBusqueda="Buscar tipo..."
              />

              <div className="masivos__acciones-filtros">
                <button
                  type="button"
                  className="masivos__boton masivos__boton--secundario"
                  onClick={limpiarFiltros}
                  disabled={cargandoFiltros}
                >
                  Limpiar
                </button>

                <button
                  type="button"
                  className="masivos__boton masivos__boton--principal"
                  onClick={aplicarFiltros}
                  disabled={cargandoFiltros}
                >
                  {cargandoFiltros ? 'Aplicando...' : 'Buscar'}
                </button>
              </div>
            </div>
          </section>
        </div>

        <section className="masivos__bloque" ref={listadoRef}>
          <div className="masivos__cabecera-listado">
            <h2 className="masivos__subtitulo">
              Listado de incidentes masivos
            </h2>

            <div className="masivos__cabecera-derecha">
              <span className="masivos__contador-resultados">
                Resultados: {masivos.length}
              </span>

              {!cargando && totalPaginas > 1 && (
                <div className="historial-incidentes__paginacion-superior">
                  <button
                    type="button"
                    className="historial-incidentes__boton-ver-mas historial-incidentes__boton-ver-mas--secundario"
                    onClick={irPaginaAnterior}
                    disabled={paginaActual === 1}
                  >
                    ← Anterior
                  </button>

                  <span className="historial-incidentes__paginacion-info">
                    Página {paginaActual} de {totalPaginas}
                  </span>

                  <button
                    type="button"
                    className="historial-incidentes__boton-ver-mas"
                    onClick={irPaginaSiguiente}
                    disabled={paginaActual === totalPaginas}
                  >
                    Siguiente →
                  </button>
                </div>
              )}
            </div>
          </div>

          {cargando ? (
            <p className="masivos__texto-simple">
              Cargando incidentes masivos...
            </p>
          ) : masivos.length === 0 ? (
            <div className="masivos__vacio">
              No se encontraron incidentes masivos.
            </div>
          ) : (
            <div className="masivos__tabla-contenedor">
              <table className="masivos__tabla">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Aplicación</th>
                    <th>Tipo de falla</th>
                    <th>Incidentes</th>
                    <th>CAVs</th>
                    <th>Usuarios afectados</th>
                    <th>Estado</th>
                    <th>Fecha generación</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {masivosVisibles.map((masivo) => (
                    <tr key={masivo.idMasivo}>
                      <td>#{masivo.idMasivo}</td>
                      <td>{masivo.aplicacionNombre || 'Sin aplicación'}</td>
                      <td>{masivo.tipoFallaNombre || 'Sin tipo'}</td>
                      <td>{masivo.cantidadIncidentes}</td>
                      <td>{masivo.cantidadCavs}</td>
                      <td>
                        {formatearUsuarios(
                          masivo.usuariosAfectados,
                          masivo.usuariosTotales
                        )}
                      </td>
                      <td>
                        <EstadoIncidente estado={masivo.estado} />
                      </td>
                      <td>{formatearFecha(masivo.fechaHoraGenerado)}</td>
                      <td>
                        <Link
                          to={`/detalle-masivo/${masivo.idMasivo}`}
                          className="masivos__enlace"
                        >
                          Ver detalle
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </ContenedorPagina>
    </LayoutPrincipal>
  );
}

export default Masivos;