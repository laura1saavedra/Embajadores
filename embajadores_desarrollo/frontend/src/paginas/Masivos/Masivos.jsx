import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import LayoutPrincipal from '../../componentes/layout/LayoutPrincipal/LayoutPrincipal';
import ContenedorPagina from '../../componentes/layout/ContenedorPagina/ContenedorPagina';
import EtiquetaRol from '../../componentes/layout/EtiquetaRol/EtiquetaRol';
import SelectBuscable from '../../componentes/incidentes/SelectBuscable/SelectBuscable';
import EstadoIncidente from '../../componentes/incidentes/EstadoIncidente/EstadoIncidente';
import Paginacion from '../../componentes/ui/Paginacion/Paginacion';

import incidenteServicio from '../../services/incidenteServicio';
import masivoServicio from '../../services/masivoServicio';

import '../../componentes/incidentes/FiltrosIncidentes/FiltrosIncidentes.css';
import './Masivos.css';

const MASIVOS_VISIBLES_INICIALES = 7;
const ESTADO_MASIVOS_STORAGE_KEY = 'embajadores.masivos.estado';

const FORMATO_FECHA = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const crearFiltrosIniciales = () => {
  const fechaActual = new Date();

  return {
    fechaAnio: String(fechaActual.getFullYear()),
    fechaMes: String(fechaActual.getMonth() + 1).padStart(2, '0'),
    fechaDia: '',
    estado: '',
    aplicacionId: '',
    servicioId: '',
    tipoFallaId: '',
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

const obtenerEstadoMasivosGuardado = () => {
  try {
    const raw = sessionStorage.getItem(ESTADO_MASIVOS_STORAGE_KEY);

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

const guardarEstadoMasivos = (filtros, paginaActual = 1) => {
  try {
    sessionStorage.setItem(
      ESTADO_MASIVOS_STORAGE_KEY,
      JSON.stringify({
        filtros: normalizarFiltrosGuardados(filtros),
        paginaActual,
      })
    );
  } catch {
    // sessionStorage puede no estar disponible en algunos contextos.
  }
};

const esPrimerDiaDelMes = () => new Date().getDate() === 1;

const ESTADOS = [
  { valor: '', etiqueta: 'Todos' },
  { valor: 'abierto', etiqueta: 'Abierto' },
  { valor: 'cerrado', etiqueta: 'Cerrado' },
];

const MESES = [
  { valor: '', etiqueta: 'Todos' },
  { valor: '01', etiqueta: 'Enero' },
  { valor: '02', etiqueta: 'Febrero' },
  { valor: '03', etiqueta: 'Marzo' },
  { valor: '04', etiqueta: 'Abril' },
  { valor: '05', etiqueta: 'Mayo' },
  { valor: '06', etiqueta: 'Junio' },
  { valor: '07', etiqueta: 'Julio' },
  { valor: '08', etiqueta: 'Agosto' },
  { valor: '09', etiqueta: 'Septiembre' },
  { valor: '10', etiqueta: 'Octubre' },
  { valor: '11', etiqueta: 'Noviembre' },
  { valor: '12', etiqueta: 'Diciembre' },
];

const NOMBRES_MESES = MESES.reduce((mapa, mes) => {
  if (mes.valor) {
    mapa[mes.valor] = mes.etiqueta;
  }

  return mapa;
}, {});

const DIAS = [
  { valor: '', etiqueta: 'Todos' },
  ...Array.from({ length: 31 }, (_, index) => {
    const valor = String(index + 1).padStart(2, '0');
    return { valor, etiqueta: valor };
  }),
];

const obtenerAnios = () => {
  const anioActual = new Date().getFullYear();

  return [
    { valor: '', etiqueta: 'Todos' },
    ...Array.from({ length: 6 }, (_, index) => {
      const anio = String(anioActual - index);
      return { valor: anio, etiqueta: anio };
    }),
  ];
};

const obtenerPeriodoMes = (filtros = {}) => {
  if (!filtros.fechaAnio || !filtros.fechaMes) {
    return null;
  }

  return {
    anio: Number(filtros.fechaAnio),
    mes: Number(filtros.fechaMes),
    mesTexto: String(filtros.fechaMes).padStart(2, '0'),
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

  return `${NOMBRES_MESES[periodo.mesTexto]} de ${periodo.anio}`;
};

const crearMensajeCambioMes = (periodo, abiertosMesAnterior) => {
  const periodoAnterior = obtenerPeriodoAnterior(periodo);
  const etiquetaIncidentes =
    abiertosMesAnterior === 1
      ? '1 incidente masivo abierto'
      : `${abiertosMesAnterior} incidentes masivos abiertos`;

  if (abiertosMesAnterior > 0) {
    return `Filtro actualizado a ${formatearPeriodo(periodo)}. El mes anterior (${formatearPeriodo(periodoAnterior)}) quedo con ${etiquetaIncidentes}.`;
  }

  return `Filtro actualizado a ${formatearPeriodo(periodo)}. El mes anterior (${formatearPeriodo(periodoAnterior)}) no dejo incidentes masivos abiertos.`;
};

const filtrarMasivos = (lista = [], filtros = {}) => {
  return lista.filter((masivo) => {
    if (filtros.estado && masivo.estado !== filtros.estado) {
      return false;
    }

    if (
      filtros.aplicacionId &&
      String(masivo.aplicacionId) !== String(filtros.aplicacionId)
    ) {
      return false;
    }

    if (
      filtros.servicioId &&
      String(masivo.servicioId) !== String(filtros.servicioId)
    ) {
      return false;
    }

    if (
      filtros.tipoFallaId &&
      String(masivo.tipoFallaId) !== String(filtros.tipoFallaId)
    ) {
      return false;
    }

    if (!filtros.fechaAnio && !filtros.fechaMes && !filtros.fechaDia) {
      return true;
    }

    if (!masivo.fechaHoraGenerado) {
      return false;
    }

    const fecha = new Date(masivo.fechaHoraGenerado);

    if (Number.isNaN(fecha.getTime())) {
      return false;
    }

    const anio = String(fecha.getFullYear());
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');

    return (
      (!filtros.fechaAnio || filtros.fechaAnio === anio) &&
      (!filtros.fechaMes || filtros.fechaMes === mes) &&
      (!filtros.fechaDia || filtros.fechaDia === dia)
    );
  });
};

function Masivos() {
  const estadoGuardadoInicial = useMemo(
    () => obtenerEstadoMasivosGuardado(),
    []
  );

  const [masivos, setMasivos] = useState([]);
  const [aplicaciones, setAplicaciones] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [tiposFalla, setTiposFalla] = useState([]);
  const [filtros, setFiltros] = useState(
    estadoGuardadoInicial?.filtros || crearFiltrosIniciales()
  );

  const [cargando, setCargando] = useState(true);
  const [cargandoFiltros, setCargandoFiltros] = useState(false);
  const [mensajeError, setMensajeError] = useState('');
  const [mensajePeriodo, setMensajePeriodo] = useState('');
  const [paginaActual, setPaginaActual] = useState(
    estadoGuardadoInicial?.paginaActual || 1
  );
  const [filtrosVisibles, setFiltrosVisibles] = useState(false);

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
      actualizarMasivosEnSegundoPlano();
     }, 60000); // refresca cada 1 minuto 
     
     return () => clearInterval(intervalo);
  }, []);

  const actualizarMasivosEnSegundoPlano = async () => {
    try {
      const cambioAutomatico = await aplicarCambioMesAutomatico();

      if (cambioAutomatico) {
        return;
      }

      const filtrosActuales = filtrosRef.current;

      const masivosRespuesta = await masivoServicio.listarMasivos(
        filtrosActuales,
        {
          incluirCerrados: true,
        }
      );

      setMasivos(filtrarMasivos(masivosRespuesta, filtrosActuales));
    } catch (error) {
      setMensajeError(
        error.message || 'No fue posible actualizar los incidentes masivos.'
      );
    }
  };

  const cargarInformacionInicial = async () => {
    try {
      setCargando(true);
      setMensajeError('');

      const estadoGuardado = obtenerEstadoMasivosGuardado();
      const filtrosIniciales = estadoGuardado?.filtros || crearFiltrosIniciales();
      const paginaGuardada = estadoGuardado?.paginaActual || 1;

      const [
        masivosRespuesta,
        aplicacionesRespuesta,
        serviciosRespuesta,
        tiposFallaRespuesta,
      ] = await Promise.all([
        masivoServicio.listarMasivos(filtrosIniciales, {
          incluirCerrados: true,
        }),
        incidenteServicio.obtenerAplicaciones(),
        incidenteServicio.obtenerServicios(),
        incidenteServicio.obtenerTiposFalla(),
      ]);

      setFiltros(filtrosIniciales);
      setMasivos(filtrarMasivos(masivosRespuesta, filtrosIniciales));
      setAplicaciones(aplicacionesRespuesta);
      setServicios(serviciosRespuesta);
      setTiposFalla(tiposFallaRespuesta);
      if (esPrimerDiaDelMes()) {
        setMensajePeriodo(
          await crearMensajePeriodoAutomatico(filtrosIniciales)
        );
      }
      setPaginaActual(paginaGuardada);
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

    setMensajePeriodo('');

    setFiltros((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'aplicacionId' ? { servicioId: '' } : {}),
    }));
  };

  const aplicarFiltros = async () => {
    try {
      setCargandoFiltros(true);
      setMensajeError('');
      setMensajePeriodo('');

      const respuesta = await masivoServicio.listarMasivos(filtros, {
        incluirCerrados: true,
      });
      setMasivos(filtrarMasivos(respuesta, filtros));

      setPaginaActual(1);
      guardarEstadoMasivos(filtros, 1);
      setFiltrosVisibles(false);
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
      setMensajePeriodo('');

      const filtrosIniciales = crearFiltrosIniciales();

      setFiltros(filtrosIniciales);

      const respuesta = await masivoServicio.listarMasivos(filtrosIniciales, {
        incluirCerrados: true,
      });
      setMasivos(filtrarMasivos(respuesta, filtrosIniciales));

      setPaginaActual(1);
      guardarEstadoMasivos(filtrosIniciales, 1);
      setFiltrosVisibles(false);
    } catch (error) {
      setMensajeError(error.message || 'No fue posible limpiar los filtros.');
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
      fechaAnio: String(periodoAnterior.anio),
      fechaMes: periodoAnterior.mesTexto,
      fechaDia: '',
      estado: 'abierto',
    };

    const respuestaMesAnterior = await masivoServicio.listarMasivos(
      filtrosMesAnterior,
      { incluirCerrados: true }
    );
    const abiertosMesAnterior = filtrarMasivos(
      respuestaMesAnterior,
      filtrosMesAnterior
    ).length;

    return crearMensajeCambioMes(periodo, abiertosMesAnterior);
  };

  const aplicarCambioMesAutomatico = async () => {
    const filtrosCalendario = crearFiltrosIniciales();
    const periodoCalendario = obtenerPeriodoMes(filtrosCalendario);
    const claveCalendario = obtenerClavePeriodo(periodoCalendario);

    if (!claveCalendario || periodoCalendarioRef.current === claveCalendario) {
      return false;
    }

    const filtrosActualizados = {
      ...filtrosRef.current,
      fechaAnio: String(periodoCalendario.anio),
      fechaMes: periodoCalendario.mesTexto,
      fechaDia: '',
    };

    const respuesta = await masivoServicio.listarMasivos(
      filtrosActualizados,
      { incluirCerrados: true }
    );
    const masivosFiltrados = filtrarMasivos(respuesta, filtrosActualizados);
    const mensajeAutomatico = await crearMensajePeriodoAutomatico(
      filtrosActualizados
    );

    periodoCalendarioRef.current = claveCalendario;
    filtrosRef.current = filtrosActualizados;
    setFiltros(filtrosActualizados);
    setMasivos(masivosFiltrados);
    setMensajePeriodo(mensajeAutomatico);
    setPaginaActual(1);
    guardarEstadoMasivos(filtrosActualizados, 1);

    return true;
  };

  const irAlInicioDelListado = () => {
    if (listadoRef.current) {
      listadoRef.current.scrollIntoView({
        behavior: 'auto',
        block: 'start',
      });
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'Sin registrar';
    return FORMATO_FECHA.format(new Date(fecha));
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

  const opcionesServicios = useMemo(() => {
    if (!filtros.aplicacionId) {
      return [{ valor: '', etiqueta: 'Primero seleccione aplicación' }];
    }

    const serviciosFiltrados = servicios.filter(
      (servicio) =>
        String(servicio.aplicacionId) === String(filtros.aplicacionId)
    );

    return [
      { valor: '', etiqueta: 'Todos' },
      ...serviciosFiltrados.map((servicio) => ({
        valor: servicio.id,
        etiqueta: servicio.nombre,
      })),
    ];
  }, [servicios, filtros.aplicacionId]);

  const servicioDeshabilitado = !filtros.aplicacionId;

  const anios = useMemo(() => obtenerAnios(), []);

  const cantidadFiltrosActivos = useMemo(() => {
    return Object.values(filtros).filter((valor) => valor !== '').length;
  }, [filtros]);

  const alternarFiltros = () => {
    setFiltrosVisibles((prev) => !prev);
  };

  const totalPaginas = Math.ceil(
    masivos.length / MASIVOS_VISIBLES_INICIALES
  );

  useEffect(() => {
    if (totalPaginas > 0 && paginaActual > totalPaginas) {
      setPaginaActual(totalPaginas);
      guardarEstadoMasivos(filtrosRef.current, totalPaginas);
    }
  }, [paginaActual, totalPaginas]);

  const masivosVisibles = useMemo(() => {
    const inicio = (paginaActual - 1) * MASIVOS_VISIBLES_INICIALES;
    const fin = inicio + MASIVOS_VISIBLES_INICIALES;

    return masivos.slice(inicio, fin);
  }, [masivos, paginaActual]);

  const cambiarPagina = (pagina) => {
    setPaginaActual(pagina);
    guardarEstadoMasivos(filtrosRef.current, pagina);

    setTimeout(() => {
      irAlInicioDelListado();
    }, 50);
  };

  return (
    <LayoutPrincipal>
      <ContenedorPagina>
        <section className="masivos__hero">
          <div className="masivos__hero-texto">
            <EtiquetaRol className="masivos__hero-etiqueta" />

            <h1 className="masivos__hero-titulo">
              Incidentes <span>masivos</span>
            </h1>

            <p className="masivos__hero-descripcion">
              Consulta los incidentes masivos generados automaticamente por
              aplicacion, servicio y tipo de falla, revisa su impacto y realiza seguimiento.
            </p>
          </div>
        </section>

        {mensajeError && (
          <div className="masivos__alerta">
            {mensajeError}
          </div>
        )}

        <div className="masivos__resumen-con-filtro">
          <div className="masivos__resumen">
            <div className="masivos__tarjeta-resumen masivos__tarjeta-resumen--total">
              <span>Total</span>
              <strong>{masivos.length}</strong>
            </div>
          </div>

          <div className="masivos__mensaje-periodo">
            Prioriza el seguimiento de los masivos con mayor impacto y valida
            su estado antes de cerrar la gestion.
          </div>

          <button
            type="button"
            className="masivos__boton-filtros"
            onClick={alternarFiltros}
          >
            <span className="masivos__boton-filtros-texto">
              Filtro de busqueda
            </span>

            <span className="masivos__boton-filtros-lado">
              {cantidadFiltrosActivos > 0 && (
                <span className="masivos__boton-filtros-badge">
                  {cantidadFiltrosActivos}
                </span>
              )}

              <span className="masivos__boton-filtros-icono">
                {filtrosVisibles ? '▲' : '▼'}
              </span>
            </span>
          </button>
        </div>

        <div className="masivos__bloque-filtros">
          {filtrosVisibles && (
            <div className="masivos__panel-filtros">
              <section className="filtros-incidentes">
                <div className="filtros-incidentes__cabecera">
                  <h2 className="filtros-incidentes__titulo">
                    Filtros de busqueda
                  </h2>

                  <span className="filtros-incidentes__contador">
                    Filtros activos: {cantidadFiltrosActivos}
                  </span>
                </div>

                <form
                  className="filtros-incidentes__formulario"
                  onSubmit={(evento) => {
                    evento.preventDefault();
                    aplicarFiltros();
                  }}
                >
                  <div className="filtros-incidentes__grid">
                    <div className="filtros-incidentes__campo">
                      <SelectBuscable
                        id="fechaAnio"
                        label="Año"
                        opciones={anios}
                        valor={filtros.fechaAnio}
                        onChange={manejarCambioFiltro}
                        disabled={cargandoFiltros}
                        placeholder="Todos"
                        placeholderBusqueda="Buscar año..."
                      />
                    </div>

                    <div className="filtros-incidentes__campo">
                      <SelectBuscable
                        id="fechaMes"
                        label="Mes"
                        opciones={MESES}
                        valor={filtros.fechaMes}
                        onChange={manejarCambioFiltro}
                        disabled={cargandoFiltros}
                        placeholder="Todos"
                        placeholderBusqueda="Buscar mes..."
                      />
                    </div>

                    <div className="filtros-incidentes__campo">
                      <SelectBuscable
                        id="fechaDia"
                        label="Dia"
                        opciones={DIAS}
                        valor={filtros.fechaDia}
                        onChange={manejarCambioFiltro}
                        disabled={cargandoFiltros}
                        placeholder="Todos"
                        placeholderBusqueda="Buscar dia..."
                      />
                    </div>

                    <div className="filtros-incidentes__campo">
                      <SelectBuscable
                        id="estado"
                        label="Estado"
                        opciones={ESTADOS}
                        valor={filtros.estado}
                        onChange={manejarCambioFiltro}
                        disabled={cargandoFiltros}
                        placeholder="Todos"
                        placeholderBusqueda="Buscar estado..."
                      />
                    </div>

                    <div className="filtros-incidentes__campo">
                      <SelectBuscable
                        id="aplicacionId"
                        label="Aplicacion"
                        opciones={opcionesAplicaciones}
                        valor={filtros.aplicacionId}
                        onChange={manejarCambioFiltro}
                        disabled={cargandoFiltros}
                        placeholder="Todas"
                        placeholderBusqueda="Buscar aplicacion..."
                      />
                    </div>

                    <div className="filtros-incidentes__campo">
                      <SelectBuscable
                        id="servicioId"
                        label="Servicio"
                        opciones={opcionesServicios}
                        valor={filtros.servicioId}
                        onChange={manejarCambioFiltro}
                        disabled={cargandoFiltros || servicioDeshabilitado}
                        placeholder={
                          servicioDeshabilitado
                            ? 'Primero seleccione aplicación'
                            : 'Todos'
                        }
                        placeholderBusqueda="Buscar servicio..."
                      />
                    </div>

                    <div className="filtros-incidentes__campo">
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
                    </div>
                  </div>

                  <div className="filtros-incidentes__acciones">
                    <button
                      type="button"
                      className="filtros-incidentes__boton filtros-incidentes__boton--secundario"
                      onClick={limpiarFiltros}
                      disabled={cargandoFiltros}
                    >
                      Limpiar filtros
                    </button>

                    <button
                      type="submit"
                      className="filtros-incidentes__boton filtros-incidentes__boton--principal"
                      disabled={cargandoFiltros}
                    >
                      {cargandoFiltros
                        ? 'Aplicando filtros...'
                        : 'Aplicar filtros'}
                    </button>
                  </div>
                </form>
              </section>
            </div>
          )}
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
                <Paginacion
                  paginaActual={paginaActual}
                  totalPaginas={totalPaginas}
                  onCambiarPagina={cambiarPagina}
                  className="masivos__paginacion-mini"
                />
              )}            </div>
          </div>

          {cargando ? (
            <p className="masivos__texto-simple">
              Cargando incidentes masivos...
            </p>
          ) : masivos.length === 0 ? (
            <div className="masivos__vacio">
              {mensajePeriodo ? (
                <div className="masivos__alerta-periodo">
                  <span className="masivos__alerta-periodo-icono">!</span>
                  <div className="masivos__alerta-periodo-contenido">
                    <strong>{mensajePeriodo}</strong>
                  </div>
                </div>
              ) : (
                'No se encontraron incidentes masivos.'
              )}
            </div>
          ) : (
            <div className="masivos__tabla-contenedor">
              <table className="masivos__tabla">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Aplicacion</th>
                    <th>Servicio</th>
                    <th>Tipo de falla</th>
                    <th className="masivos__celda-centrada">
                      CAVs afectados
                    </th>
                    <th className="masivos__celda-centrada">
                      Usuarios afectados
                    </th>
                    <th className="masivos__celda-centrada">
                      Usuarios en operacion
                    </th>
                    <th className="masivos__celda-centrada">Estado</th>
                    <th className="masivos__celda-fecha">Fecha generacion</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {masivosVisibles.map((masivo) => (
                    <tr key={masivo.idMasivo}>
                      <td>#{masivo.idMasivo}</td>
                      <td>{masivo.aplicacionNombre || 'Sin aplicacion'}</td>
                      <td>{masivo.servicioNombre || 'Sin servicio'}</td>
                      <td>{masivo.tipoFallaNombre || 'Sin tipo'}</td>
                      <td className="masivos__celda-centrada">
                        {masivo.cantidadCavs}
                      </td>
                      <td className="masivos__celda-centrada">
                        {masivo.usuariosAfectados ?? 0}
                      </td>
                      <td className="masivos__celda-centrada">
                        {masivo.usuariosOperacion ?? 'Sin registrar'}
                      </td>
                      <td className="masivos__celda-centrada">
                        <EstadoIncidente estado={masivo.estado} />
                      </td>
                      <td className="masivos__celda-fecha">
                        {formatearFecha(masivo.fechaHoraGenerado)}
                      </td>
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
