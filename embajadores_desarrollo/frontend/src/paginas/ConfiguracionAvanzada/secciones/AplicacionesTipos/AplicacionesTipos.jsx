import { Fragment, useEffect, useMemo, useRef, useState } from 'react';

import Paginacion from '../../../../componentes/ui/Paginacion/Paginacion';
import configuracionServicio from '../../../../services/configuracionServicio';

import './AplicacionesTipos.css';

const FORM_INICIAL = {
  nombre: '',
  nuevosServicios: [''],
};

const FORM_SERVICIO_INICIAL = {
  nombre: '',
  aplicacionId: '',
};

const ELEMENTOS_POR_PAGINA = 4;

function AplicacionesTipos({ onVolver }) {
  const [aplicaciones, setAplicaciones] = useState([]);
  const [tiposFalla, setTiposFalla] = useState([]);

  const [busquedaAplicacion, setBusquedaAplicacion] = useState('');
  const [busquedaTipo, setBusquedaTipo] = useState('');

  const [paginaAplicaciones, setPaginaAplicaciones] = useState(1);
  const [paginaTipos, setPaginaTipos] = useState(1);
  const [aplicacionExpandida, setAplicacionExpandida] = useState(null);

  const [formAplicacion, setFormAplicacion] = useState(FORM_INICIAL);
  const [formServicio, setFormServicio] = useState(FORM_SERVICIO_INICIAL);
  const [formTipoFalla, setFormTipoFalla] = useState(FORM_INICIAL);

  const [editandoAplicacion, setEditandoAplicacion] = useState(null);
  const [editandoServicio, setEditandoServicio] = useState(null);
  const [editandoTipoFalla, setEditandoTipoFalla] = useState(null);

  const [eliminandoAplicacion, setEliminandoAplicacion] = useState(null);
  const [eliminandoServicio, setEliminandoServicio] = useState(null);
  const [eliminandoTipoFalla, setEliminandoTipoFalla] = useState(null);

  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);

  const [mensajeError, setMensajeError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');
  const [mostrarNuevosServicios, setMostrarNuevosServicios] = useState(false);

  const inicioRef = useRef(null);

  const subirAlInicio = () => {
    setTimeout(() => {
      inicioRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100);
  };

  const normalizarParaComparar = (texto = '') =>
  texto
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      setMensajeError('');

      const [apps, tipos] = await Promise.all([
        configuracionServicio.listarAplicaciones(),
        configuracionServicio.listarTiposFalla(),
      ]);

      setAplicaciones(apps);
      setTiposFalla(tipos);
    } catch (error) {
      setMensajeError(
        error.message || 'No fue posible cargar la información.'
      );
      subirAlInicio();
    } finally {
      setCargando(false);
    }
  };

  const limpiarMensajes = () => {
    setMensajeError('');
    setMensajeExito('');
  };

  const aplicacionesFiltradas = useMemo(() => {
    const texto = busquedaAplicacion.trim().toLowerCase();

    if (!texto) return aplicaciones;

    return aplicaciones.filter((app) => {
      const coincideAplicacion = app.nombreAplicacion
        .toLowerCase()
        .includes(texto);

      const coincideServicio = (app.servicios || []).some((servicio) =>
        servicio.nombreServicio.toLowerCase().includes(texto)
      );

      return coincideAplicacion || coincideServicio;
    });
  }, [aplicaciones, busquedaAplicacion]);

  const tiposFiltrados = useMemo(() => {
    const texto = busquedaTipo.trim().toLowerCase();

    if (!texto) return tiposFalla;

    return tiposFalla.filter((tipo) =>
      tipo.nombreTipo.toLowerCase().includes(texto)
    );
  }, [tiposFalla, busquedaTipo]);

  const totalPaginasAplicaciones = Math.max(
    1,
    Math.ceil(aplicacionesFiltradas.length / ELEMENTOS_POR_PAGINA)
  );

  const totalPaginasTipos = Math.max(
    1,
    Math.ceil(tiposFiltrados.length / ELEMENTOS_POR_PAGINA)
  );

  const aplicacionesVisibles = useMemo(() => {
    const inicio = (paginaAplicaciones - 1) * ELEMENTOS_POR_PAGINA;
    const fin = inicio + ELEMENTOS_POR_PAGINA;

    return aplicacionesFiltradas.slice(inicio, fin);
  }, [aplicacionesFiltradas, paginaAplicaciones]);

  const tiposVisibles = useMemo(() => {
    const inicio = (paginaTipos - 1) * ELEMENTOS_POR_PAGINA;
    const fin = inicio + ELEMENTOS_POR_PAGINA;

    return tiposFiltrados.slice(inicio, fin);
  }, [tiposFiltrados, paginaTipos]);

  const aplicacionSinCambios =
  editandoAplicacion &&
  normalizarParaComparar(formAplicacion.nombre) ===
    normalizarParaComparar(editandoAplicacion.nombreAplicacion) &&
  formAplicacion.nuevosServicios.every(
    (servicio) => servicio.trim().length === 0
  );

  const tipoFallaSinCambios =
    editandoTipoFalla &&
    normalizarParaComparar(formTipoFalla.nombre) ===
      normalizarParaComparar(editandoTipoFalla.nombreTipo);

  const servicioSinCambios =
    editandoServicio &&
    normalizarParaComparar(formServicio.nombre) ===
      normalizarParaComparar(editandoServicio.nombreServicio) &&
    Number(formServicio.aplicacionId) === Number(editandoServicio.aplicacionId);

  const mostrarLimpiarAplicacion = formAplicacion.nombre.trim().length > 0;
  const mostrarLimpiarTipoFalla = formTipoFalla.nombre.trim().length > 0;

  const limpiarFormularioAplicacion = () => {
    setFormAplicacion(FORM_INICIAL);
    limpiarMensajes();
  };

  const limpiarFormularioTipoFalla = () => {
    setFormTipoFalla(FORM_INICIAL);
    limpiarMensajes();
  };

  const alternarAplicacion = (idAplicacion) => {
    setAplicacionExpandida((prev) =>
      prev === idAplicacion ? null : idAplicacion
    );
  };

  const agregarNuevoServicioAplicacion = () => {
    setFormAplicacion((prev) => ({
      ...prev,
      nuevosServicios: [...prev.nuevosServicios, ''],
    }));
  };

  const cambiarNuevoServicioAplicacion = (index, valor) => {
    setFormAplicacion((prev) => ({
      ...prev,
      nuevosServicios: prev.nuevosServicios.map((servicio, posicion) =>
        posicion === index ? valor : servicio
      ),
    }));
  };

  const eliminarNuevoServicioAplicacion = (index) => {
    setFormAplicacion((prev) => ({
      ...prev,
      nuevosServicios:
        prev.nuevosServicios.length > 1
          ? prev.nuevosServicios.filter((_, posicion) => posicion !== index)
          : [''],
    }));
  };

  const guardarAplicacion = async (evento) => {
    evento.preventDefault();

    const nombre = formAplicacion.nombre.trim();

    if (!nombre) {
      setMensajeError('El nombre de la aplicación es obligatorio.');
      subirAlInicio();
      return;
    }

    const nuevosServiciosLimpios = formAplicacion.nuevosServicios
      .map((servicio) => servicio.trim())
      .filter(Boolean);

    if (!editandoAplicacion && nuevosServiciosLimpios.length === 0) {
      setMensajeError('Agrega al menos un servicio para crear la aplicacion.');
      subirAlInicio();
      return;
    }

    if (aplicacionSinCambios) {
      setFormAplicacion(FORM_INICIAL);
      setEditandoAplicacion(null);
      setMostrarNuevosServicios(false);
      setMensajeExito('');
      setMensajeError('');
      return;
    }

    if (nuevosServiciosLimpios.length > 0) {
      const serviciosDuplicados = nuevosServiciosLimpios.some(
        (servicio, index) =>
          nuevosServiciosLimpios.findIndex(
            (item) =>
              normalizarParaComparar(item) === normalizarParaComparar(servicio)
          ) !== index
      );

      if (serviciosDuplicados) {
        setMensajeError('No puedes agregar servicios duplicados.');
        subirAlInicio();
        return;
      }

      if (editandoAplicacion) {
        const servicioYaExiste = nuevosServiciosLimpios.some((servicio) =>
          (editandoAplicacion.servicios || []).some(
            (existente) =>
              normalizarParaComparar(existente.nombreServicio) ===
              normalizarParaComparar(servicio)
          )
        );

        if (servicioYaExiste) {
          setMensajeError('Ese servicio ya existe para la aplicacion.');
          subirAlInicio();
          return;
        }
      }
    }

    try {
      setGuardando(true);
      limpiarMensajes();

      if (editandoAplicacion) {
        await configuracionServicio.actualizarAplicacion(
          editandoAplicacion.idAplicacion,
          nombre
        );

        setMensajeExito('Aplicación actualizada correctamente.');
        for (const nuevoServicio of nuevosServiciosLimpios) {
          await configuracionServicio.crearServicio(
            nuevoServicio,
            editandoAplicacion.idAplicacion
          );
        }

        setAplicacionExpandida(editandoAplicacion.idAplicacion);
        setMensajeExito(
          nuevosServiciosLimpios.length > 0
            ? 'Aplicacion y servicios actualizados correctamente.'
            : 'Aplicacion actualizada correctamente.'
        );
        subirAlInicio();
      } else {
        const nuevaAplicacion = await configuracionServicio.crearAplicacion(nombre);

        for (const nuevoServicio of nuevosServiciosLimpios) {
          await configuracionServicio.crearServicio(
            nuevoServicio,
            nuevaAplicacion.idAplicacion
          );
        }

        setAplicacionExpandida(nuevaAplicacion.idAplicacion);
        setMensajeExito('Aplicación creada correctamente.');
        subirAlInicio();
      }

      setFormAplicacion(FORM_INICIAL);
      setEditandoAplicacion(null);
      setMostrarNuevosServicios(false);
      setEliminandoAplicacion(null);

      await cargarDatos();
    } catch (error) {
      setMensajeError(error.message || 'No fue posible guardar la aplicación.');
      subirAlInicio();
    } finally {
      setGuardando(false);
    }
  };

  const guardarServicio = async (evento) => {
    evento.preventDefault();

    const nombre = formServicio.nombre.trim();

    if (!nombre || !formServicio.aplicacionId) {
      setMensajeError('Completa el nombre del servicio y selecciona una aplicacion.');
      subirAlInicio();
      return;
    }

    if (servicioSinCambios) {
      setFormServicio(FORM_SERVICIO_INICIAL);
      setEditandoServicio(null);
      setMensajeExito('');
      setMensajeError('');
      return;
    }

    try {
      setGuardando(true);
      limpiarMensajes();

      if (editandoServicio) {
        await configuracionServicio.actualizarServicio(
          editandoServicio.idServicio,
          nombre,
          formServicio.aplicacionId
        );

        setMensajeExito('Servicio actualizado correctamente.');
        subirAlInicio();
      } else {
        await configuracionServicio.crearServicio(
          nombre,
          formServicio.aplicacionId
        );

        setMensajeExito('Servicio creado correctamente.');
        setAplicacionExpandida(Number(formServicio.aplicacionId));
        subirAlInicio();
      }

      setFormServicio(FORM_SERVICIO_INICIAL);
      setEditandoServicio(null);
      setEliminandoServicio(null);

      await cargarDatos();
    } catch (error) {
      setMensajeError(error.message || 'No fue posible guardar el servicio.');
      subirAlInicio();
    } finally {
      setGuardando(false);
    }
  };

  const guardarTipoFalla = async (evento) => {
    evento.preventDefault();

    const nombre = formTipoFalla.nombre.trim();

    if (!nombre) {
      setMensajeError('El nombre del tipo de falla es obligatorio.');
      subirAlInicio();
      return;
    }

    if (tipoFallaSinCambios) {
      setFormTipoFalla(FORM_INICIAL);
      setEditandoTipoFalla(null);
      setMensajeExito('');
      setMensajeError('');
      return;
    }

    try {
      setGuardando(true);
      limpiarMensajes();

      if (editandoTipoFalla) {
        await configuracionServicio.actualizarTipoFalla(
          editandoTipoFalla.idTipoFalla,
          nombre
        );

        setMensajeExito('Tipo de falla actualizado correctamente.');
        subirAlInicio();
      } else {
        await configuracionServicio.crearTipoFalla(nombre);
        setMensajeExito('Tipo de falla creado correctamente.');
        subirAlInicio();
      }

      setFormTipoFalla(FORM_INICIAL);
      setEditandoTipoFalla(null);
      setEliminandoTipoFalla(null);

      await cargarDatos();
    } catch (error) {
      setMensajeError(
        error.message || 'No fue posible guardar el tipo de falla.'
      );
      subirAlInicio();
    } finally {
      setGuardando(false);
    }
  };

  const prepararEditarAplicacion = (app) => {
    limpiarMensajes();

    setEditandoAplicacion(app);
    setEditandoServicio(null);
    setEditandoTipoFalla(null);
    setEliminandoAplicacion(null);
    setEliminandoServicio(null);
    setEliminandoTipoFalla(null);
    setMostrarNuevosServicios(false);

    setFormAplicacion({
      nombre: app.nombreAplicacion,
      nuevosServicios: [''],
    });
  };

  const prepararEditarServicio = (servicio, app) => {
    limpiarMensajes();

    setEditandoServicio({
      ...servicio,
      aplicacionId: app.idAplicacion,
      nombreAplicacion: app.nombreAplicacion,
    });
    setEditandoAplicacion(null);
    setEditandoTipoFalla(null);
    setEliminandoAplicacion(null);
    setEliminandoServicio(null);
    setEliminandoTipoFalla(null);

    setFormServicio({
      nombre: servicio.nombreServicio,
      aplicacionId: String(app.idAplicacion),
    });
  };

  const prepararEditarTipoFalla = (tipo) => {
    limpiarMensajes();

    setEditandoTipoFalla(tipo);
    setEditandoAplicacion(null);
    setEditandoServicio(null);
    setEliminandoAplicacion(null);
    setEliminandoServicio(null);
    setEliminandoTipoFalla(null);

    setFormTipoFalla({
      nombre: tipo.nombreTipo,
    });
  };

  const prepararEliminarAplicacion = (app) => {
    limpiarMensajes();

    setEliminandoAplicacion(app);
    setEliminandoServicio(null);
    setEliminandoTipoFalla(null);
    setEditandoAplicacion(null);
    setEditandoServicio(null);
    setEditandoTipoFalla(null);

    setFormAplicacion(FORM_INICIAL);
  };

  const prepararEliminarServicio = (servicio, app) => {
    limpiarMensajes();

    setEliminandoServicio({
      ...servicio,
      aplicacionId: app.idAplicacion,
      nombreAplicacion: app.nombreAplicacion,
    });
    setEliminandoAplicacion(null);
    setEliminandoTipoFalla(null);
    setEditandoAplicacion(null);
    setEditandoServicio(null);
    setEditandoTipoFalla(null);

    setFormServicio(FORM_SERVICIO_INICIAL);
  };

  const prepararEliminarTipoFalla = (tipo) => {
    limpiarMensajes();

    setEliminandoTipoFalla(tipo);
    setEliminandoAplicacion(null);
    setEliminandoServicio(null);
    setEditandoAplicacion(null);
    setEditandoServicio(null);
    setEditandoTipoFalla(null);

    setFormTipoFalla(FORM_INICIAL);
  };

  const cancelarEdicionAplicacion = () => {
    setEditandoAplicacion(null);
    setFormAplicacion(FORM_INICIAL);
    setMostrarNuevosServicios(false);
    limpiarMensajes();
  };

  const cancelarEdicionServicio = () => {
    setEditandoServicio(null);
    setFormServicio(FORM_SERVICIO_INICIAL);
    limpiarMensajes();
  };

  const cancelarEdicionTipoFalla = () => {
    setEditandoTipoFalla(null);
    setFormTipoFalla(FORM_INICIAL);
    limpiarMensajes();
  };

  const cancelarEliminarAplicacion = () => {
    setEliminandoAplicacion(null);
    limpiarMensajes();
  };

  const cancelarEliminarServicio = () => {
    setEliminandoServicio(null);
    limpiarMensajes();
  };

  const cancelarEliminarTipoFalla = () => {
    setEliminandoTipoFalla(null);
    limpiarMensajes();
  };

  const confirmarEliminarAplicacion = async () => {
    if (!eliminandoAplicacion) return;

    try {
      setGuardando(true);
      limpiarMensajes();

      await configuracionServicio.eliminarAplicacion(
        eliminandoAplicacion.idAplicacion
      );

      setEliminandoAplicacion(null);
      await cargarDatos();

      setMensajeExito('Aplicación eliminada correctamente.');
      subirAlInicio();
    } catch (error) {
      setMensajeError(error.message || 'No fue posible eliminar la aplicación.');
      subirAlInicio();
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminarServicio = async () => {
    if (!eliminandoServicio) return;

    try {
      setGuardando(true);
      limpiarMensajes();

      await configuracionServicio.eliminarServicio(
        eliminandoServicio.idServicio
      );

      const aplicacionId = eliminandoServicio.aplicacionId;

      setEliminandoServicio(null);
      setAplicacionExpandida(Number(aplicacionId));
      await cargarDatos();

      setMensajeExito('Servicio eliminado correctamente.');
      subirAlInicio();
    } catch (error) {
      setMensajeError(error.message || 'No fue posible eliminar el servicio.');
      subirAlInicio();
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstadoAplicacion = async (app) => {
    try {
      setGuardando(true);
      limpiarMensajes();

      await configuracionServicio.cambiarEstadoAplicacion(
        app.idAplicacion,
        !app.activo
      );

      setAplicacionExpandida(app.idAplicacion);
      await cargarDatos();

      setMensajeExito(
        app.activo
          ? 'Aplicacion inhabilitada correctamente. Tambien se inhabilitaron los servicios asociados.'
          : 'Aplicacion habilitada correctamente.'
      );
      subirAlInicio();
    } catch (error) {
      setMensajeError(
        error.message || 'No fue posible cambiar el estado de la aplicacion.'
      );
      subirAlInicio();
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstadoServicio = async (servicio, app) => {
    try {
      setGuardando(true);
      limpiarMensajes();

      await configuracionServicio.cambiarEstadoServicio(
        servicio.idServicio,
        !servicio.activo
      );

      setAplicacionExpandida(app.idAplicacion);
      await cargarDatos();

      setMensajeExito(
        servicio.activo
          ? 'Servicio inhabilitado correctamente.'
          : 'Servicio habilitado correctamente.'
      );
      subirAlInicio();
    } catch (error) {
      setMensajeError(
        error.message || 'No fue posible cambiar el estado del servicio.'
      );
      subirAlInicio();
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminarTipoFalla = async () => {
    if (!eliminandoTipoFalla) return;

    try {
      setGuardando(true);
      limpiarMensajes();

      await configuracionServicio.eliminarTipoFalla(
        eliminandoTipoFalla.idTipoFalla
      );

      setEliminandoTipoFalla(null);
      await cargarDatos();

      setMensajeExito('Tipo de falla eliminado correctamente.');
      subirAlInicio();
    } catch (error) {
      setMensajeError(
        error.message || 'No fue posible eliminar el tipo de falla.'
      );
      subirAlInicio();
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstadoTipoFalla = async (tipo) => {
    try {
      setGuardando(true);
      limpiarMensajes();

      await configuracionServicio.cambiarEstadoTipoFalla(
        tipo.idTipoFalla,
        !tipo.activo
      );

      await cargarDatos();

      setMensajeExito(
        tipo.activo
          ? 'Tipo de falla inhabilitado correctamente.'
          : 'Tipo de falla habilitado correctamente.'
      );
      subirAlInicio();
    } catch (error) {
      setMensajeError(
        error.message || 'No fue posible cambiar el estado del tipo de falla.'
      );
      subirAlInicio();
    } finally {
      setGuardando(false);
    }
  };

  const opcionesAplicaciones = aplicaciones.map((app) => ({
    valor: String(app.idAplicacion),
    etiqueta: app.nombreAplicacion,
  }));

  if (cargando) {
    return (
      <section className="aplicaciones-tipos">
        <p className="aplicaciones-tipos__texto-simple">
          Cargando aplicaciones, servicios y tipos de falla...
        </p>
      </section>
    );
  }

  return (
    <section className="aplicaciones-tipos" ref={inicioRef}>
      <div className="aplicaciones-tipos__encabezado">
        <button
          type="button"
          className="aplicaciones-tipos__volver"
          onClick={onVolver}
        >
          ←
        </button>

        <div className="aplicaciones-tipos__titulo">
          <h1>
            Aplicaciones-Servicios<span>/Tipos de falla</span>
          </h1>

          <p>
            Administra las aplicaciones, sus servicios asociados y los tipos de
            falla utilizados durante el registro de incidentes.
          </p>
        </div>
      </div>

      {mensajeError && (
        <div className="configuracion__alerta configuracion__alerta--error">
          {mensajeError}
          <button
            type="button"
            className="configuracion__alerta-cerrar"
            onClick={() => setMensajeError('')}
            aria-label="Cerrar mensaje"
          >
            ×
          </button>
        </div>
      )}

      {mensajeExito && (
        <div className="configuracion__alerta configuracion__alerta--exito">
          {mensajeExito}
          <button
            type="button"
            className="configuracion__alerta-cerrar"
            onClick={() => setMensajeExito('')}
            aria-label="Cerrar mensaje"
          >
            ×
          </button>
        </div>
      )}

      <div className="aplicaciones-tipos__layout">
        <div className="aplicaciones-tipos__contenido">
          <div className="aplicaciones-tipos__card">
            <div className="aplicaciones-tipos__header">
              <div>
                <h2>Aplicaciones</h2>
                <p>{aplicacionesFiltradas.length} resultados</p>
              </div>

              <div className="aplicaciones-tipos__header-derecha">
                <div className="aplicaciones-tipos__buscador">
                  <input
                    type="text"
                    placeholder="Buscar aplicación..."
                    value={busquedaAplicacion}
                    onChange={(evento) => {
                      setBusquedaAplicacion(evento.target.value);
                      setPaginaAplicaciones(1);
                    }}
                  />

                  {busquedaAplicacion.trim().length > 0 && (
                    <button
                      type="button"
                      className="aplicaciones-tipos__limpiar-busqueda"
                      onClick={() => {
                        setBusquedaAplicacion('');
                        setPaginaAplicaciones(1);
                      }}
                      aria-label="Limpiar busqueda de aplicaciones"
                    >
                      ×
                    </button>
                  )}
                </div>

                {totalPaginasAplicaciones > 1 && (
                  <Paginacion
                    paginaActual={paginaAplicaciones}
                    totalPaginas={totalPaginasAplicaciones}
                    onCambiarPagina={setPaginaAplicaciones}
                    className="aplicaciones-tipos__paginacion-mini"
                  />
                )}              </div>
            </div>

            <div className="aplicaciones-tipos__tabla-contenedor">
              <table className="aplicaciones-tipos__tabla">
                <thead>
                  <tr>
                    <th>Aplicación</th>
                    <th>Servicios asociados</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {aplicacionesVisibles.map((app) => (
                    <Fragment key={app.idAplicacion}>
                      <tr>
                        <td>
                          <button
                            type="button"
                            className="aplicaciones-tipos__expandir"
                            onClick={() => alternarAplicacion(app.idAplicacion)}
                          >
                            {aplicacionExpandida === app.idAplicacion
                              ? '⌄'
                              : '›'}
                          </button>

                          <strong>{app.nombreAplicacion}</strong>
                        </td>

                        <td>
                          <span className="aplicaciones-tipos__badge">
                            {(app.servicios || []).length} servicios
                          </span>
                        </td>

                        <td>
                          <span
                            className={`aplicaciones-tipos__estado ${
                              app.activo
                                ? 'aplicaciones-tipos__estado--activo'
                                : 'aplicaciones-tipos__estado--inactivo'
                            }`}
                          >
                            {app.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>

                        <td>
                          <div className="aplicaciones-tipos__acciones">
                            <button
                              type="button"
                              onClick={() => prepararEditarAplicacion(app)}
                              disabled={guardando}
                            >
                              Editar
                            </button>

                            <button
                              type="button"
                              className="aplicaciones-tipos__accion-estado"
                              onClick={() => cambiarEstadoAplicacion(app)}
                              disabled={guardando}
                            >
                              {app.activo ? 'Inhabilitar' : 'Habilitar'}
                            </button>

                            <button
                              type="button"
                              className="aplicaciones-tipos__accion-eliminar"
                              onClick={() => prepararEliminarAplicacion(app)}
                              disabled={guardando}
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>

                      {aplicacionExpandida === app.idAplicacion && (
                        <tr className="aplicaciones-tipos__fila-expandida">
                          <td colSpan="4">
                            <div className="aplicaciones-tipos__servicios-expandido">
                              {(app.servicios || []).length === 0 ? (
                                <p className="aplicaciones-tipos__texto-simple">
                                  Esta aplicacion no tiene servicios asociados.
                                </p>
                              ) : (
                                <div className="aplicaciones-tipos__servicios-lista">
                                  {app.servicios.map((servicio) => (
                                    <div
                                      key={servicio.idServicio}
                                      className="aplicaciones-tipos__servicio-item"
                                    >
                                      <span className="aplicaciones-tipos__servicio-nombre">
                                        {servicio.nombreServicio}
                                        <span
                                          className={`aplicaciones-tipos__estado aplicaciones-tipos__estado--servicio ${
                                            servicio.activo
                                              ? 'aplicaciones-tipos__estado--activo'
                                              : 'aplicaciones-tipos__estado--inactivo'
                                          }`}
                                        >
                                          {servicio.activo ? 'Activo' : 'Inhabilitado'}
                                        </span>
                                      </span>

                                      <div className="aplicaciones-tipos__acciones">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            prepararEditarServicio(servicio, app)
                                          }
                                          disabled={guardando}
                                        >
                                          Editar
                                        </button>

                                        <button
                                          type="button"
                                          className="aplicaciones-tipos__accion-estado"
                                          onClick={() =>
                                            cambiarEstadoServicio(servicio, app)
                                          }
                                          disabled={guardando || (!servicio.activo && !app.activo)}
                                        >
                                          {servicio.activo ? 'Inhabilitar' : 'Habilitar'}
                                        </button>

                                        <button
                                          type="button"
                                          className="aplicaciones-tipos__accion-eliminar"
                                          onClick={() =>
                                            prepararEliminarServicio(servicio, app)
                                          }
                                          disabled={guardando}
                                        >
                                          Eliminar
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}

                  {aplicacionesFiltradas.length === 0 && (
                    <tr>
                      <td colSpan="3">
                        <p className="aplicaciones-tipos__sin-datos">
                          No se encontraron aplicaciones ni servicios.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="aplicaciones-tipos__card">
            <div className="aplicaciones-tipos__header">
              <div>
                <h2>Tipos de falla</h2>
                <p>{tiposFiltrados.length} resultados</p>
              </div>

              <div className="aplicaciones-tipos__header-derecha">
                <div className="aplicaciones-tipos__buscador">
                  <input
                    type="text"
                    placeholder="Buscar tipo..."
                    value={busquedaTipo}
                    onChange={(evento) => {
                      setBusquedaTipo(evento.target.value);
                      setPaginaTipos(1);
                    }}
                  />

                  {busquedaTipo.trim().length > 0 && (
                    <button
                      type="button"
                      className="aplicaciones-tipos__limpiar-busqueda"
                      onClick={() => {
                        setBusquedaTipo('');
                        setPaginaTipos(1);
                      }}
                      aria-label="Limpiar busqueda de tipos de falla"
                    >
                      ×
                    </button>
                  )}
                </div>

                {totalPaginasTipos > 1 && (
                  <Paginacion
                    paginaActual={paginaTipos}
                    totalPaginas={totalPaginasTipos}
                    onCambiarPagina={setPaginaTipos}
                    className="aplicaciones-tipos__paginacion-mini"
                  />
                )}              </div>
            </div>

            <div className="aplicaciones-tipos__tabla-contenedor">
              <table className="aplicaciones-tipos__tabla">
                <thead>
                  <tr>
                    <th>Tipo de falla</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {tiposVisibles.map((tipo) => (
                    <tr key={tipo.idTipoFalla}>
                      <td>
                        <strong>{tipo.nombreTipo}</strong>
                      </td>

                      <td>
                        <span
                          className={`aplicaciones-tipos__estado ${
                            tipo.activo
                              ? 'aplicaciones-tipos__estado--activo'
                              : 'aplicaciones-tipos__estado--inactivo'
                          }`}
                        >
                          {tipo.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>

                      <td>
                        <div className="aplicaciones-tipos__acciones">
                          <button
                            type="button"
                            onClick={() => prepararEditarTipoFalla(tipo)}
                            disabled={guardando}
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            className="aplicaciones-tipos__accion-estado"
                            onClick={() => cambiarEstadoTipoFalla(tipo)}
                            disabled={guardando}
                          >
                            {tipo.activo ? 'Inhabilitar' : 'Habilitar'}
                          </button>

                          <button
                            type="button"
                            className="aplicaciones-tipos__accion-eliminar"
                            onClick={() => prepararEliminarTipoFalla(tipo)}
                            disabled={guardando}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {tiposFiltrados.length === 0 && (
                    <tr>
                      <td colSpan="3">
                        <p className="aplicaciones-tipos__sin-datos">
                          No se encontraron tipos de falla.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="aplicaciones-tipos__sidebar">
          <form
            onSubmit={editandoServicio ? guardarServicio : guardarAplicacion}
            className={`aplicaciones-tipos__form ${
              editandoAplicacion || editandoServicio
                ? 'aplicaciones-tipos__form--editando'
                : ''
            } ${
              eliminandoAplicacion || eliminandoServicio
                ? 'aplicaciones-tipos__form--eliminar'
                : ''
            }`}
          >
            {eliminandoAplicacion ? (
              <>
                <h2>Eliminar aplicación</h2>

                <p>
                  ¿Estás seguro de eliminar la aplicación{' '}
                  <strong>{eliminandoAplicacion.nombreAplicacion}</strong>?
                </p>

                <div className="aplicaciones-tipos__acciones-form">
                  <button
                    type="button"
                    className="aplicaciones-tipos__boton-eliminar"
                    onClick={confirmarEliminarAplicacion}
                    disabled={guardando}
                  >
                    {guardando ? 'Eliminando...' : 'Eliminar'}
                  </button>

                  <button
                    type="button"
                    className="aplicaciones-tipos__boton-secundario"
                    onClick={cancelarEliminarAplicacion}
                    disabled={guardando}
                  >
                    Cancelar
                  </button>
                </div>
              </>
            ) : eliminandoServicio ? (
              <>
                <h2>Eliminar servicio</h2>

                <p>
                  ¿Estás seguro de eliminar el servicio{' '}
                  <strong>{eliminandoServicio.nombreServicio}</strong> de{' '}
                  <strong>{eliminandoServicio.nombreAplicacion}</strong>?
                </p>

                <div className="aplicaciones-tipos__acciones-form">
                  <button
                    type="button"
                    className="aplicaciones-tipos__boton-eliminar"
                    onClick={confirmarEliminarServicio}
                    disabled={guardando}
                  >
                    {guardando ? 'Eliminando...' : 'Eliminar'}
                  </button>

                  <button
                    type="button"
                    className="aplicaciones-tipos__boton-secundario"
                    onClick={cancelarEliminarServicio}
                    disabled={guardando}
                  >
                    Cancelar
                  </button>
                </div>
              </>
            ) : editandoServicio ? (
              <>
                <h2>Editar servicio</h2>

                <p>
                  Actualiza el nombre del servicio seleccionado.
                </p>

                <label>Aplicacion asociada</label>

                <div className="aplicaciones-tipos__campo-solo-lectura">
                  {editandoServicio.nombreAplicacion ||
                    'Sin aplicacion asociada'}
                </div>

                <label htmlFor="nombreServicioPrincipal">
                  Nombre del servicio
                </label>

                <input
                  id="nombreServicioPrincipal"
                  type="text"
                  value={formServicio.nombre}
                  placeholder="Ej: Portal transaccional"
                  onChange={(evento) =>
                    setFormServicio((prev) => ({
                      ...prev,
                      nombre: evento.target.value,
                    }))
                  }
                />

                <div className="aplicaciones-tipos__acciones-form">
                  <button type="submit" disabled={guardando}>
                    {guardando
                      ? 'Guardando...'
                      : servicioSinCambios
                        ? 'Guardar sin cambios'
                        : 'Guardar cambios'}
                  </button>

                  <button
                    type="button"
                    className="aplicaciones-tipos__boton-secundario"
                    onClick={cancelarEdicionServicio}
                    disabled={guardando}
                  >
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2>
                  {editandoAplicacion
                    ? 'Editar aplicación'
                    : 'Crear aplicación'}
                </h2>

                <p>
                  Registra o actualiza las aplicaciones disponibles para los
                  incidentes.
                </p>

                <label htmlFor="nombreAplicacion">
                  Nombre de la aplicación
                </label>

                <input
                  id="nombreAplicacion"
                  type="text"
                  value={formAplicacion.nombre}
                  placeholder="Ej: Poliedro"
                  onChange={(evento) =>
                    setFormAplicacion((prev) => ({
                      ...prev,
                      nombre: evento.target.value,
                    }))
                  }
                />

                {!editandoAplicacion && (
                  <div className="aplicaciones-tipos__editar-servicios">
                    <div className="aplicaciones-tipos__servicios-header">
                      <label>Servicios asociados</label>

                      <button
                        type="button"
                        className="aplicaciones-tipos__boton-agregar"
                        onClick={agregarNuevoServicioAplicacion}
                        disabled={guardando}
                      >
                        + Agregar servicio
                      </button>
                    </div>

                    {formAplicacion.nuevosServicios.map((servicio, index) => (
                      <div
                        key={index}
                        className="aplicaciones-tipos__servicio-campo"
                      >
                        <input
                          type="text"
                          value={servicio}
                          placeholder={`Ej: Servicio ${index + 1}`}
                          onChange={(evento) =>
                            cambiarNuevoServicioAplicacion(
                              index,
                              evento.target.value
                            )
                          }
                        />

                        <button
                          type="button"
                          className="aplicaciones-tipos__boton-quitar"
                          onClick={() =>
                            eliminarNuevoServicioAplicacion(index)
                          }
                          disabled={guardando}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {editandoAplicacion && (
                  <>
                    <div className="aplicaciones-tipos__servicios-header">
                      <button
                        type="button"
                        className="aplicaciones-tipos__boton-agregar"
                        onClick={() =>
                          setMostrarNuevosServicios((valorActual) => !valorActual)
                        }
                        disabled={guardando}
                      >
                        {mostrarNuevosServicios
                          ? 'Ocultar servicios'
                          : '+ Agregar servicio'}
                      </button>
                    </div>

                    {mostrarNuevosServicios && (
                      <div className="aplicaciones-tipos__editar-servicios">
                        <div className="aplicaciones-tipos__servicios-header">
                          <label>Nuevos servicios</label>

                          <button
                            type="button"
                            className="aplicaciones-tipos__boton-agregar"
                            onClick={agregarNuevoServicioAplicacion}
                            disabled={guardando}
                          >
                            + Agregar otro
                          </button>
                        </div>

                        {formAplicacion.nuevosServicios.map((servicio, index) => (
                          <div
                            key={index}
                            className="aplicaciones-tipos__servicio-campo"
                          >
                            <input
                              type="text"
                              value={servicio}
                              placeholder={`Nuevo servicio ${index + 1}`}
                              onChange={(evento) =>
                                cambiarNuevoServicioAplicacion(
                                  index,
                                  evento.target.value
                                )
                              }
                            />

                            <button
                              type="button"
                              className="aplicaciones-tipos__boton-quitar"
                              onClick={() =>
                                eliminarNuevoServicioAplicacion(index)
                              }
                              disabled={guardando}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                <div className="aplicaciones-tipos__acciones-form">
                  <button
                    type="submit"
                    disabled={guardando}
                  >
                    {guardando
                      ? 'Guardando...'
                      : editandoAplicacion
                        ? aplicacionSinCambios
                          ? 'Guardar sin cambios'
                          : 'Guardar cambios'
                        : 'Guardar'}
                  </button>

                  {mostrarLimpiarAplicacion && !editandoAplicacion && (
                    <button
                      type="button"
                      className="aplicaciones-tipos__boton-secundario"
                      onClick={limpiarFormularioAplicacion}
                      disabled={guardando}
                    >
                      Limpiar
                    </button>
                  )}

                  {editandoAplicacion && (
                    <button
                      type="button"
                      className="aplicaciones-tipos__boton-secundario"
                      onClick={cancelarEdicionAplicacion}
                      disabled={guardando}
                    >
                      Cancelar
                    </button>
                  )}

                </div>
              </>
            )}
          </form>

          {false && eliminandoServicio && (
            <form
              onSubmit={guardarServicio}
              className="aplicaciones-tipos__form aplicaciones-tipos__form--eliminar"
            >
              <>
                <h2>Eliminar servicio</h2>

                <p>
                  ¿Estás seguro de eliminar el servicio{' '}
                  <strong>{eliminandoServicio.nombreServicio}</strong> de{' '}
                  <strong>{eliminandoServicio.nombreAplicacion}</strong>?
                </p>

                <div className="aplicaciones-tipos__acciones-form">
                  <button
                    type="button"
                    className="aplicaciones-tipos__boton-eliminar"
                    onClick={confirmarEliminarServicio}
                    disabled={guardando}
                  >
                    {guardando ? 'Eliminando...' : 'Eliminar'}
                  </button>

                  <button
                    type="button"
                    className="aplicaciones-tipos__boton-secundario"
                    onClick={cancelarEliminarServicio}
                    disabled={guardando}
                  >
                    Cancelar
                  </button>
                </div>
              </>
            </form>
          )}

          <form
            onSubmit={guardarTipoFalla}
            className={`aplicaciones-tipos__form ${
              editandoTipoFalla ? 'aplicaciones-tipos__form--editando' : ''
            } ${eliminandoTipoFalla ? 'aplicaciones-tipos__form--eliminar' : ''}`}
          >
            {eliminandoTipoFalla ? (
              <>
                <h2>Eliminar tipo de falla</h2>

                <p>
                  ¿Estás seguro de eliminar el tipo de falla{' '}
                  <strong>{eliminandoTipoFalla.nombreTipo}</strong>?
                </p>

                <div className="aplicaciones-tipos__acciones-form">
                  <button
                    type="button"
                    className="aplicaciones-tipos__boton-eliminar"
                    onClick={confirmarEliminarTipoFalla}
                    disabled={guardando}
                  >
                    {guardando ? 'Eliminando...' : 'Eliminar'}
                  </button>

                  <button
                    type="button"
                    className="aplicaciones-tipos__boton-secundario"
                    onClick={cancelarEliminarTipoFalla}
                    disabled={guardando}
                  >
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2>
                  {editandoTipoFalla
                    ? 'Editar tipo de falla'
                    : 'Crear tipo de falla'}
                </h2>

                <p>
                  Registra o actualiza los tipos de falla disponibles para los
                  incidentes.
                </p>

                <label htmlFor="nombreTipoFalla">
                  Nombre del tipo de falla
                </label>

                <input
                  id="nombreTipoFalla"
                  type="text"
                  value={formTipoFalla.nombre}
                  placeholder="Ej: Lentitud en aplicación"
                  onChange={(evento) =>
                    setFormTipoFalla({
                      nombre: evento.target.value,
                    })
                  }
                />

                <div className="aplicaciones-tipos__acciones-form">
                  <button
                    type="submit"
                    disabled={guardando}
                  >
                    {guardando
                      ? 'Guardando...'
                      : editandoTipoFalla
                        ? tipoFallaSinCambios
                          ? 'Guardar sin cambios'
                          : 'Guardar cambios'
                        : 'Guardar'}
                  </button>

                  {mostrarLimpiarTipoFalla && !editandoTipoFalla && (
                    <button
                      type="button"
                      className="aplicaciones-tipos__boton-secundario"
                      onClick={limpiarFormularioTipoFalla}
                      disabled={guardando}
                    >
                      Limpiar
                    </button>
                  )}

                  {editandoTipoFalla && (
                    <button
                      type="button"
                      className="aplicaciones-tipos__boton-secundario"
                      onClick={cancelarEdicionTipoFalla}
                      disabled={guardando}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </>
            )}
          </form>
        </aside>
      </div>
    </section>
  );
}

export default AplicacionesTipos;
