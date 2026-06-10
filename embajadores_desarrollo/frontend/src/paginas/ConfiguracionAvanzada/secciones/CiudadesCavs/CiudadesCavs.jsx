import { useEffect, useMemo, useRef, useState } from 'react';

import configuracionServicio from '../../../../services/configuracionServicio';

import './CiudadesCavs.css';

const FORM_CIUDAD_INICIAL = {
  nombre: '',
  cavs: [''],
  nuevosCavs: [''],
};

const FORM_CAV_INICIAL = {
  nombre: '',
  ciudadId: '',
};

const ELEMENTOS_POR_PAGINA = 5;

function CiudadesCavs({ onVolver }) {
  const [ciudades, setCiudades] = useState([]);

  const [busquedaCiudad, setBusquedaCiudad] = useState('');
  const [paginaCiudades, setPaginaCiudades] = useState(1);
  const [ciudadExpandida, setCiudadExpandida] = useState(null);

  const [formCiudad, setFormCiudad] = useState(FORM_CIUDAD_INICIAL);
  const [formCav, setFormCav] = useState(FORM_CAV_INICIAL);

  const [editandoCiudad, setEditandoCiudad] = useState(null);
  const [editandoCav, setEditandoCav] = useState(null);

  const [eliminandoCiudad, setEliminandoCiudad] = useState(null);
  const [eliminandoCav, setEliminandoCav] = useState(null);

  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);

  const [mensajeError, setMensajeError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');

  const inicioRef = useRef(null);

  const subirAlInicio = () => {
    setTimeout(() => {
      inicioRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      setMensajeError('');

      const ciudadesRespuesta = await configuracionServicio.listarCiudades();

      setCiudades(ciudadesRespuesta);
    } catch (error) {
      setMensajeError(
        error.message || 'No fue posible cargar ciudades y CAVs.'
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

  const opcionesCiudades = ciudades.map((ciudad) => ({
    valor: ciudad.idCiudad,
    etiqueta: ciudad.nombreCiudad,
  }));

  const ciudadesFiltradas = useMemo(() => {
    const texto = busquedaCiudad.trim().toLowerCase();

    if (!texto) return ciudades;

    return ciudades.filter((ciudad) => {
      const coincideCiudad = ciudad.nombreCiudad
        .toLowerCase()
        .includes(texto);

      const coincideCav = ciudad.cavs.some((cav) =>
        cav.nombreCav.toLowerCase().includes(texto)
      );

      return coincideCiudad || coincideCav;
    });
  }, [ciudades, busquedaCiudad]);

  const totalPaginasCiudades = Math.max(
    1,
    Math.ceil(ciudadesFiltradas.length / ELEMENTOS_POR_PAGINA)
  );

  const ciudadesVisibles = useMemo(() => {
    const inicio = (paginaCiudades - 1) * ELEMENTOS_POR_PAGINA;
    const fin = inicio + ELEMENTOS_POR_PAGINA;

    return ciudadesFiltradas.slice(inicio, fin);
  }, [ciudadesFiltradas, paginaCiudades]);

  const alternarCiudad = (idCiudad) => {
    setCiudadExpandida((prev) => (prev === idCiudad ? null : idCiudad));
  };

  const guardarCiudad = async (evento) => {
    evento.preventDefault();

    const nombre = formCiudad.nombre.trim();

    if (!nombre) {
      setMensajeError('El nombre de la ciudad es obligatorio.');
      subirAlInicio();
      return;
    }

    try {
      setGuardando(true);
      limpiarMensajes();

     if (editandoCiudad) {
      await configuracionServicio.actualizarCiudad(
        editandoCiudad.idCiudad,
        nombre
      );

      const nuevosCavsLimpios = formCiudad.nuevosCavs
        .map((cav) => cav.trim())
        .filter(Boolean);

      for (const nuevoCav of nuevosCavsLimpios) {
        await configuracionServicio.crearCav(
          nuevoCav,
          editandoCiudad.idCiudad
        );
      }

      setMensajeExito('Ciudad y CAVs actualizados correctamente.');
      subirAlInicio();
      }  else {
        const cavsLimpios = formCiudad.cavs
          .map((cav) => cav.trim())
          .filter(Boolean);

        if (cavsLimpios.length === 0) {
          setMensajeError('Agrega al menos un CAV para crear la ciudad.');
          subirAlInicio();
          return;
        }

        const cavsDuplicados = cavsLimpios.some(
          (cav, index) =>
            cavsLimpios.findIndex(
              (item) => item.toLowerCase() === cav.toLowerCase()
            ) !== index
        );

        if (cavsDuplicados) {
          setMensajeError('No puedes agregar CAVs duplicados.');
          subirAlInicio();
          return;
        }

        const cavsValidos = formCiudad.cavs
          .map((cav) => cav.trim())
          .filter(Boolean);

        if (!editandoCiudad && cavsValidos.length === 0) {
          setMensajeError(
            'Debe registrar al menos un CAV para crear la ciudad.'
          );
          subirAlInicio();
          return;
        }

        await configuracionServicio.crearCiudadCompleta(nombre, cavsLimpios);
        setMensajeExito('Ciudad y CAVs creados correctamente.');
        subirAlInicio();
      }

      setFormCiudad(FORM_CIUDAD_INICIAL);
      setEditandoCiudad(null);
      setEliminandoCiudad(null);

      await cargarDatos();
    } catch (error) {
      setMensajeError(error.message || 'No fue posible guardar la ciudad.');
      subirAlInicio();
    } finally {
      setGuardando(false);
    }
  };

  const guardarCav = async (evento) => {
    evento.preventDefault();

    const nombre = formCav.nombre.trim();

    if (!nombre || !formCav.ciudadId) {
      setMensajeError('Completa el nombre del CAV y selecciona una ciudad.');
      subirAlInicio();
      return;
    }

    try {
      setGuardando(true);
      limpiarMensajes();

      if (editandoCav) {
        await configuracionServicio.actualizarCav(
          editandoCav.idCav,
          nombre,
          formCav.ciudadId
        );

        setMensajeExito('CAV actualizado correctamente.');
        subirAlInicio();
      } else {
        await configuracionServicio.crearCav(nombre, formCav.ciudadId);
        setMensajeExito('CAV creado correctamente.');
        subirAlInicio();
      }

      setFormCav(FORM_CAV_INICIAL);
      setEditandoCav(null);
      setEliminandoCav(null);

      await cargarDatos();
    } catch (error) {
      setMensajeError(error.message || 'No fue posible guardar el CAV.');
      subirAlInicio();
    } finally {
      setGuardando(false);
    }
  };

  const agregarCavCiudad = () => {
  setFormCiudad((prev) => ({
    ...prev,
    cavs: [...prev.cavs, ''],
  }));
};

  const cambiarCavCiudad = (index, valor) => {
    setFormCiudad((prev) => ({
      ...prev,
      cavs: prev.cavs.map((cav, posicion) =>
        posicion === index ? valor : cav
      ),
    }));
  };

  const eliminarCavCiudad = (index) => {
    setFormCiudad((prev) => ({
      ...prev,
      cavs:
        prev.cavs.length > 1
          ? prev.cavs.filter((_, posicion) => posicion !== index)
          : [''],
    }));
  };

  const cambiarNuevoCavCiudad = (index, valor) => {
    setFormCiudad((prev) => ({
      ...prev,
      nuevosCavs: prev.nuevosCavs.map((cav, posicion) =>
        posicion === index ? valor : cav
      ),
    }));
  };

  const agregarNuevoCavCiudad = () => {
    setFormCiudad((prev) => ({
      ...prev,
      nuevosCavs: [...prev.nuevosCavs, ''],
    }));
  };

  const eliminarNuevoCavCiudad = (index) => {
    setFormCiudad((prev) => ({
      ...prev,
      nuevosCavs:
        prev.nuevosCavs.length > 1
          ? prev.nuevosCavs.filter((_, posicion) => posicion !== index)
          : [''],
    }));
  };

  const prepararEditarCiudad = (ciudad) => {
    limpiarMensajes();

    setEditandoCiudad(ciudad);
    setEditandoCav(null);
    setEliminandoCiudad(null);
    setEliminandoCav(null);

    setFormCiudad({
      nombre: ciudad.nombreCiudad,
      cavs: [''],
      cavSeleccionadoId: ciudad.cavs?.[0]?.idCav || '',
      cavSeleccionadoNombre: ciudad.cavs?.[0]?.nombreCav || '',
      nuevosCavs: [''],
    });
  };

  const prepararEditarCav = (cav, ciudad) => {
    limpiarMensajes();

    setEditandoCav({
      ...cav,
      ciudadId: ciudad.idCiudad,
      ciudadNombre: ciudad.nombreCiudad,
    });

    setEditandoCiudad(null);
    setEliminandoCiudad(null);
    setEliminandoCav(null);

    setFormCav({
      nombre: cav.nombreCav,
      ciudadId: ciudad.idCiudad,
    });
  };

  const prepararEliminarCiudad = (ciudad) => {
    limpiarMensajes();

    setEliminandoCiudad(ciudad);
    setEliminandoCav(null);
    setEditandoCiudad(null);
    setEditandoCav(null);

    setFormCiudad(FORM_CIUDAD_INICIAL);
  };

  const prepararEliminarCav = (cav, ciudad) => {
     const ciudadDelCav = ciudades.find(
      (ciudad) => Number(ciudad.idCiudad) === Number(cav.ciudadId)
    );

    if (ciudadDelCav?.cavs?.length === 1) {
      setEditandoCiudad(null);
      setEditandoCav(null);
      setEliminandoCav(null);
      setEliminandoCiudad(ciudadDelCav);
      return;
    }

    setEditandoCav(null);
    setEditandoCiudad(null);
    setEliminandoCiudad(null);
    setEliminandoCav(cav);
  };

  const cancelarEdicionCiudad = () => {
    setEditandoCiudad(null);
    setFormCiudad(FORM_CIUDAD_INICIAL);
    limpiarMensajes();
  };

  const cancelarEdicionCav = () => {
    setEditandoCav(null);
    setFormCav(FORM_CAV_INICIAL);
    limpiarMensajes();
  };

  const confirmarEliminarCiudad = async () => {
    if (!eliminandoCiudad) return;

    try {
      setGuardando(true);
      limpiarMensajes();

      await configuracionServicio.eliminarCiudad(eliminandoCiudad.idCiudad);

      setEliminandoCiudad(null);
      await cargarDatos();

      setMensajeExito('Ciudad eliminada correctamente.');
      subirAlInicio();
    } catch (error) {
      setMensajeError(error.message || 'No fue posible eliminar la ciudad.');
      subirAlInicio();
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminarCav = async () => {
    if (!eliminandoCav) return;

    try {
      setGuardando(true);
      limpiarMensajes();

      await configuracionServicio.eliminarCav(eliminandoCav.idCav);

      setEliminandoCav(null);
      await cargarDatos();

      setMensajeExito('CAV eliminado correctamente.');
      subirAlInicio();
    } catch (error) {
      setMensajeError(error.message || 'No fue posible eliminar el CAV.');
      subirAlInicio();
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <section className="ciudades-cavs">
        <p className="ciudades-cavs__texto-simple">
          Cargando ciudades y CAVs...
        </p>
      </section>
    );
  }

  return (
    <section className="ciudades-cavs" ref={inicioRef}>
      <div className="ciudades-cavs__encabezado">
        <button
          type="button"
          className="ciudades-cavs__volver"
          onClick={onVolver}
        >
          ←
        </button>

        <div className="ciudades-cavs__titulo">
          <h1>
            Ciudades <span>/ CAVs</span>
          </h1>

          <p>
            Administra las ciudades y los CAVs disponibles para el registro de
            incidentes.
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

      <div className="ciudades-cavs__layout">
        <div className="ciudades-cavs__contenido">
          <div className="ciudades-cavs__card">
            <div className="ciudades-cavs__header">
              <div>
                <h2>Ciudades</h2>
                <p>{ciudadesFiltradas.length} resultados</p>
              </div>

              <div className="ciudades-cavs__header-derecha">
                <input
                  type="text"
                  placeholder="Buscar ciudad o CAV..."
                  value={busquedaCiudad}
                  onChange={(evento) => {
                    setBusquedaCiudad(evento.target.value);
                    setPaginaCiudades(1);
                  }}
                />

                {totalPaginasCiudades > 1 && (
                  <div className="ciudades-cavs__paginacion-mini">
                    <button
                      type="button"
                      onClick={() =>
                        setPaginaCiudades((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={paginaCiudades === 1}
                    >
                      ←
                    </button>

                    <span>
                      {paginaCiudades}/{totalPaginasCiudades}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setPaginaCiudades((prev) =>
                          Math.min(prev + 1, totalPaginasCiudades)
                        )
                      }
                      disabled={paginaCiudades === totalPaginasCiudades}
                    >
                      →
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="ciudades-cavs__tabla-contenedor">
              <table className="ciudades-cavs__tabla">
                <thead>
                  <tr>
                    <th>Ciudad</th>
                    <th>CAVs asociados</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {ciudadesVisibles.map((ciudad) => (
                    <>
                      <tr key={ciudad.idCiudad}>
                        <td>
                          <button
                            type="button"
                            className="ciudades-cavs__expandir"
                            onClick={() => alternarCiudad(ciudad.idCiudad)}
                          >
                            {ciudadExpandida === ciudad.idCiudad ? '⌄' : '›'}
                          </button>

                          <strong>{ciudad.nombreCiudad}</strong>
                        </td>

                        <td>
                          <span className="ciudades-cavs__badge">
                            {ciudad.cavs.length} CAVs
                          </span>
                        </td>

                        <td>
                          <div className="ciudades-cavs__acciones">
                            <button
                              type="button"
                              onClick={() => prepararEditarCiudad(ciudad)}
                              disabled={guardando}
                            >
                              Editar
                            </button>

                            <button
                              type="button"
                              className="ciudades-cavs__accion-eliminar"
                              onClick={() => prepararEliminarCiudad(ciudad)}
                              disabled={guardando}
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>

                      {ciudadExpandida === ciudad.idCiudad && (
                        <tr className="ciudades-cavs__fila-expandida">
                          <td colSpan="3">
                            <div className="ciudades-cavs__cavs-expandido">
                              {ciudad.cavs.length === 0 ? (
                                <p className="ciudades-cavs__texto-simple">
                                  Esta ciudad no tiene CAVs asociados.
                                </p>
                              ) : (
                                <div className="ciudades-cavs__cavs-lista">
                                  {ciudad.cavs.map((cav) => (
                                    <div
                                      key={cav.idCav}
                                      className="ciudades-cavs__cav-item"
                                    >
                                      <span className="ciudades-cavs__cav-nombre">
                                        {cav.nombreCav}
                                      </span>

                                      <div className="ciudades-cavs__acciones">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            prepararEditarCav(cav, ciudad)
                                          }
                                          disabled={guardando}
                                        >
                                          Editar
                                        </button>

                                        <button
                                          type="button"
                                          className="ciudades-cavs__accion-eliminar"
                                          onClick={() =>
                                            prepararEliminarCav(cav, ciudad)
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
                    </>
                  ))}

                  {ciudadesFiltradas.length === 0 && (
                    <tr>
                      <td colSpan="3">
                        <p className="ciudades-cavs__sin-datos">
                          No se encontraron ciudades ni CAVs.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="ciudades-cavs__sidebar">
          {editandoCav || eliminandoCav ? (
            <form
              onSubmit={guardarCav}
              className={`ciudades-cavs__form ${
                editandoCav ? 'ciudades-cavs__form--editando' : ''
              } ${eliminandoCav ? 'ciudades-cavs__form--eliminar' : ''}`}
            >
              {eliminandoCav ? (
                <>
                  <h2>Eliminar CAV</h2>

                  <p>
                    ¿Estás seguro de eliminar el CAV{' '}
                    <strong>{eliminandoCav.nombreCav}</strong>?
                  </p>

                  <div className="ciudades-cavs__acciones-form">
                    <button
                      type="button"
                      className="ciudades-cavs__boton-eliminar"
                      onClick={confirmarEliminarCav}
                      disabled={guardando}
                    >
                      {guardando ? 'Eliminando...' : 'Eliminar'}
                    </button>

                    <button
                      type="button"
                      className="ciudades-cavs__boton-secundario"
                      onClick={() => setEliminandoCav(null)}
                      disabled={guardando}
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h2>Editar CAV</h2>

                  <p>Actualiza el nombre del CAV seleccionado.</p>

                  <label>Ciudad asociada</label>

                  <div className="ciudades-cavs__campo-solo-lectura">
                    {editandoCav?.ciudadNombre || 'Sin ciudad asociada'}
                  </div>

                  <label htmlFor="nombreCav">Nombre del CAV</label>

                  <input
                    id="nombreCav"
                    type="text"
                    value={formCav.nombre}
                    placeholder="Ej: CAV Centro"
                    onChange={(evento) =>
                      setFormCav((prev) => ({
                        ...prev,
                        nombre: evento.target.value,
                      }))
                    }
                  />

                  <div className="ciudades-cavs__acciones-form">
                    <button type="submit" disabled={guardando}>
                      {guardando ? 'Guardando...' : 'Guardar cambios'}
                    </button>

                    <button
                      type="button"
                      className="ciudades-cavs__boton-secundario"
                      onClick={cancelarEdicionCav}
                      disabled={guardando}
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              )}
            </form>
          ) : (
            <form
              onSubmit={guardarCiudad}
              className={`ciudades-cavs__form ${
                editandoCiudad ? 'ciudades-cavs__form--editando' : ''
              } ${eliminandoCiudad ? 'ciudades-cavs__form--eliminar' : ''}`}
            >
              {eliminandoCiudad ? (
                <>
                  <h2>Eliminar ciudad</h2>

                  {eliminandoCiudad.cavs?.length === 1 ? (
                    <p>
                      La ciudad <strong>{eliminandoCiudad.nombreCiudad}</strong> tiene un CAV
                      asociado. Si eliminas esta ciudad, también se eliminará el CAV{' '}
                      <strong>{eliminandoCiudad.cavs[0].nombreCav}</strong>, ya que la ciudad no
                      puede quedar sin CAVs asociados. ¿Estás seguro de continuar?
                    </p>
                  ) : eliminandoCiudad.cavs?.length > 1 ? (
                    <p>
                      La ciudad <strong>{eliminandoCiudad.nombreCiudad}</strong> tiene{' '}
                      <strong>{eliminandoCiudad.cavs.length}</strong> CAVs asociados. Si eliminas
                      esta ciudad, también se eliminarán sus CAVs asociados. ¿Estás seguro de
                      continuar?
                    </p>
                  ) : (
                    <p>
                      ¿Estás seguro de eliminar la ciudad{' '}
                      <strong>{eliminandoCiudad.nombreCiudad}</strong>?
                    </p>
                  )}

                  <div className="ciudades-cavs__acciones-form">
                    <button
                      type="button"
                      className="ciudades-cavs__boton-eliminar"
                      onClick={confirmarEliminarCiudad}
                      disabled={guardando}
                    >
                      {guardando ? 'Eliminando...' : 'Eliminar'}
                    </button>

                    <button
                      type="button"
                      className="ciudades-cavs__boton-secundario"
                      onClick={() => setEliminandoCiudad(null)}
                      disabled={guardando}
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h2>{editandoCiudad ? 'Editar ciudad' : 'Crear ciudad'}</h2>

                  <p>
                    Registra o actualiza las ciudades disponibles para los incidentes.
                  </p>

                  <label htmlFor="nombreCiudad">Nombre de la ciudad</label>

                  <input
                    id="nombreCiudad"
                    type="text"
                    value={formCiudad.nombre}
                    placeholder="Ej: Bogotá"
                    onChange={(evento) =>
                      setFormCiudad((prev) => ({
                        ...prev,
                        nombre: evento.target.value,
                      }))
                    }
                  />

                  {editandoCiudad && (
                    <div className="ciudades-cavs__editar-cavs">
                      <div className="ciudades-cavs__cavs-header">
                        <label>Nuevos CAVs</label>

                        <button
                          type="button"
                          className="ciudades-cavs__boton-agregar"
                          onClick={agregarNuevoCavCiudad}
                          disabled={guardando}
                        >
                          + Agregar CAV
                        </button>
                      </div>

                      {formCiudad.nuevosCavs.map((cav, index) => (
                        <div key={index} className="ciudades-cavs__cav-campo">
                          <input
                            type="text"
                            value={cav}
                            placeholder={`Nuevo CAV ${index + 1}`}
                            onChange={(evento) =>
                              cambiarNuevoCavCiudad(index, evento.target.value)
                            }
                          />

                          <button
                            type="button"
                            className="ciudades-cavs__boton-quitar"
                            onClick={() => eliminarNuevoCavCiudad(index)}
                            disabled={guardando}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {!editandoCiudad && (
                    <div className="ciudades-cavs__cavs-formulario">
                      <div className="ciudades-cavs__cavs-header">
                        <label>CAVs asociados</label>

                        <button
                          type="button"
                          className="ciudades-cavs__boton-agregar"
                          onClick={agregarCavCiudad}
                          disabled={guardando}
                        >
                          + Agregar CAV
                        </button>
                      </div>

                      {formCiudad.cavs.map((cav, index) => (
                        <div key={index} className="ciudades-cavs__cav-campo">
                          <input
                            type="text"
                            value={cav}
                            placeholder={`Ej: CAV ${index + 1}`}
                            onChange={(evento) =>
                              cambiarCavCiudad(index, evento.target.value)
                            }
                          />

                          <button
                            type="button"
                            className="ciudades-cavs__boton-quitar"
                            onClick={() => eliminarCavCiudad(index)}
                            disabled={guardando}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="ciudades-cavs__acciones-form">
                    <button type="submit" disabled={guardando}>
                      {guardando
                        ? 'Guardando...'
                        : editandoCiudad
                          ? 'Guardar cambios'
                          : 'Guardar'}
                    </button>

                    {editandoCiudad && (
                      <button
                        type="button"
                        className="ciudades-cavs__boton-secundario"
                        onClick={cancelarEdicionCiudad}
                        disabled={guardando}
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </>
              )}
            </form>
          )}
        </aside>
      </div>
    </section>
  );
}

export default CiudadesCavs;