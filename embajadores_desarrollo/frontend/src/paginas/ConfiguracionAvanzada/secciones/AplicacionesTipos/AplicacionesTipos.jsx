import { useEffect, useMemo, useState } from 'react';

import configuracionServicio from '../../../../services/configuracionServicio';

import './AplicacionesTipos.css';

const FORM_INICIAL = {
  nombre: '',
};

const ELEMENTOS_POR_PAGINA = 4;

function AplicacionesTipos({ onVolver }) {
  const [aplicaciones, setAplicaciones] = useState([]);
  const [tiposFalla, setTiposFalla] = useState([]);

  const [busquedaAplicacion, setBusquedaAplicacion] = useState('');
  const [busquedaTipo, setBusquedaTipo] = useState('');

  const [paginaAplicaciones, setPaginaAplicaciones] = useState(1);
  const [paginaTipos, setPaginaTipos] = useState(1);

  const [formAplicacion, setFormAplicacion] = useState(FORM_INICIAL);
  const [formTipoFalla, setFormTipoFalla] = useState(FORM_INICIAL);

  const [editandoAplicacion, setEditandoAplicacion] = useState(null);
  const [editandoTipoFalla, setEditandoTipoFalla] = useState(null);

  const [eliminandoAplicacion, setEliminandoAplicacion] = useState(null);
  const [eliminandoTipoFalla, setEliminandoTipoFalla] = useState(null);

  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);

  const [mensajeError, setMensajeError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');

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

    return aplicaciones.filter((app) =>
      app.nombreAplicacion.toLowerCase().includes(texto)
    );
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

  const guardarAplicacion = async (evento) => {
    evento.preventDefault();

    const nombre = formAplicacion.nombre.trim();

    if (!nombre) {
      setMensajeError('El nombre de la aplicación es obligatorio.');
      return;
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
      } else {
        await configuracionServicio.crearAplicacion(nombre);
        setMensajeExito('Aplicación creada correctamente.');
      }

      setFormAplicacion(FORM_INICIAL);
      setEditandoAplicacion(null);
      setEliminandoAplicacion(null);

      await cargarDatos();
    } catch (error) {
      setMensajeError(error.message || 'No fue posible guardar la aplicación.');
    } finally {
      setGuardando(false);
    }
  };

  const guardarTipoFalla = async (evento) => {
    evento.preventDefault();

    const nombre = formTipoFalla.nombre.trim();

    if (!nombre) {
      setMensajeError('El nombre del tipo de falla es obligatorio.');
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
      } else {
        await configuracionServicio.crearTipoFalla(nombre);
        setMensajeExito('Tipo de falla creado correctamente.');
      }

      setFormTipoFalla(FORM_INICIAL);
      setEditandoTipoFalla(null);
      setEliminandoTipoFalla(null);

      await cargarDatos();
    } catch (error) {
      setMensajeError(
        error.message || 'No fue posible guardar el tipo de falla.'
      );
    } finally {
      setGuardando(false);
    }
  };

  const prepararEditarAplicacion = (app) => {
    limpiarMensajes();

    setEditandoAplicacion(app);
    setEditandoTipoFalla(null);
    setEliminandoAplicacion(null);
    setEliminandoTipoFalla(null);

    setFormAplicacion({
      nombre: app.nombreAplicacion,
    });
  };

  const prepararEditarTipoFalla = (tipo) => {
    limpiarMensajes();

    setEditandoTipoFalla(tipo);
    setEditandoAplicacion(null);
    setEliminandoAplicacion(null);
    setEliminandoTipoFalla(null);

    setFormTipoFalla({
      nombre: tipo.nombreTipo,
    });
  };

  const prepararEliminarAplicacion = (app) => {
    limpiarMensajes();

    setEliminandoAplicacion(app);
    setEliminandoTipoFalla(null);
    setEditandoAplicacion(null);
    setEditandoTipoFalla(null);

    setFormAplicacion(FORM_INICIAL);
  };

  const prepararEliminarTipoFalla = (tipo) => {
    limpiarMensajes();

    setEliminandoTipoFalla(tipo);
    setEliminandoAplicacion(null);
    setEditandoAplicacion(null);
    setEditandoTipoFalla(null);

    setFormTipoFalla(FORM_INICIAL);
  };

  const cancelarEdicionAplicacion = () => {
    setEditandoAplicacion(null);
    setFormAplicacion(FORM_INICIAL);
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
    } catch (error) {
      setMensajeError(error.message || 'No fue posible eliminar la aplicación.');
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
    } catch (error) {
      setMensajeError(
        error.message || 'No fue posible eliminar el tipo de falla.'
      );
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <section className="aplicaciones-tipos">
        <p className="aplicaciones-tipos__texto-simple">
          Cargando aplicaciones y tipos de falla...
        </p>
      </section>
    );
  }

  return (
    <section className="aplicaciones-tipos">
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
            Aplicaciones <span>/ Tipos de falla</span>
          </h1>

          <p>
            Administra las aplicaciones y tipos de falla utilizados durante el
            registro de incidentes.
          </p>
        </div>
      </div>

      {mensajeError && (
        <div className="configuracion__alerta configuracion__alerta--error">
          {mensajeError}
        </div>
      )}

      {mensajeExito && (
        <div className="configuracion__alerta configuracion__alerta--exito">
          {mensajeExito}
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
                <input
                  type="text"
                  placeholder="Buscar aplicación..."
                  value={busquedaAplicacion}
                  onChange={(evento) => {
                    setBusquedaAplicacion(evento.target.value);
                    setPaginaAplicaciones(1);
                  }}
                />

                {totalPaginasAplicaciones > 1 && (
                  <div className="aplicaciones-tipos__paginacion-mini">
                    <button
                      type="button"
                      onClick={() =>
                        setPaginaAplicaciones((prev) =>
                          Math.max(prev - 1, 1)
                        )
                      }
                      disabled={paginaAplicaciones === 1}
                    >
                      ←
                    </button>

                    <span>
                      {paginaAplicaciones}/{totalPaginasAplicaciones}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setPaginaAplicaciones((prev) =>
                          Math.min(prev + 1, totalPaginasAplicaciones)
                        )
                      }
                      disabled={
                        paginaAplicaciones === totalPaginasAplicaciones
                      }
                    >
                      →
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="aplicaciones-tipos__tabla-contenedor">
              <table className="aplicaciones-tipos__tabla">
                <thead>
                  <tr>
                    <th>Aplicación</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {aplicacionesVisibles.map((app) => (
                    <tr key={app.idAplicacion}>
                      <td>
                        <strong>{app.nombreAplicacion}</strong>
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
                            className="aplicaciones-tipos__accion-eliminar"
                            onClick={() => prepararEliminarAplicacion(app)}
                            disabled={guardando}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {aplicacionesFiltradas.length === 0 && (
                    <tr>
                      <td colSpan="2">
                        <p className="aplicaciones-tipos__sin-datos">
                          No se encontraron aplicaciones.
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
                <input
                  type="text"
                  placeholder="Buscar tipo..."
                  value={busquedaTipo}
                  onChange={(evento) => {
                    setBusquedaTipo(evento.target.value);
                    setPaginaTipos(1);
                  }}
                />

                {totalPaginasTipos > 1 && (
                  <div className="aplicaciones-tipos__paginacion-mini">
                    <button
                      type="button"
                      onClick={() =>
                        setPaginaTipos((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={paginaTipos === 1}
                    >
                      ←
                    </button>

                    <span>
                      {paginaTipos}/{totalPaginasTipos}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setPaginaTipos((prev) =>
                          Math.min(prev + 1, totalPaginasTipos)
                        )
                      }
                      disabled={paginaTipos === totalPaginasTipos}
                    >
                      →
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="aplicaciones-tipos__tabla-contenedor">
              <table className="aplicaciones-tipos__tabla">
                <thead>
                  <tr>
                    <th>Tipo de falla</th>
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
                      <td colSpan="2">
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
            onSubmit={guardarAplicacion}
            className={`aplicaciones-tipos__form ${
              editandoAplicacion ? 'aplicaciones-tipos__form--editando' : ''
            } ${eliminandoAplicacion ? 'aplicaciones-tipos__form--eliminar' : ''}`}
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
                    setFormAplicacion({
                      nombre: evento.target.value,
                    })
                  }
                />

                <div className="aplicaciones-tipos__acciones-form">
                  <button type="submit" disabled={guardando}>
                    {guardando
                      ? 'Guardando...'
                      : editandoAplicacion
                        ? 'Guardar cambios'
                        : 'Guardar'}
                  </button>

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
                  <button type="submit" disabled={guardando}>
                    {guardando
                      ? 'Guardando...'
                      : editandoTipoFalla
                        ? 'Guardar cambios'
                        : 'Guardar'}
                  </button>

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