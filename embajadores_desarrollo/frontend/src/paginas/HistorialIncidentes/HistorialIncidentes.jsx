import { useEffect, useMemo, useRef, useState } from 'react';

import LayoutPrincipal from '../../componentes/layout/LayoutPrincipal/LayoutPrincipal';
import ContenedorPagina from '../../componentes/layout/ContenedorPagina/ContenedorPagina';
import FiltrosIncidentes from '../../componentes/incidentes/FiltrosIncidentes/FiltrosIncidentes';
import ListaIncidentes from '../../componentes/incidentes/ListaIncidentes/ListaIncidentes';
import incidenteServicio from '../../services/incidenteServicio';

import './HistorialIncidentes.css';

const INCIDENTES_VISIBLES_INICIALES = 8;

// ── Fecha actual para filtros iniciales ──────────────────────────────────────

const obtenerFechaActual = () => {
  const fecha = new Date();

  return {
    anio: String(fecha.getFullYear()),
    mes: String(fecha.getMonth() + 1).padStart(2, '0'),
    dia: '',
  };
};

// ── Filtros iniciales ────────────────────────────────────────────────────────

const crearFiltrosIniciales = () => {
  const fechaActual = obtenerFechaActual();

  return {
    busqueda: '',
    estado: '',
    ciudadId: '',
    cavId: '',
    tipoFalla: '',
    anio: fechaActual.anio,
    mes: fechaActual.mes,
    dia: fechaActual.dia,
  };
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const crearTextoResumido = (lista = [], limite = 2) => {
  const elementos = lista.filter(Boolean);

  if (elementos.length <= limite) {
    return elementos.join(', ');
  }

  return `${elementos.slice(0, limite).join(', ')} +${
    elementos.length - limite
  } más`;
};

const filtrarIncidentesIndividuales = (lista = []) => {
  return lista
    .map((incidente) => {
      const aplicacionesIndividuales =
        incidente.aplicacionesAfectadas?.filter(
          (app) => !app.masivoId
        ) || [];

      if (aplicacionesIndividuales.length === 0) {
        return null;
      }

      return {
        ...incidente,
        aplicacionesAfectadas: aplicacionesIndividuales,
        aplicacionesTexto: crearTextoResumido(
          aplicacionesIndividuales.map((a) => a.aplicacionNombre),
          2
        ),
        tiposFallaTexto: crearTextoResumido(
          aplicacionesIndividuales.map((a) => a.tipoFallaNombre),
          2
        ),
      };
    })
    .filter(Boolean);
};

// ── Componente ───────────────────────────────────────────────────────────────

function HistorialIncidentes() {
  const [incidentes, setIncidentes] = useState([]);

  const [ciudades, setCiudades] = useState([]);
  const [cavsDisponibles, setCavsDisponibles] = useState([]);
  const [tiposFalla, setTiposFalla] = useState([]);

  const [filtros, setFiltros] = useState(crearFiltrosIniciales());

  const [cargando, setCargando] = useState(true);
  const [cargandoFiltros, setCargandoFiltros] = useState(false);

  const [mensajeError, setMensajeError] = useState('');
  const [filtrosVisibles, setFiltrosVisibles] = useState(false);

  const [paginaActual, setPaginaActual] = useState(1);

  const [resumen, setResumen] = useState({
    total: 0,
    abiertos: 0,
    cerrados: 0,
  });

  const listadoRef = useRef(null);

  // ── Carga inicial ──────────────────────────────────────────────────────────

  useEffect(() => {
    cargarInformacionInicial();
  }, []);

  // ── Cargar CAVs cuando cambia la ciudad ───────────────────────────────────

  useEffect(() => {
    const cargarCavs = async () => {
      if (!filtros.ciudadId) {
        setCavsDisponibles([]);
        setFiltros((prev) => ({ ...prev, cavId: '' }));
        return;
      }

      try {
        const respuesta = await incidenteServicio.obtenerCavsPorCiudad(
          filtros.ciudadId
        );

        setCavsDisponibles(respuesta);
      } catch {
        setCavsDisponibles([]);
      }
    };

    cargarCavs();
  }, [filtros.ciudadId]);

  // ── Resumen ────────────────────────────────────────────────────────────────

  const actualizarResumen = (lista) => {
    setResumen({
      total: lista.length,
      abiertos: lista.filter((item) => item.estado === 'abierto').length,
      cerrados: lista.filter((item) => item.estado === 'cerrado').length,
    });
  };

  // ── Scroll al inicio del listado ───────────────────────────────────────────

  const irAlInicioDelListado = () => {
    if (listadoRef.current) {
      listadoRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  // ── Cargar información inicial ─────────────────────────────────────────────

  const cargarInformacionInicial = async () => {
    try {
      setCargando(true);
      setMensajeError('');

      const filtrosIniciales = crearFiltrosIniciales();

      const [
        incidentesRespuesta,
        ciudadesRespuesta,
        tiposFallaRespuesta,
      ] = await Promise.all([
        incidenteServicio.listarIncidentes(filtrosIniciales),
        incidenteServicio.obtenerCiudades(),
        incidenteServicio.obtenerTiposFalla(),
      ]);

      const incidentesIndividuales = filtrarIncidentesIndividuales(
        incidentesRespuesta
      );

      setFiltros(filtrosIniciales);
      setIncidentes(incidentesIndividuales);
      setCiudades(ciudadesRespuesta);
      setTiposFalla(tiposFallaRespuesta);

      actualizarResumen(incidentesIndividuales);
      setPaginaActual(1);
    } catch (error) {
      setMensajeError(
        error.message || 'No fue posible cargar el historial.'
      );
    } finally {
      setCargando(false);
    }
  };

  // ── Handlers filtros ───────────────────────────────────────────────────────

  const manejarCambioFiltro = (evento) => {
    const { name, value } = evento.target;

    const mapaNombres = {
      fechaAnio: 'anio',
      fechaMes: 'mes',
      fechaDia: 'dia',
    };

    const nombreReal = mapaNombres[name] || name;

    setFiltros((prev) => ({
      ...prev,
      [nombreReal]: value,
    }));
  };

  const aplicarFiltros = async () => {
    try {
      setCargandoFiltros(true);
      setMensajeError('');

      const respuesta = await incidenteServicio.listarIncidentes(filtros);
      const incidentesIndividuales = filtrarIncidentesIndividuales(respuesta);

      setIncidentes(incidentesIndividuales);
      actualizarResumen(incidentesIndividuales);
      setPaginaActual(1);
      setFiltrosVisibles(false);
    } catch (error) {
      setMensajeError(
        error.message || 'No fue posible aplicar los filtros.'
      );
    } finally {
      setCargandoFiltros(false);
    }
  };

  const limpiarFiltros = async () => {
    try {
      setCargandoFiltros(true);
      setMensajeError('');

      const filtrosReiniciados = crearFiltrosIniciales();

      setFiltros(filtrosReiniciados);
      setCavsDisponibles([]);

      const respuesta = await incidenteServicio.listarIncidentes(
        filtrosReiniciados
      );

      const incidentesIndividuales = filtrarIncidentesIndividuales(respuesta);

      setIncidentes(incidentesIndividuales);
      actualizarResumen(incidentesIndividuales);
      setPaginaActual(1);
      setFiltrosVisibles(false);
    } catch (error) {
      setMensajeError(
        error.message || 'No fue posible limpiar los filtros.'
      );
    } finally {
      setCargandoFiltros(false);
    }
  };

  const alternarFiltros = () => {
    setFiltrosVisibles((prev) => !prev);
  };

  // ── Datos derivados ────────────────────────────────────────────────────────

  const cantidadFiltrosActivos = useMemo(() => {
    return Object.values(filtros).filter((valor) => valor !== '').length;
  }, [filtros]);

  const filtrosParaVista = {
    ...filtros,
    fechaAnio: filtros.anio,
    fechaMes: filtros.mes,
    fechaDia: filtros.dia,
  };

  const totalPaginas = Math.ceil(
    incidentes.length / INCIDENTES_VISIBLES_INICIALES
  );

  const incidentesVisibles = useMemo(() => {
    const inicio = (paginaActual - 1) * INCIDENTES_VISIBLES_INICIALES;
    const fin = inicio + INCIDENTES_VISIBLES_INICIALES;

    return incidentes.slice(inicio, fin);
  }, [incidentes, paginaActual]);

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

  const tarjetasResumen = [
    { etiqueta: 'Total', valor: resumen.total, clase: 'total' },
    { etiqueta: 'Abiertos', valor: resumen.abiertos, clase: 'abiertos' },
    { etiqueta: 'Cerrados', valor: resumen.cerrados, clase: 'cerrados' },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <LayoutPrincipal>
      <ContenedorPagina>
        <section className="historial-incidentes__hero">
          <div className="historial-incidentes__hero-texto">
            <span className="historial-incidentes__hero-etiqueta">
              Embajador/a
            </span>

            <h1 className="historial-incidentes__hero-titulo">
              Historial de <span>incidentes</span>
            </h1>

            <p className="historial-incidentes__hero-descripcion">
              Aquí puedes consultar los incidentes registrados,
              revisar su detalle y aplicar filtros de búsqueda cuando
              lo necesites.
            </p>
          </div>
        </section>

        {mensajeError && (
          <div className="historial-incidentes__alerta">
            {mensajeError}
          </div>
        )}

        <div className="historial-incidentes__resumen-con-filtro">
          <div className="historial-incidentes__resumen">
            {tarjetasResumen.map((tarjeta) => (
              <div
                key={tarjeta.etiqueta}
                className={`historial-incidentes__tarjeta-resumen historial-incidentes__tarjeta-resumen--${tarjeta.clase}`}
              >
                <span>{tarjeta.etiqueta}</span>
                <strong>{tarjeta.valor}</strong>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="historial-incidentes__boton-filtros"
            onClick={alternarFiltros}
          >
            <span className="historial-incidentes__boton-filtros-texto">
              Filtro de búsqueda
            </span>

            <span className="historial-incidentes__boton-filtros-lado">
              {cantidadFiltrosActivos > 0 && (
                <span className="historial-incidentes__boton-filtros-badge">
                  {cantidadFiltrosActivos}
                </span>
              )}

              <span className="historial-incidentes__boton-filtros-icono">
                {filtrosVisibles ? '▲' : '▼'}
              </span>
            </span>
          </button>
        </div>

        <div className="historial-incidentes__bloque historial-incidentes__bloque--filtros">
          {filtrosVisibles && (
            <div className="historial-incidentes__panel-filtros">
              <FiltrosIncidentes
                filtros={filtrosParaVista}
                ciudades={ciudades}
                cavsDisponibles={cavsDisponibles}
                tiposFalla={tiposFalla}
                cantidadFiltrosActivos={cantidadFiltrosActivos}
                cargando={cargandoFiltros}
                onCambioFiltro={manejarCambioFiltro}
                onAplicarFiltros={aplicarFiltros}
                onLimpiarFiltros={limpiarFiltros}
              />
            </div>
          )}
        </div>

        <div
          className="historial-incidentes__bloque"
          ref={listadoRef}
        >
          <div className="historial-incidentes__cabecera-listado">
            <h2 className="historial-incidentes__subtitulo">
              Listado de incidentes
            </h2>

            <div className="historial-incidentes__cabecera-derecha">
              <span className="historial-incidentes__contador-resultados">
                Resultados: {incidentes.length}
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
            <p className="historial-incidentes__texto-carga">
              Cargando incidentes...
            </p>
          ) : (
            <ListaIncidentes incidentes={incidentesVisibles} />
          )}
        </div>
      </ContenedorPagina>
    </LayoutPrincipal>
  );
}

export default HistorialIncidentes;