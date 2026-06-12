import { useEffect, useMemo, useRef, useState } from 'react';

import SelectBuscable from '../../../../componentes/incidentes/SelectBuscable/SelectBuscable';
import configuracionServicio from '../../../../services/configuracionServicio';

import './Usuarios.css';

const FORM_INICIAL = {
  nombre: '',
  apellido: '',
  correo: '',
  rolId: '',
};

const ELEMENTOS_POR_PAGINA = 6;

function Usuarios({ onVolver }) {
  const [vista, setVista] = useState('listado');
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [form, setForm] = useState(FORM_INICIAL);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [usuarioEliminando, setUsuarioEliminando] = useState(null);
  const [usuarioContrasena, setUsuarioContrasena] = useState(null);
  const [mensajeContrasena, setMensajeContrasena] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
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

      const [usuariosRespuesta, rolesRespuesta] = await Promise.all([
        configuracionServicio.listarUsuarios(),
        configuracionServicio.listarRoles(),
      ]);

      setUsuarios(usuariosRespuesta);
      setRoles(rolesRespuesta);
    } catch (error) {
      setMensajeError(error.message || 'No fue posible cargar usuarios.');
      subirAlInicio();
    } finally {
      setCargando(false);
    }
  };

  const limpiarMensajes = () => {
    setMensajeError('');
    setMensajeExito('');
  };

  const limpiarFormulario = () => {
    setForm(FORM_INICIAL);
    setUsuarioEditando(null);
    limpiarMensajes();
  };

  const abrirCrear = () => {
    limpiarFormulario();
    setUsuarioEliminando(null);
    setVista('crear');
  };

  const abrirListado = () => {
    limpiarFormulario();
    setUsuarioEliminando(null);
    setVista('listado');
    cargarDatos();
  };

  const usuariosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return usuarios;

    return usuarios.filter((usuario) => {
      const nombreCompleto = `${usuario.nombre} ${usuario.apellido}`.toLowerCase();

      return (
        nombreCompleto.includes(texto) ||
        usuario.correo.toLowerCase().includes(texto) ||
        usuario.rolNombre.toLowerCase().includes(texto)
      );
    });
  }, [usuarios, busqueda]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(usuariosFiltrados.length / ELEMENTOS_POR_PAGINA)
  );

  const usuariosVisibles = useMemo(() => {
    const inicio = (pagina - 1) * ELEMENTOS_POR_PAGINA;
    const fin = inicio + ELEMENTOS_POR_PAGINA;

    return usuariosFiltrados.slice(inicio, fin);
  }, [usuariosFiltrados, pagina]);

  const opcionesRoles = useMemo(() => {
    return roles.map((rol) => ({
      valor: rol.idRol,
      etiqueta: rol.nombreRol,
    }));
  }, [roles]);

  const formSinCambios =
    usuarioEditando &&
    form.nombre.trim() === usuarioEditando.nombre &&
    form.apellido.trim() === usuarioEditando.apellido &&
    form.correo.trim().toLowerCase() === usuarioEditando.correo &&
    Number(form.rolId) === Number(usuarioEditando.rolId);

  const actualizarCampo = (campo, valor) => {
    setForm((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const prepararEditar = (usuario) => {
    limpiarMensajes();
    setUsuarioEliminando(null);
    setUsuarioEditando(usuario);
    setForm({
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      correo: usuario.correo,
      rolId: String(usuario.rolId),
    });
    setVista('crear');
  };

  const prepararEliminar = (usuario) => {
    limpiarMensajes();
    setUsuarioEliminando(usuario);
    setUsuarioEditando(null);
  };

  const validarFormulario = () => {
    if (!form.nombre.trim()) return 'El nombre es obligatorio.';
    if (!form.apellido.trim()) return 'El apellido es obligatorio.';
    if (!form.correo.trim()) return 'El correo corporativo es obligatorio.';
    if (!form.rolId) return 'Selecciona un rol.';

    return '';
  };

  const guardarUsuario = async (evento) => {
    evento.preventDefault();

    const errorFormulario = validarFormulario();
    if (errorFormulario) {
      setMensajeError(errorFormulario);
      subirAlInicio();
      return;
    }

    if (formSinCambios) {
      abrirListado();
      return;
    }

    try {
      setGuardando(true);
      limpiarMensajes();

      if (usuarioEditando) {
        await configuracionServicio.actualizarUsuario(usuarioEditando.idUsuario, {
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim(),
          correo: form.correo.trim(),
          rolId: form.rolId,
        });

        setMensajeExito('Usuario actualizado correctamente.');
        await cargarDatos();
        setVista('listado');
        subirAlInicio();
      } else {
        const usuarioCreado = await configuracionServicio.crearUsuario({
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim(),
          correo: form.correo.trim(),
          rolId: form.rolId,
        });

        setUsuarioContrasena(usuarioCreado);
        setMensajeContrasena('');
        setMensajeExito('Usuario creado correctamente.');
        setForm(FORM_INICIAL);
        await cargarDatos();
      }
    } catch (error) {
      setMensajeError(error.message || 'No fue posible guardar el usuario.');
      subirAlInicio();
    } finally {
      setGuardando(false);
    }
  };

  const alternarEstado = async (usuario) => {
    try {
      setGuardando(true);
      limpiarMensajes();

      await configuracionServicio.cambiarEstadoUsuario(
        usuario.idUsuario,
        !usuario.activo
      );

      setMensajeExito(
        usuario.activo
          ? 'Usuario desactivado correctamente.'
          : 'Usuario activado correctamente.'
      );
      await cargarDatos();
      subirAlInicio();
    } catch (error) {
      setMensajeError(error.message || 'No fue posible cambiar el estado.');
      subirAlInicio();
    } finally {
      setGuardando(false);
    }
  };

  const regenerarContrasena = async (usuario) => {
    try {
      setGuardando(true);
      limpiarMensajes();

      const respuesta = await configuracionServicio.regenerarContrasenaUsuario(
        usuario.idUsuario
      );

      setUsuarioContrasena(respuesta);
      setMensajeContrasena('');
      await cargarDatos();
    } catch (error) {
      setMensajeError(error.message || 'No fue posible regenerar la contraseña.');
      subirAlInicio();
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminar = async () => {
    if (!usuarioEliminando) return;

    try {
      setGuardando(true);
      limpiarMensajes();

      await configuracionServicio.eliminarUsuario(usuarioEliminando.idUsuario);

      setUsuarioEliminando(null);
      setMensajeExito('Usuario eliminado correctamente.');
      await cargarDatos();
      subirAlInicio();
    } catch (error) {
      setMensajeError(error.message || 'No fue posible eliminar el usuario.');
      subirAlInicio();
    } finally {
      setGuardando(false);
    }
  };

  const copiarContrasena = async () => {
    if (!usuarioContrasena?.contrasenaTemporal) return;

    try {
      await navigator.clipboard.writeText(usuarioContrasena.contrasenaTemporal);
      setMensajeContrasena('Contraseña copiada al portapapeles.');
    } catch {
      setMensajeContrasena('No fue posible copiar la contraseña.');
    }
  };

  const cerrarModalContrasena = () => {
    setUsuarioContrasena(null);
    setMensajeContrasena('');
    setVista('listado');
    subirAlInicio();
  };

  if (cargando) {
    return (
      <section className="usuarios">
        <p className="usuarios__texto-simple">Cargando usuarios...</p>
      </section>
    );
  }

  return (
    <section className="usuarios" ref={inicioRef}>
      {vista === 'listado' && (
        <>
          <div className="usuarios__encabezado">
            <button
              type="button"
              className="usuarios__volver"
              onClick={onVolver}
              aria-label="Volver"
            >
              ←
            </button>

            <div className="usuarios__titulo">
              <h1>Usuarios</h1>
              <p>Administra los usuarios y roles de acceso a la plataforma.</p>
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

          <div className="usuarios__card">
            <div className="usuarios__header">
              <div>
                <h2>Usuarios registrados</h2>
                <p>{usuariosFiltrados.length} resultados</p>
              </div>

              <div className="usuarios__header-derecha">
                <div className="usuarios__buscador">
                  <input
                    type="text"
                    placeholder="Buscar usuario..."
                    value={busqueda}
                    onChange={(evento) => {
                      setBusqueda(evento.target.value);
                      setPagina(1);
                    }}
                  />

                  {busqueda.trim().length > 0 && (
                    <button
                      type="button"
                      className="usuarios__limpiar-busqueda"
                      onClick={() => {
                        setBusqueda('');
                        setPagina(1);
                      }}
                      aria-label="Limpiar busqueda"
                    >
                      ×
                    </button>
                  )}
                </div>

                {totalPaginas > 1 && (
                  <div className="usuarios__paginacion-mini">
                    <button
                      type="button"
                      onClick={() => setPagina((prev) => Math.max(prev - 1, 1))}
                      disabled={pagina === 1}
                    >
                      {'<-'}
                    </button>

                    <span>{pagina}/{totalPaginas}</span>

                    <button
                      type="button"
                      onClick={() =>
                        setPagina((prev) => Math.min(prev + 1, totalPaginas))
                      }
                      disabled={pagina === totalPaginas}
                    >
                      {'->'}
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  className="usuarios__boton-crear"
                  onClick={abrirCrear}
                >
                  Crear usuario
                </button>
              </div>
            </div>

            <div className="usuarios__tabla-contenedor">
              <table className="usuarios__tabla">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Correo</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {usuariosVisibles.map((usuario) => (
                    <tr key={usuario.idUsuario}>
                      <td>
                        <strong>{usuario.nombre} {usuario.apellido}</strong>
                        {usuario.debeCambiarContrasena && (
                          <span className="usuarios__nota">
                            Debe cambiar contraseña
                          </span>
                        )}
                      </td>
                      <td>{usuario.correo}</td>
                      <td>
                        <span
                          className={`usuarios__badge ${
                            usuario.rolNombre.toLowerCase().includes('administrador')
                              ? 'usuarios__badge--administrador'
                              : usuario.rolNombre.toLowerCase().includes('embajador')
                                ? 'usuarios__badge--embajador'
                                : ''
                          }`}
                        >
                          {usuario.rolNombre || 'Sin rol'}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`usuarios__estado ${
                            usuario.activo
                              ? 'usuarios__estado--activo'
                              : 'usuarios__estado--inactivo'
                          }`}
                        >
                          {usuario.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        <div className="usuarios__acciones">
                          <button
                            type="button"
                            onClick={() => prepararEditar(usuario)}
                            disabled={guardando}
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => alternarEstado(usuario)}
                            disabled={guardando}
                          >
                            {usuario.activo ? 'Desactivar' : 'Activar'}
                          </button>

                          {usuario.debeCambiarContrasena && (
                            <button
                              type="button"
                              onClick={() => regenerarContrasena(usuario)}
                              disabled={guardando}
                            >
                              Contraseña
                            </button>
                          )}

                          <button
                            type="button"
                            className="usuarios__accion-eliminar"
                            onClick={() => prepararEliminar(usuario)}
                            disabled={guardando}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {usuariosFiltrados.length === 0 && (
                    <tr>
                      <td colSpan="5">
                        <p className="usuarios__sin-datos">
                          No se encontraron usuarios.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {vista === 'crear' && (
        <>
          <button
            type="button"
            className="usuarios__volver usuarios__volver--form"
            onClick={abrirListado}
            aria-label="Volver a usuarios"
          >
            ←
          </button>

          <div className="usuarios__form-titulo">
            {usuarioEditando ? (
              <h1>
                Editar <span>usuario</span>
              </h1>
            ) : (
              <h1>
                Crear <span>usuario</span>
              </h1>
            )}
            <p>
              {usuarioEditando
                ? 'Actualiza la informacion del usuario seleccionado.'
                : 'Completa la informacion para crear un nuevo usuario con acceso a la configuracion avanzada.'}
            </p>
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

          <form className="usuarios__form-card" onSubmit={guardarUsuario}>
            <div className="usuarios__form-grid">
              <div className="usuarios__campo">
                <label htmlFor="nombreUsuario">Nombre</label>
                <div className="usuarios__input-icono">
                  <span aria-hidden="true">o</span>
                  <input
                    id="nombreUsuario"
                    type="text"
                    placeholder="Ingresa el nombre"
                    value={form.nombre}
                    onChange={(evento) =>
                      actualizarCampo('nombre', evento.target.value)
                    }
                  />
                </div>
              </div>

              <div className="usuarios__campo">
                <label htmlFor="apellidoUsuario">Apellido</label>
                <div className="usuarios__input-icono">
                  <span aria-hidden="true">o</span>
                  <input
                    id="apellidoUsuario"
                    type="text"
                    placeholder="Ingresa el apellido"
                    value={form.apellido}
                    onChange={(evento) =>
                      actualizarCampo('apellido', evento.target.value)
                    }
                  />
                </div>
              </div>

              <div className="usuarios__campo usuarios__campo--full">
                <label htmlFor="correoUsuario">Correo electronico corporativo</label>
                <div className="usuarios__input-icono">
                  <span aria-hidden="true">@</span>
                  <input
                    id="correoUsuario"
                    type="email"
                    placeholder="ejemplo@empresa.com"
                    value={form.correo}
                    onChange={(evento) =>
                      actualizarCampo('correo', evento.target.value)
                    }
                  />
                </div>
                <small>Debe ser un correo corporativo valido.</small>
              </div>

              <div className="usuarios__campo usuarios__campo--full">
                <SelectBuscable
                  id="rolUsuario"
                  label="Rol"
                  placeholder="— Seleccione rol —"
                  placeholderBusqueda="Buscar rol..."
                  opciones={opcionesRoles}
                  valor={form.rolId}
                  onChange={(evento) =>
                    actualizarCampo('rolId', evento.target.value)
                  }
                  disabled={guardando}
                  sinResultadosTexto="No se encontraron roles"
                />
                <small>Define los permisos que tendra el usuario en la plataforma.</small>
              </div>
            </div>

            <div className="usuarios__form-acciones">
              <button
                type="button"
                className="usuarios__boton-secundario"
                onClick={abrirListado}
                disabled={guardando}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="usuarios__boton-principal"
                disabled={guardando}
              >
                {guardando
                  ? 'Guardando...'
                  : usuarioEditando
                    ? formSinCambios
                      ? 'Guardar sin cambios'
                      : 'Guardar cambios'
                    : 'Crear usuario'}
              </button>
            </div>
          </form>
        </>
      )}

      {usuarioEliminando && (
        <div className="usuarios__modal-fondo">
          <div className="usuarios__modal usuarios__modal--confirmacion usuarios__modal--eliminar">
            <button
              type="button"
              className="usuarios__modal-cerrar"
              onClick={() => setUsuarioEliminando(null)}
              aria-label="Cerrar"
            >
              x
            </button>

            <h2>Eliminar usuario</h2>
            <p>
              Estas seguro de eliminar a{' '}
              <strong>
                {usuarioEliminando.nombre} {usuarioEliminando.apellido}
              </strong>
              ?
            </p>

            <div className="usuarios__modal-acciones">
              <button
                type="button"
                className="usuarios__boton-secundario"
                onClick={() => setUsuarioEliminando(null)}
                disabled={guardando}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="usuarios__boton-eliminar"
                onClick={confirmarEliminar}
                disabled={guardando}
              >
                {guardando ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {usuarioContrasena && (
        <div className="usuarios__modal-fondo">
          <div className="usuarios__modal">
            <button
              type="button"
              className="usuarios__modal-cerrar"
              onClick={cerrarModalContrasena}
              aria-label="Cerrar"
            >
              x
            </button>

            <div className="usuarios__modal-icono">OK</div>

            <h2>Usuario creado con exito</h2>
            <p>
              La contraseña se genero automaticamente. Copiala y compartela
              con el usuario para que pueda iniciar sesion en la plataforma.
            </p>

            <label>Contraseña temporal</label>
            <div className="usuarios__password-box">
              <strong>{usuarioContrasena.contrasenaTemporal}</strong>
              <button type="button" onClick={copiarContrasena}>
                Copiar
              </button>
            </div>

            {mensajeContrasena && (
              <div className="usuarios__modal-feedback">
                {mensajeContrasena}
              </div>
            )}

            <div className="usuarios__info">
              <span>i</span>
              <p>El usuario debera cambiar esta contraseña en su primer inicio de sesion.</p>
            </div>

            <button
              type="button"
              className="usuarios__modal-boton"
              onClick={cerrarModalContrasena}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default Usuarios;
