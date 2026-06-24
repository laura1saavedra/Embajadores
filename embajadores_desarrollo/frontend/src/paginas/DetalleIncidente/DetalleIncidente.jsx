import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import LayoutPrincipal from '../../componentes/layout/LayoutPrincipal/LayoutPrincipal';
import ContenedorPagina from '../../componentes/layout/ContenedorPagina/ContenedorPagina';
import EstadoIncidente from '../../componentes/incidentes/EstadoIncidente/EstadoIncidente';
import SelectBuscable from '../../componentes/incidentes/SelectBuscable/SelectBuscable';
import { useAuth } from '../../context/AuthContext';
import incidenteServicio from '../../services/incidenteServicio';
import { PERMISOS, usuarioTienePermiso } from '../../utils/permisos';

import './DetalleIncidentes.css';

const FORM_INICIAL = {
  estado: 'abierto',
  ciudadId: '',
  cavId: '',
  usuariosAfectados: '',
  usuariosOperacion: '',
};

const CAMPOS_USUARIOS_NUMERICOS = new Set([
  'usuariosAfectados',
  'usuariosOperacion',
]);

const sanitizarEntero = (valor) => valor.replace(/\D/g, '');

const bloquearCaracterNoNumerico = (evento) => {
  if (evento.ctrlKey || evento.metaKey || evento.altKey) return;

  const teclasPermitidas = [
    'Backspace',
    'Delete',
    'Tab',
    'Enter',
    'Escape',
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'Home',
    'End',
  ];

  if (teclasPermitidas.includes(evento.key)) return;

  if (!/^\d$/.test(evento.key)) {
    evento.preventDefault();
  }
};

const crearFila = (datos = {}) => ({
  id: datos.id || Date.now() + Math.random(),
  aplicacionId: datos.aplicacionId || '',
  servicioId: datos.servicioId || '',
  tipoFallaId: datos.tipoFallaId || '',
});

