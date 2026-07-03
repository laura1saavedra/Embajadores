import { useEffect, useMemo, useRef, useState } from 'react';

import LayoutPrincipal from '../../componentes/layout/LayoutPrincipal/LayoutPrincipal';
import ContenedorPagina from '../../componentes/layout/ContenedorPagina/ContenedorPagina';
import EtiquetaRol from '../../componentes/layout/EtiquetaRol/EtiquetaRol';
import FiltrosIncidentes from '../../componentes/incidentes/FiltrosIncidentes/FiltrosIncidentes';
import ListaIncidentes from '../../componentes/incidentes/ListaIncidentes/ListaIncidentes';
import Paginacion from '../../componentes/ui/Paginacion/Paginacion';
import incidenteServicio from '../../services/incidenteServicio';

import './HistorialIncidentes.css';

const INCIDENTES_VISIBLES_INICIALES = 7;
const ESTADO_HISTORIAL_STORAGE_KEY = 'embajadores.historialIncidentes.estado';

// Fecha actual para filtros iniciales.

const obtenerFechaActual = () => {
  const fecha = new Date();

  return {
    anio: String(fecha.getFullYear()),
    mes: String(fecha.getMonth() + 1).padStart(2, '0'),
    dia: '',
  };
};

const esPrimerDiaDelMes = () => new Date().getDate() === 1;

// Filtros iniciales.

const crearFiltrosIniciales = () => {
  const fechaActual = obtenerFechaActual();

  return {
    busqueda: '',
    estado: '',
    ciudadId: '',
    cavId: '',
    aplicacionId: '',
    servicioId: '',
    tipoFalla: '',
    anio: fechaActual.anio,
    mes: fechaActual.mes,
    dia: fechaActual.dia,
  };
};

const normalizarFiltrosGuardados = (filtrosGuardados = {}) => {
  const filtros = {
    ...crearFiltrosIniciales(),
    ...filtrosGuardados,
  };

  if (!filtros.aplicacionId) {
    filtros.servicioId = '';
  }

  return filtros;
};

const obtenerEstadoHistorialGuardado = () => {
  try {
    const raw = sessionStorage.getItem(ESTADO_HISTORIAL_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const estado = JSON.parse(raw);

    return {
      filtros: normalizarFiltrosGuardados(estado.filtros),
      paginaActual: Number(estado.paginaActual) || 1,
    };
  } catch {
    return null;
  }
};

const guardarEstadoHistorial = (filtros, paginaActual = 1) => {
  try {
    sessionStorage.setItem(
      ESTADO_HISTORIAL_STORAGE_KEY,
      JSON.stringify({
        filtros: normalizarFiltrosGuardados(filtros),
        paginaActual,
      })
    );
  } catch {
    // sessionStorage puede no estar disponible en algunos contextos.
  }
};

const MESES = {
  '01': 'Enero',
  '02': 'Febrero',
  '03': 'Marzo',
  '04': 'Abril',
  '05': 'Mayo',
  '06': 'Junio',
  '07': 'Julio',
  '08': 'Agosto',
  '09': 'Septiembre',
  '10': 'Octubre',
  '11': 'Noviembre',
  '12': 'Diciembre',
};

const obtenerPeriodoMes = (filtrosActivos = {}) => {
  if (!filtrosActivos.anio || !filtrosActivos.mes) {
    return null;
  }

  return {
    anio: Number(filtrosActivos.anio),
    mes: Number(filtrosActivos.mes),
    mesTexto: String(filtrosActivos.mes).padStart(2, '0'),
  };
};

const obtenerPeriodoAnterior = (periodo) => {
  if (!periodo) return null;

  const esEnero = periodo.mes === 1;

  return {
    anio: esEnero ? periodo.anio - 1 : periodo.anio,
    mes: esEnero ? 12 : periodo.mes - 1,
    mesTexto: String(esEnero ? 12 : periodo.mes - 1).padStart(2, '0'),
  };
};

const obtenerClavePeriodo = (periodo) =>
  periodo ? `${periodo.anio}-${periodo.mesTexto}` : '';

const formatearPeriodo = (periodo) => {
  if (!periodo) return '';

  return `${MESES[periodo.mesTexto]} de ${periodo.anio}`;
};

const crearMensajeCambioMes = (periodo, abiertosMesAnterior) => {
  const periodoAnterior = obtenerPeriodoAnterior(periodo);
  const etiquetaIncidentes =
    abiertosMesAnterior === 1
      ? '1 incidente abierto'
      : `${abiertosMesAnterior} incidentes abiertos`;

  if (abiertosMesAnterior > 0) {
    return `Filtro actualizado a ${formatearPeriodo(periodo)}. El mes anterior (${formatearPeriodo(periodoAnterior)}) quedo con ${etiquetaIncidentes}.`;
  }

  return `Filtro actualizado a ${formatearPeriodo(periodo)}. El mes anterior (${formatearPeriodo(periodoAnterior)}) no dejo incidentes abiertos.`;
};

// Helpers.

const crearTextoResumido = (lista = [], limite = 2) => {
  const elementos = lista.filter(Boolean);

  if (elementos.length <= limite) {
    return elementos.join(', ');
  }

  return `${elementos.slice(0, limite).join(', ')} +${
    elementos.length - limite
  } más`;
};

const normalizarTexto = (valor) =>
  String(valor || '').trim().toLowerCase();

const filtrarAplicacionesPorFiltros = (
  aplicaciones = [],
  incidente,
  filtrosActivos = {}
) => {
  const aplicacionId = String(filtrosActivos.aplicacionId || '');
  const servicioId = String(filtrosActivos.servicioId || '');
  const tipoFalla = normalizarTexto(filtrosActivos.tipoFalla);
  const busqueda = normalizarTexto(filtrosActivos.busqueda);
  const busquedaCoincideConId =
    busqueda &&
    String(incidente.idIncidente || '').includes(busqueda);

  return aplicaciones.filter((app) => {
    if (aplicacionId && String(app.aplicacionId) !== aplicacionId) {
      return false;
    }

    if (servicioId && String(app.servicioId) !== servicioId) {
      return false;
    }

    if (
      tipoFalla &&
      !normalizarTexto(app.tipoFallaNombre).includes(tipoFalla)
    ) {
      return false;
    }

    if (!busqueda || busquedaCoincideConId) {
      return true;
    }

    return [
      app.aplicacionNombre,
      app.servicioNombre,
      app.tipoFallaNombre,
    ].some((valor) => normalizarTexto(valor).includes(busqueda));
  });
};

const filtrarIncidentesIndividuales = (lista = [], filtrosActivos = {}) => {
  return lista
    .map((incidente) => {
      const aplicacionesIndividuales =
        incidente.aplicacionesAfectadas?.filter(
          (app) => !app.masivoId
        ) || [];

      const aplicacionesFiltradas = filtrarAplicacionesPorFiltros(
        aplicacionesIndividuales,
        incidente,
        filtrosActivos
      );

      if (aplicacionesFiltradas.length === 0) {
        return null;
      }

      return {
        ...incidente,
        aplicacionesAfectadas: aplicacionesFiltradas,
        aplicacionesTexto: crearTextoResumido(
          aplicacionesFiltradas.map((a) => a.aplicacionNombre),
          2
        ),
        tiposFallaTexto: crearTextoResumido(
          aplicacionesFiltradas.map((a) => a.tipoFallaNombre),
          2
        ),
      };
    })
    .filter(Boolean);
};

// Componente.

function HistorialIncidentes() {
  const [incidentes, setIncidentes] = useState([]);

  const [ciudades, setCiudades] = useState([]);
  const [cavsDisponibles, setCavsDisponibles] = useState([]);
  const [aplicaciones, setAplicaciones] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [tiposFalla, setTiposFalla] = useState([]);

  const estadoGuardadoInicial = useMemo(
    () => obtenerEstadoHistorialGuardado(),
    []
  );

  const [filtros, setFiltros] = useState(
    estadoGuardadoInicial?.filtros || crearFiltrosIniciales()
  );

  const [cargando, setCargando] = useState(true);
  const [cargandoFiltros, setCargandoFiltros] = useState(false);

  const [mensajeError, setMensajeError] = useState('');
  const [mensajePeriodo, setMensajePeriodo] = useState('');
  const [filtrosVisibles, setFiltrosVisibles] = useState(false);

  const [paginaActual, setPaginaActual] = useState(
    estadoGuardadoInicial?.paginaActual || 1
  );

  const [resumen, setResumen] = useState({
    total: 0,
    abiertos: 0,
    cerrados: 0,
  });

  const listadoRef = useRef(null);
  const filtrosRef = useRef(crearFiltrosIniciales());
  const periodoCalendarioRef = useRef(
    obtenerClavePeriodo(obtenerPeriodoMes(crearFiltrosIniciales()))
  );

  useEffect(() => {
    filtrosRef.current = filtros;
  }, [filtros]);

  useEffect(() => {
    cargarInformacionInicial();

    const intervalo = setInterval(() => {
      aplicarCambioMesAutomatico();
    }, 60000);

    return () => clearInterval(intervalo);
  }, []);

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

  const actualizarResumen = (lista) => {
    setResumen({
      total: lista.length,
      abiertos: lista.filter((item) => item.estado === 'abierto').length,
      cerrados: lista.filter((item) => item.estado === 'cerrado').length,
    });
  };

  const irAlInicioDelListado = () => {
    if (listadoRef.current) {
      listadoRef.current.scrollIntoView({
        behavior: 'auto',
        block: 'start',
      });
    }
  };

  const cargarInformacionInicial = async () => {
    try {
      setCargando(true);
      setMensajeError('');

      const estadoGuardado = obtenerEstadoHistorialGuardado();
      const filtrosIniciales = estadoGuardado?.filtros || crearFiltrosIniciales();
      const paginaGuardada = estadoGuardado?.paginaActual || 1;

      const [
        incidentesRespuesta,
        ciudadesRespuesta,
        aplicacionesRespuesta,
        serviciosRespuesta,
        tiposFallaRespuesta,
      ] = await Promise.all([
        incidenteServicio.listarIncidentes(filtrosIniciales),
        incidenteServicio.obtenerCiudades(),
        incidenteServicio.obtenerAplicaciones(),
        incidenteServicio.obtenerServicios(),
        incidenteServicio.obtenerTiposFalla(),
      ]);

      const incidentesIndividuales = filtrarIncidentesIndividuales(
        incidentesRespuesta,
        filtrosIniciales
      );

      setFiltros(filtrosIniciales);
      setIncidentes(incidentesIndividuales);
      setCiudades(ciudadesRespuesta);
      setAplicaciones(aplicacionesRespuesta);
      setServicios(serviciosRespuesta);
      setTiposFalla(tiposFallaRespuesta);

      actualizarResumen(incidentesIndividuales);
      if (esPrimerDiaDelMes()) {
        setMensajePeriodo(
          await crearMensajePeriodoAutomatico(filtrosIniciales)
        );
      }
      setPaginaActual(paginaGuardada);
    } catch (error) {
      setMensajeError(
        error.message || 'No fue posible cargar el historial.'
      );
    } finally {
      setCargando(false);
    }
  };

  const manejarCambioFiltro = (evento) => {
    const { name, value } = evento.target;

    const mapaNombres = {
      fechaAnio: 'anio',
      fechaMes: 'mes',
      fechaDia: 'dia',
    };

    const nombreReal = mapaNombres[name] || name;

    setMensajePeriodo('');

    setFiltros((prev) => ({
      ...prev,
      [nombreReal]: value,
      ...(nombreReal === 'ciudadId' ? { cavId: '' } : {}),
      ...(nombreReal === 'aplicacionId' ? { servicioId: '' } : {}),
    }));
  };

  const aplicarFiltros = async () => {
    try {
      setCargandoFiltros(true);
      setMensajeError('');
      setMensajePeriodo('');

      const respuesta = await incidenteServicio.listarIncidentes(filtros);
      const incidentesIndividuales = filtrarIncidentesIndividuales(
        respuesta,
        filtros
      );

      setIncidentes(incidentesIndividuales);
      actualizarResumen(incidentesIndividuales);

      setPaginaActual(1);
      guardarEstadoHistorial(filtros, 1);
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
      setMensajePeriodo('');

      const filtrosReiniciados = crearFiltrosIniciales();

      setFiltros(filtrosReiniciados);
      setCavsDisponibles([]);

      const respuesta = await incidenteServicio.listarIncidentes(
        filtrosReiniciados
      );

      const incidentesIndividuales = filtrarIncidentesIndividuales(
        respuesta,
        filtrosReiniciados
      );

      setIncidentes(incidentesIndividuales);
      actualizarResumen(incidentesIndividuales);

      setPaginaActual(1);
      guardarEstadoHistorial(filtrosReiniciados, 1);
      setFiltrosVisibles(false);
    } catch (error) {
      setMensajeError(
        error.message || 'No fue posible limpiar los filtros.'
      );
    } finally {
      setCargandoFiltros(false);
    }
  };

  const crearMensajePeriodoAutomatico = async (filtrosAplicados) => {
    const periodo = obtenerPeriodoMes(filtrosAplicados);

    if (!periodo) {
      return '';
    }

    const periodoAnterior = obtenerPeriodoAnterior(periodo);
    const filtrosMesAnterior = {
      ...filtrosAplicados,
      anio: String(periodoAnterior.anio),
      mes: periodoAnterior.mesTexto,
      dia: '',
      estado: 'abierto',
    };

    const respuestaMesAnterior = await incidenteServicio.listarIncidentes(
      filtrosMesAnterior
    );
    const abiertosMesAnterior = filtrarIncidentesIndividuales(
      respuestaMesAnterior,
      filtrosMesAnterior
    ).length;

    return crearMensajeCambioMes(periodo, abiertosMesAnterior);
  };

  const aplicarCambioMesAutomatico = async () => {
    const fechaActual = obtenerFechaActual();
    const periodoCalendario = obtenerPeriodoMes({
      anio: fechaActual.anio,
      mes: fechaActual.mes,
    });
    const claveCalendario = obtenerClavePeriodo(periodoCalendario);

    if (!claveCalendario || periodoCalendarioRef.current === claveCalendario) {
      return false;
    }

    try {
      const filtrosActualizados = {
        ...filtrosRef.current,
        anio: String(periodoCalendario.anio),
        mes: periodoCalendario.mesTexto,
        dia: '',
      };

      const respuesta = await incidenteServicio.listarIncidentes(
        filtrosActualizados
      );
      const incidentesIndividuales = filtrarIncidentesIndividuales(
        respuesta,
        filtrosActualizados
      );
      const mensajeAutomatico = await crearMensajePeriodoAutomatico(
        filtrosActualizados
      );

      periodoCalendarioRef.current = claveCalendario;
      filtrosRef.current = filtrosActualizados;
      setFiltros(filtrosActualizados);
      setIncidentes(incidentesIndividuales);
      actualizarResumen(incidentesIndividuales);
      setMensajePeriodo(mensajeAutomatico);
      setPaginaActual(1);
      guardarEstadoHistorial(filtrosActualizados, 1);

      return true;
    } catch (error) {
      setMensajeError(
        error.message || 'No fue posible actualizar el historial.'
      );
      return false;
    }
  };

  const alternarFiltros = () => {
    setFiltrosVisibles((prev) => !prev);
  };

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

  useEffect(() => {
    if (totalPaginas > 0 && paginaActual > totalPaginas) {
      setPaginaActual(totalPaginas);
      guardarEstadoHistorial(filtrosRef.current, totalPaginas);
    }
  }, [paginaActual, totalPaginas]);

  const incidentesVisibles = useMemo(() => {
    const inicio = (paginaActual - 1) * INCIDENTES_VISIBLES_INICIALES;
    const fin = inicio + INCIDENTES_VISIBLES_INICIALES;

    return incidentes.slice(inicio, fin);
  }, [incidentes, paginaActual]);

  const cambiarPagina = (pagina) => {
    setPaginaActual(pagina);
    guardarEstadoHistorial(filtrosRef.current, pagina);

    setTimeout(() => {
      irAlInicioDelListado();
    }, 50);
  };

  const tarjetasResumen = [
    { etiqueta: 'Total', valor: resumen.total, clase: 'total' },
    { etiqueta: 'Abiertos', valor: resumen.abiertos, clase: 'abiertos' },
    { etiqueta: 'Cerrados', valor: resumen.cerrados, clase: 'cerrados' },
  ];

  return (
    <LayoutPrincipal>
      <ContenedorPagina>
        <section className="historial-incidentes__hero">
          <div className="historial-incidentes__hero-texto">
            <EtiquetaRol className="historial-incidentes__hero-etiqueta" />

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
                aplicaciones={aplicaciones}
                servicios={servicios}
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
                <Paginacion
                  paginaActual={paginaActual}
                  totalPaginas={totalPaginas}
                  onCambiarPagina={cambiarPagina}
                  className="historial-incidentes__paginacion-superior"
                />
              )}            </div>
          </div>

          {cargando ? (
            <p className="historial-incidentes__texto-carga">
              Cargando incidentes...
            </p>
          ) : incidentes.length === 0 && mensajePeriodo ? (
            <div className="historial-incidentes__vacio">
              <div className="historial-incidentes__alerta-periodo">
                <span className="historial-incidentes__alerta-periodo-icono">
                  !
                </span>
                <div className="historial-incidentes__alerta-periodo-contenido">
                  <strong>{mensajePeriodo}</strong>
                </div>
              </div>
            </div>
          ) : (
            <ListaIncidentes
              incidentes={incidentesVisibles}
              textoSinResultados="No se encontraron incidentes."
            />
          )}
        </div>
      </ContenedorPagina>
    </LayoutPrincipal>
  );
}

export default HistorialIncidentes;