function DetalleIncidente() {
  const { idIncidente } = useParams();
  const navegar = useNavigate();
  const { usuario } = useAuth();

  const [incidente, setIncidente] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [mensajeError, setMensajeError] = useState('');

  const [editando, setEditando] = useState(false);
  const [formulario, setFormulario] = useState(FORM_INICIAL);
  const [filasAplicaciones, setFilasAplicaciones] = useState([crearFila()]);
  const [ciudades, setCiudades] = useState([]);
  const [cavs, setCavs] = useState([]);
  const [aplicaciones, setAplicaciones] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [tiposFalla, setTiposFalla] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [cerrando, setCerrando] = useState(false);

  const [eliminando, setEliminando] = useState(false);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);

  const esAdministrador = (usuario?.rolNombre ?? '')
    .toLowerCase()
    .includes('admin');
  const puedeEditar = esAdministrador && usuarioTienePermiso(
    usuario,
    PERMISOS.EDITAR_INCIDENTE
  );
  const puedeCerrar = usuarioTienePermiso(
    usuario,
    PERMISOS.CERRAR_INCIDENTE
  );
  const puedeEliminar = esAdministrador && incidente?.estado === 'cerrado';

  const sincronizarFormulario = (datos) => {
    setFormulario({
      estado: datos.estado || 'abierto',
      ciudadId: datos.ciudadId || '',
      cavId: datos.cavId || '',
      usuariosAfectados:
        datos.usuariosAfectados !== null && datos.usuariosAfectados !== undefined
          ? String(datos.usuariosAfectados)
          : '',
      usuariosOperacion:
        datos.usuariosOperacion !== null && datos.usuariosOperacion !== undefined
          ? String(datos.usuariosOperacion)
          : '',
    });

    const filas = (datos.aplicacionesAfectadas || [])
      .filter((item) => !item.perteneceAMasivo)
      .map((item) =>
        crearFila({
          id: item.idAplicacionesAfectados || undefined,
          aplicacionId: item.aplicacionId,
          servicioId: item.servicioId,
          tipoFallaId: item.tipoFallaId,
        })
      );

    setFilasAplicaciones(filas.length > 0 ? filas : [crearFila()]);
  };

  useEffect(() => {
    cargarDetalle();
  }, [idIncidente]);

  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const [ciudadesResp, aplicacionesResp, serviciosResp, tiposResp] = await Promise.all([
          incidenteServicio.obtenerCiudades(),
          incidenteServicio.obtenerAplicaciones(),
          incidenteServicio.obtenerServicios(),
          incidenteServicio.obtenerTiposFalla(),
        ]);

        setCiudades(ciudadesResp);
        setAplicaciones(aplicacionesResp);
        setServicios(serviciosResp);
        setTiposFalla(tiposResp);
      } catch {
        setCiudades([]);
        setAplicaciones([]);
        setServicios([]);
        setTiposFalla([]);
      }
    };

    if (puedeEditar) {
      cargarCatalogos();
    }
  }, [puedeEditar]);

  useEffect(() => {
    if (!formulario.ciudadId) {
      setCavs([]);
      return;
    }

    incidenteServicio
      .obtenerCavsPorCiudad(formulario.ciudadId)
      .then(setCavs)
      .catch(() => setCavs([]));
  }, [formulario.ciudadId]);

  useEffect(() => {
    if (!puedeEliminar) {
      setConfirmandoEliminar(false);
    }
  }, [puedeEliminar]);

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

      const detalle = {
        ...respuesta,
        fechaHoraCierre: cierre?.fechaCambio || null,
      };

      setIncidente(detalle);
      sincronizarFormulario(detalle);
    } catch (error) {
      setMensajeError(error.message || 'No fue posible cargar el incidente.');
    } finally {
      setCargando(false);
    }
  };

  const aplicacionesAfectadas = useMemo(() => {
    if (!Array.isArray(incidente?.aplicacionesAfectadas)) return [];

    return incidente.aplicacionesAfectadas.filter(
      (item) => item.aplicacionNombre || item.tipoFallaNombre
    );
  }, [incidente]);

  const opcionesEstado = [
    { valor: 'abierto', etiqueta: 'Abierto' },
    ...(puedeCerrar ? [{ valor: 'cerrado', etiqueta: 'Cerrado' }] : []),
  ];

  const opcionesCiudades = ciudades.map((c) => ({
    valor: c.idCiudad,
    etiqueta: c.nombreCiudad,
  }));

  const opcionesCavs = cavs.map((c) => ({
    valor: c.idCav,
    etiqueta: c.nombreCav,
  }));

  const opcionesAplicaciones = aplicaciones.map((a) => ({
    valor: a.id,
    etiqueta: a.nombre,
  }));

  const opcionesTiposFalla = tiposFalla.map((t) => ({
    valor: t.id,
    etiqueta: t.nombre,
  }));

  const obtenerOpcionesServicios = (aplicacionId) =>
    servicios
      .filter((servicio) => servicio.aplicacionId === aplicacionId)
      .map((servicio) => ({
        valor: servicio.id,
        etiqueta: servicio.nombre,
      }));

  const manejarCambio = (evento) => {
    const { name, value } = evento.target;
    const valor = CAMPOS_USUARIOS_NUMERICOS.has(name)
      ? sanitizarEntero(value)
      : value;

    setFormulario((prev) => ({
      ...prev,
      [name]: valor,
      ...(name === 'ciudadId' ? { cavId: '' } : {}),
    }));
    setMensajeError('');
  };

  const manejarCambioFila = (filaId, campo, valor) => {
    setFilasAplicaciones((prev) =>
      prev.map((fila) =>
        fila.id === filaId
          ? {
              ...fila,
              [campo]: valor,
              ...(campo === 'aplicacionId' ? { servicioId: '' } : {}),
            }
          : fila
      )
    );
    setMensajeError('');
  };

  const agregarFila = () => {
    setFilasAplicaciones((prev) => [...prev, crearFila()]);
  };

  const quitarFila = (filaId) => {
    if (filasAplicaciones.length === 1) return;
    setFilasAplicaciones((prev) => prev.filter((fila) => fila.id !== filaId));
  };

  const cancelarEdicion = () => {
    if (incidente) {
      sincronizarFormulario(incidente);
    }
    setEditando(false);
    setMensajeError('');
  };

  const validarEdicion = () => {
    if (!formulario.estado || !formulario.ciudadId || !formulario.cavId) {
      return 'Completa estado, ciudad y CAV.';
    }

    if (formulario.usuariosAfectados === '') {
      return 'El campo usuarios afectados es obligatorio.';
    }

    if (formulario.usuariosOperacion === '') {
      return 'El campo usuarios en operacion es obligatorio.';
    }

    const usuariosAfectados = Number(formulario.usuariosAfectados);
    const usuariosOperacion = Number(formulario.usuariosOperacion);

    if (usuariosAfectados <= 0) {
      return 'Los usuarios afectados deben ser mayores que cero.';
    }

    if (usuariosOperacion <= 0) {
      return 'Los usuarios en operacion deben ser mayores que cero.';
    }

    if (usuariosAfectados > usuariosOperacion) {
      return 'Los usuarios afectados no pueden ser mayores que los usuarios en operacion.';
    }

    const filasValidas = filasAplicaciones.filter(
      (fila) => fila.aplicacionId && fila.servicioId && fila.tipoFallaId
    );

    if (filasValidas.length === 0) {
      return 'Selecciona al menos una aplicacion, un servicio y un tipo de falla.';
    }

    const combinaciones = new Set();

    for (const fila of filasValidas) {
      const clave = `${fila.aplicacionId}-${fila.servicioId}-${fila.tipoFallaId}`;

      if (combinaciones.has(clave)) {
        return 'No se puede registrar la misma combinacion de aplicacion, servicio y tipo de falla mas de una vez.';
      }

      combinaciones.add(clave);
    }

    return '';
  };

  const guardarEdicion = async () => {
    if (!puedeEditar) {
      setMensajeError('Solo un administrador con permiso puede editar incidentes.');
      setEditando(false);
      return;
    }

    if (formulario.estado === 'cerrado' && incidente.estado !== 'cerrado' && !puedeCerrar) {
      setMensajeError('No tienes permiso para cerrar incidentes.');
      return;
    }

    const errorFormulario = validarEdicion();
    if (errorFormulario) {
      setMensajeError(errorFormulario);
      return;
    }

    try {
      setGuardando(true);
      setMensajeError('');

      await incidenteServicio.editarIncidente(idIncidente, {
        ...formulario,
        filasAplicaciones: filasAplicaciones.filter(
          (fila) => fila.aplicacionId && fila.servicioId && fila.tipoFallaId
        ),
      });

      setEditando(false);
      await cargarDetalle();
    } catch (error) {
      setMensajeError(error.message || 'No fue posible editar el incidente.');
    } finally {
      setGuardando(false);
    }
  };

  const cerrarIncidente = async () => {
    if (!puedeCerrar) {
      setMensajeError('No tienes permiso para cerrar incidentes.');
      return;
    }

    try {
      setCerrando(true);
      setMensajeError('');
      setEditando(false);
      setConfirmandoEliminar(false);

      await incidenteServicio.actualizarEstadoIncidente(idIncidente, 'cerrado');
      await cargarDetalle();
    } catch (error) {
      setMensajeError(error.message || 'No fue posible cerrar el incidente.');
    } finally {
      setCerrando(false);
    }
  };

  const eliminarIncidente = async () => {
    if (!puedeEliminar) {
      setConfirmandoEliminar(false);
      setMensajeError('Solo un administrador puede eliminar incidentes.');
      return;
    }

    try {
      setEliminando(true);
      setMensajeError('');

      await incidenteServicio.eliminarIncidente(idIncidente);

      navegar('/historial-incidentes');
    } catch (error) {
      setMensajeError(error.message || 'No fue posible eliminar el incidente.');
    } finally {
      setEliminando(false);
      setConfirmandoEliminar(false);
    }
  };

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
            {mensajeError || 'No se encontro el incidente.'}
          </div>
        </ContenedorPagina>
      </LayoutPrincipal>
    );
  }

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
        descripcion="Aqui puedes revisar la informacion completa del incidente y su historial."
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
                {incidente.usuariosOperacion !== null &&
                incidente.usuariosOperacion !== undefined
                  ? `${incidente.usuariosAfectados ?? 0} / ${incidente.usuariosOperacion}`
                  : incidente.usuariosAfectados ?? 0}
              </strong>
            </div>
          </div>
        </div>

        <div className="detalle-incidente__fechas">
          <div className="detalle-incidente__fecha-item">
            <span>Fecha generacion</span>
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

        {(puedeCerrar || puedeEditar || puedeEliminar) && (
          <div className="detalle-incidente__barra-acciones">
            {puedeCerrar && incidente.estado !== 'cerrado' && (
              <button
                type="button"
                className="detalle-incidente__boton detalle-incidente__boton--principal"
                onClick={cerrarIncidente}
                disabled={cerrando || guardando}
              >
                {cerrando ? 'Cerrando...' : 'Cerrar incidente'}
              </button>
            )}

            {puedeEditar && (
              <button
                type="button"
                className="detalle-incidente__boton detalle-incidente__boton--secundario"
                onClick={() => {
                  setConfirmandoEliminar(false);
                  setEditando((prev) => !prev);
                }}
                disabled={guardando}
              >
                {editando ? 'Ocultar edicion' : 'Editar incidente'}
              </button>
            )}

            {puedeEliminar && (
              <button
                type="button"
                className="detalle-incidente__boton detalle-incidente__boton--peligro"
                onClick={() => {
                  setMensajeError('');
                  setEditando(false);
                  setConfirmandoEliminar(true);
                }}
                disabled={eliminando}
              >
                {eliminando ? 'Eliminando...' : 'Eliminar incidente'}
              </button>
            )}
          </div>
        )}

        {puedeEliminar && confirmandoEliminar && (
          <div className="detalle-incidente__confirmacion-eliminar">
            <div className="detalle-incidente__confirmacion-texto">
              <strong>Eliminar incidente #{incidente.idIncidente}</strong>
              <span>
                Esta accion no se puede deshacer. Solo se pueden eliminar incidentes cerrados.
              </span>
            </div>

            <div className="detalle-incidente__confirmacion-acciones">
              <button
                type="button"
                className="detalle-incidente__boton detalle-incidente__boton--secundario"
                onClick={() => setConfirmandoEliminar(false)}
                disabled={eliminando}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="detalle-incidente__boton detalle-incidente__boton--peligro"
                onClick={eliminarIncidente}
                disabled={eliminando}
              >
                {eliminando ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        )}

        {puedeEditar && editando && (
          <section className="detalle-incidente__bloque detalle-incidente__bloque--estado">
            <h2 className="detalle-incidente__subtitulo">Editar incidente</h2>

            <div className="detalle-incidente__grid-edicion">
              <div className="detalle-incidente__campo-edicion">
                <SelectBuscable
                  id="estado"
                  label="Estado"
                  opciones={opcionesEstado}
                  valor={formulario.estado}
                  onChange={manejarCambio}
                  placeholder="Seleccionar estado"
                  placeholderBusqueda="Buscar estado..."
                  disabled={guardando}
                />
              </div>

              <div className="detalle-incidente__campo-edicion">
                <SelectBuscable
                  id="ciudadId"
                  label="Ciudad"
                  opciones={opcionesCiudades}
                  valor={formulario.ciudadId}
                  onChange={manejarCambio}
                  placeholder="Seleccionar ciudad"
                  placeholderBusqueda="Buscar ciudad..."
                  disabled={guardando}
                />
              </div>

              <div className="detalle-incidente__campo-edicion">
                <SelectBuscable
                  id="cavId"
                  label="CAV afectado"
                  opciones={opcionesCavs}
                  valor={formulario.cavId}
                  onChange={manejarCambio}
                  placeholder={
                    formulario.ciudadId
                      ? 'Seleccionar CAV'
                      : 'Primero elija ciudad'
                  }
                  placeholderBusqueda="Buscar CAV..."
                  disabled={guardando || !formulario.ciudadId}
                />
              </div>

              <div className="detalle-incidente__campo-edicion">
                <label htmlFor="usuariosAfectados">Usuarios afectados</label>
                <input
                  id="usuariosAfectados"
                  name="usuariosAfectados"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formulario.usuariosAfectados}
                  onChange={manejarCambio}
                  onKeyDown={bloquearCaracterNoNumerico}
                  disabled={guardando}
                />
              </div>

              <div className="detalle-incidente__campo-edicion">
                <label htmlFor="usuariosOperacion">Usuarios en operacion</label>
                <input
                  id="usuariosOperacion"
                  name="usuariosOperacion"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formulario.usuariosOperacion}
                  onChange={manejarCambio}
                  onKeyDown={bloquearCaracterNoNumerico}
                  disabled={guardando}
                />
              </div>
            </div>

            <div className="detalle-incidente__edicion-apps">
              <div className="detalle-incidente__edicion-apps-header">
                <h3>Aplicaciones afectadas, servicio y tipo de falla</h3>
                <button
                  type="button"
                  className="detalle-incidente__boton detalle-incidente__boton--secundario"
                  onClick={agregarFila}
                  disabled={guardando}
                >
                  + Agregar
                </button>
              </div>

              <div className="detalle-incidente__tabla-edicion-head">
                <span>#</span>
                <span>Aplicacion</span>
                <span>Servicio</span>
                <span>Tipo de falla</span>
                <span />
              </div>

              <div className="detalle-incidente__tabla-edicion-body">
                {filasAplicaciones.map((fila, index) => (
                  <div key={fila.id} className="detalle-incidente__fila-edicion">
                    <span className="detalle-incidente__fila-numero">
                      {index + 1}
                    </span>

                    <SelectBuscable
                      id={`app-${fila.id}`}
                      valor={fila.aplicacionId}
                      opciones={opcionesAplicaciones}
                      onChange={(evento) =>
                        manejarCambioFila(
                          fila.id,
                          'aplicacionId',
                          evento.target.value
                        )
                      }
                      placeholder="Seleccione aplicacion"
                      placeholderBusqueda="Buscar aplicacion..."
                      sinResultadosTexto="Sin aplicaciones"
                      disabled={guardando}
                    />

                    <SelectBuscable
                      id={`servicio-${fila.id}`}
                      valor={fila.servicioId}
                      opciones={obtenerOpcionesServicios(fila.aplicacionId)}
                      onChange={(evento) =>
                        manejarCambioFila(
                          fila.id,
                          'servicioId',
                          evento.target.value
                        )
                      }
                      placeholder={
                        fila.aplicacionId
                          ? 'Seleccione servicio'
                          : 'Primero seleccione aplicacion'
                      }
                      placeholderBusqueda="Buscar servicio..."
                      sinResultadosTexto="Sin servicios"
                      disabled={guardando || !fila.aplicacionId}
                    />

                    <SelectBuscable
                      id={`tipo-${fila.id}`}
                      valor={fila.tipoFallaId}
                      opciones={opcionesTiposFalla}
                      onChange={(evento) =>
                        manejarCambioFila(
                          fila.id,
                          'tipoFallaId',
                          evento.target.value
                        )
                      }
                      placeholder="Seleccione tipo de falla"
                      placeholderBusqueda="Buscar tipo de falla..."
                      sinResultadosTexto="Sin tipos de falla"
                      disabled={guardando}
                    />

                    <button
                      type="button"
                      className="detalle-incidente__boton-quitar"
                      onClick={() => quitarFila(fila.id)}
                      disabled={guardando || filasAplicaciones.length === 1}
                      title="Quitar fila"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="detalle-incidente__acciones-edicion">
              <button
                type="button"
                className="detalle-incidente__boton detalle-incidente__boton--secundario"
                onClick={cancelarEdicion}
                disabled={guardando}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="detalle-incidente__boton detalle-incidente__boton--principal"
                onClick={guardarEdicion}
                disabled={guardando}
              >
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </section>
        )}

        <section className="detalle-incidente__bloque detalle-incidente__bloque--ancho-completo">
          <h2 className="detalle-incidente__subtitulo">
            Aplicaciones, servicios y tipos de falla afectados
          </h2>

          {aplicacionesAfectadas.length > 0 ? (
            <div className="detalle-incidente__tabla-apps-contenedor">
              <table className="detalle-incidente__tabla-apps">
                <thead>
                  <tr>
                    <th>Aplicacion</th>
                    <th>Servicio</th>
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
                      <td>{item.aplicacionNombre || 'Sin aplicacion'}</td>
                      <td>{item.servicioNombre || 'Sin servicio'}</td>
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

