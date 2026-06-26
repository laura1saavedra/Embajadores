import { useEffect, useMemo, useRef, useState } from 'react';

import SelectBuscable from '../../../../componentes/incidentes/SelectBuscable/SelectBuscable';
import { useAuth } from '../../../../context/AuthContext';
import configuracionServicio from '../../../../services/configuracionServicio';

import './Usuarios.css';

const FORM_INICIAL = {
  nombre: '',
  apellido: '',
  correo: '',
  rolId: '',
};

const ROL_FORM_INICIAL = {
  nombreRol: '',
  descripcion: '',
  permisosIds: [],
};

const ELEMENTOS_POR_PAGINA = 4;
const ROLES_POR_PAGINA = 2;
const DOMINIOS_HITSS_PERMITIDOS = ['@hitss.com'];

const normalizarTexto = (texto = '') =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const obtenerModuloPermiso = (nombrePermiso = '') => {
  const permisoNormalizado = normalizarTexto(nombrePermiso);

  if (permisoNormalizado.includes('masivo')) {
    return {
      nombre: 'Incidentes masivos',
      clase: 'masivos',
    };
  }

  if (
    permisoNormalizado.includes('contactos wa') ||
    permisoNormalizado.includes('whatsapp')
  ) {
    return {
      nombre: 'WhatsApp',
      clase: 'whatsapp',
    };
  }

  if (permisoNormalizado.includes('configuracion')) {
    return {
      nombre: 'Configuracion',
      clase: 'configuracion',
    };
  }

  return {
    nombre: 'Incidentes',
    clase: 'incidentes',
  };
};

const obtenerClaseBadgeRol = (nombreRol = '') => {
  const rolNormalizado = nombreRol.toLowerCase();

  if (rolNormalizado.includes('administrador')) {
    return 'usuarios__badge--administrador';
  }

  if (rolNormalizado.includes('embajador')) {
    return 'usuarios__badge--embajador';
  }

  if (rolNormalizado.includes('lider')) {
    return 'usuarios__badge--liderazgo';
  }

  return 'usuarios__badge--general';
};

const esCorreoHitss = (correo = '') => {
  const correoNormalizado = correo.trim().toLowerCase();
  return DOMINIOS_HITSS_PERMITIDOS.some((dominio) =>
    correoNormalizado.endsWith(dominio)
  );
};

function Usuarios({ onVolver }) {
  const { cargarUsuarioActual } = useAuth();
  const [vista, setVista] = useState('listado');
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permisos, setPermisos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaRol, setBusquedaRol] = useState('');
  const [pagina, setPagina] = useState(1);
  const [paginaRoles, setPaginaRoles] = useState(1);
  const [form, setForm] = useState(FORM_INICIAL);
  const [rolForm, setRolForm] = useState(ROL_FORM_INICIAL);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [usuarioEliminando, setUsuarioEliminando] = useState(null);
  const [rolEditando, setRolEditando] = useState(null);
  const [rolEliminando, setRolEliminando] = useState(null);
  const [rolesPermisosExpandidos, setRolesPermisosExpandidos] = useState({});
  const [usuarioContrasena, setUsuarioContrasena] = useState(null);
  const [usuarioAcceso, setUsuarioAcceso] = useState(null);
  const [vistaAcceso, setVistaAcceso] = useState('menu');
  const [mostrarAvisoCierreAcceso, setMostrarAvisoCierreAcceso] = useState(false);
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

      const [usuariosRespuesta, rolesRespuesta, permisosRespuesta] = await Promise.all([
        configuracionServicio.listarUsuarios(),
        configuracionServicio.listarRoles({ refrescar: true }),
        configuracionServicio.listarPermisos(),
      ]);

      setUsuarios(usuariosRespuesta);
      setRoles(rolesRespuesta);
      setPermisos(permisosRespuesta);
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

  const abrirCrearRol = () => {
    limpiarFormularioRol();
    limpiarMensajes();
    setUsuarioEliminando(null);
    setRolEliminando(null);
    setVista('rol');
  };

  const abrirListado = () => {
    limpiarFormulario();
    limpiarFormularioRol();
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

  const rolesFiltrados = useMemo(() => {
    const texto = busquedaRol.trim().toLowerCase();

    if (!texto) return roles;

    return roles.filter((rol) => {
      const permisosTexto = (rol.permisos || [])
        .map((permiso) => permiso.nombrePermiso)
        .join(' ')
        .toLowerCase();

      return (
        rol.nombreRol.toLowerCase().includes(texto) ||
        (rol.descripcion || '').toLowerCase().includes(texto) ||
        permisosTexto.includes(texto)
      );
    });
  }, [roles, busquedaRol]);

  const totalPaginasRoles = Math.max(
    1,
    Math.ceil(rolesFiltrados.length / ROLES_POR_PAGINA)
  );

  const rolesVisibles = useMemo(() => {
    const inicio = (paginaRoles - 1) * ROLES_POR_PAGINA;
    const fin = inicio + ROLES_POR_PAGINA;

    return rolesFiltrados.slice(inicio, fin);
  }, [rolesFiltrados, paginaRoles]);

  useEffect(() => {
    setPaginaRoles((prev) => Math.min(prev, totalPaginasRoles));
  }, [totalPaginasRoles]);

  const conteoUsuariosPorRol = useMemo(() => {
    return usuarios.reduce((acumulado, usuario) => {
      const rolId = Number(usuario.rolId);
      acumulado[rolId] = (acumulado[rolId] || 0) + 1;
      return acumulado;
    }, {});
  }, [usuarios]);

  const formSinCambios =
    usuarioEditando &&
    form.nombre.trim() === usuarioEditando.nombre &&
    form.apellido.trim() === usuarioEditando.apellido &&
    form.correo.trim().toLowerCase() === usuarioEditando.correo &&
    Number(form.rolId) === Number(usuarioEditando.rolId);

  const rolFormSinCambios =
    rolEditando &&
    rolForm.nombreRol.trim() === rolEditando.nombreRol &&
    rolForm.descripcion.trim() === (rolEditando.descripcion || '') &&
    [...rolForm.permisosIds].sort((a, b) => a - b).join(',') ===
      [...(rolEditando.permisosIds || [])].sort((a, b) => a - b).join(',');

  const actualizarCampo = (campo, valor) => {
    setForm((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const actualizarCampoRol = (campo, valor) => {
    setRolForm((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const alternarPermisoRol = (permisoId) => {
    setRolForm((prev) => {
      const permisoIdNumero = Number(permisoId);
      const permisosIds = prev.permisosIds.includes(permisoIdNumero)
        ? prev.permisosIds.filter((id) => id !== permisoIdNumero)
        : [...prev.permisosIds, permisoIdNumero];

      return {
        ...prev,
        permisosIds,
      };
    });
  };

  const limpiarFormularioRol = () => {
    setRolForm(ROL_FORM_INICIAL);
    setRolEditando(null);
    setRolEliminando(null);
  };

  const prepararEditarRol = (rol) => {
    limpiarMensajes();
    setRolEliminando(null);
    setRolEditando(rol);
    setRolForm({
      nombreRol: rol.nombreRol,
      descripcion: rol.descripcion || '',
      permisosIds: rol.permisosIds || [],
    });
    setVista('rol');
  };

  const prepararEliminarRol = (rol) => {
    limpiarMensajes();

    const totalUsuariosRol = conteoUsuariosPorRol[Number(rol.idRol)] || 0;
    if (totalUsuariosRol > 0) {
      setMensajeError(
        `No se puede eliminar el rol "${rol.nombreRol}" porque tiene ${totalUsuariosRol} usuario${totalUsuariosRol === 1 ? '' : 's'} asociado${totalUsuariosRol === 1 ? '' : 's'}. Cambia el rol de esos usuarios antes de eliminarlo.`
      );
      subirAlInicio();
      return;
    }

    setRolEliminando(rol);
    setRolEditando(null);
  };

  const alternarPermisosRolExpandido = (rolId) => {
    setRolesPermisosExpandidos((prev) => ({
      ...prev,
      [rolId]: !prev[rolId],
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

  const prepararAcceso = (usuario) => {
    limpiarMensajes();
    setUsuarioAcceso(usuario);
    setVistaAcceso('menu');
    setMensajeContrasena('');
  };

  const validarFormulario = () => {
    if (!form.nombre.trim()) return 'El nombre es obligatorio.';
    if (!form.apellido.trim()) return 'El apellido es obligatorio.';
    if (!form.correo.trim()) return 'El correo corporativo es obligatorio.';
    if (!esCorreoHitss(form.correo)) {
      return 'Solo se aceptan correos con dominio @hitss.com.';
    }
    if (!form.rolId) return 'Selecciona un rol.';

    return '';
  };

  const validarFormularioRol = () => {
    if (!rolForm.nombreRol.trim()) return 'El nombre del rol es obligatorio.';
    if (rolForm.nombreRol.trim().length > 100) {
      return 'El nombre del rol no puede superar 100 caracteres.';
    }
    if (rolForm.descripcion.trim().length > 255) {
      return 'La descripcion del rol no puede superar 255 caracteres.';
    }
    if (rolForm.permisosIds.length === 0) {
      return 'Selecciona al menos un permiso para el rol.';
    }

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
        const correoCambio =
          form.correo.trim().toLowerCase() !== usuarioEditando.correo;

        await configuracionServicio.actualizarUsuario(usuarioEditando.idUsuario, {
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim(),
          correo: form.correo.trim(),
          rolId: form.rolId,
        });

        if (correoCambio) {
          const respuesta = await configuracionServicio.regenerarContrasenaUsuario(
            usuarioEditando.idUsuario
          );

          setUsuarioContrasena(respuesta);
          setMensajeContrasena('');
          setMensajeExito(
            'Usuario actualizado correctamente. Se genero una nueva contraseña temporal.'
          );
        } else {
          setMensajeExito('Usuario actualizado correctamente.');
        }

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

  const guardarRol = async (evento) => {
    evento.preventDefault();

    const errorFormulario = validarFormularioRol();
    if (errorFormulario) {
      setMensajeError(errorFormulario);
      subirAlInicio();
      return;
    }

    if (rolFormSinCambios) {
      limpiarFormularioRol();
      return;
    }

    try {
      setGuardando(true);
      limpiarMensajes();

      const payload = {
        nombreRol: rolForm.nombreRol.trim(),
        descripcion: rolForm.descripcion.trim(),
        permisosIds: rolForm.permisosIds,
      };

      const permisosSeleccionados = permisos.filter((permiso) =>
        payload.permisosIds.includes(Number(permiso.idPermiso))
      );

      if (rolEditando) {
        const rolActualizado = await configuracionServicio.actualizarRol(
          rolEditando.idRol,
          payload
        );
        const rolParaMostrar = {
          ...rolActualizado,
          permisosIds: payload.permisosIds,
          permisos: permisosSeleccionados,
        };

        setRoles((prev) =>
          prev.map((rol) =>
            Number(rol.idRol) === Number(rolEditando.idRol)
              ? rolParaMostrar
              : rol
          )
        );
        setMensajeExito('Rol actualizado correctamente.');
      } else {
        const rolCreado = await configuracionServicio.crearRol(payload);
        const rolParaMostrar = {
          ...rolCreado,
          permisosIds: payload.permisosIds,
          permisos: permisosSeleccionados,
        };

        setRoles((prev) => [...prev, rolParaMostrar]);
        setMensajeExito('Rol creado correctamente.');
      }

      limpiarFormularioRol();
      await cargarDatos();
      await cargarUsuarioActual();
      setVista('listado');
      subirAlInicio();
    } catch (error) {
      setMensajeError(error.message || 'No fue posible guardar el rol.');
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

  const generarContrasenaTemporalAcceso = async () => {
    if (!usuarioAcceso) return;

    try {
      setGuardando(true);
      setMensajeContrasena('');

      const respuesta = await configuracionServicio.generarContrasenaAccesoUsuario(
        usuarioAcceso.idUsuario
      );

      setUsuarioAcceso(respuesta);
      setVistaAcceso('recuperacion');
      setMensajeContrasena('');
      await cargarDatos();
    } catch (error) {
      setMensajeContrasena(error.message || 'No fue posible generar la contraseña temporal.');
    } finally {
      setGuardando(false);
    }
  };

  const forzarCambioContrasena = async () => {
    if (!usuarioAcceso) return;

    try {
      setGuardando(true);
      setMensajeContrasena('');

      await configuracionServicio.actualizarUsuario(usuarioAcceso.idUsuario, {
        debeCambiarContrasena: true,
      });

      setMensajeContrasena('El usuario debera cambiar la contraseña en el siguiente inicio de sesion.');
      setUsuarioAcceso((estadoActual) => ({
        ...estadoActual,
        debeCambiarContrasena: true,
      }));
      await cargarDatos();
      setUsuarioAcceso(null);
      setVistaAcceso('menu');
      setVista('listado');
      subirAlInicio();
    } catch (error) {
      setMensajeContrasena(error.message || 'No fue posible activar el cambio obligatorio.');
    } finally {
      setGuardando(false);
    }
  };

  const alternarEstadoDesdeAcceso = async () => {
    if (!usuarioAcceso) return;

    try {
      setGuardando(true);
      setMensajeContrasena('');

      const usuarioActualizado = await configuracionServicio.cambiarEstadoUsuario(
        usuarioAcceso.idUsuario,
        !usuarioAcceso.activo
      );

      setUsuarioAcceso((estadoActual) => ({
        ...estadoActual,
        activo: usuarioActualizado.activo,
      }));
      setMensajeContrasena(
        usuarioActualizado.activo
          ? 'Usuario activado correctamente.'
          : 'Usuario desactivado correctamente.'
      );
      await cargarDatos();
    } catch (error) {
      setMensajeContrasena(error.message || 'No fue posible cambiar el estado.');
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

  const confirmarEliminarRol = async () => {
    if (!rolEliminando) return;

    try {
      setGuardando(true);
      limpiarMensajes();

      await configuracionServicio.eliminarRol(rolEliminando.idRol);

      setRolEliminando(null);
      setMensajeExito('Rol eliminado correctamente.');
      await cargarDatos();
      await cargarUsuarioActual();
      subirAlInicio();
    } catch (error) {
      setMensajeError(error.message || 'No fue posible eliminar el rol.');
      subirAlInicio();
    } finally {
      setGuardando(false);
    }
  };

  const copiarContrasena = async () => {
    if (!usuarioContrasena?.contrasenaTemporal) return;

    const contrasena = usuarioContrasena.contrasenaTemporal;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(contrasena);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = contrasena;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.top = '-9999px';
        textarea.style.left = '-9999px';

        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        const copiado = document.execCommand('copy');
        document.body.removeChild(textarea);

        if (!copiado) {
          throw new Error('No fue posible copiar la contraseña.');
        }
      }

      setMensajeContrasena('Contraseña copiada al portapapeles.');
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = contrasena;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.top = '-9999px';
        textarea.style.left = '-9999px';

        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        const copiado = document.execCommand('copy');
        document.body.removeChild(textarea);

        setMensajeContrasena(
          copiado
            ? 'Contraseña copiada al portapapeles.'
            : 'No fue posible copiar la contraseña.'
        );
      } catch {
        setMensajeContrasena('No fue posible copiar la contraseña.');
      }
    }
  };

  const copiarContrasenaAcceso = async () => {
    if (!usuarioAcceso?.contrasenaTemporal) return;

    const contrasena = usuarioAcceso.contrasenaTemporal;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(contrasena);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = contrasena;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.top = '-9999px';
        textarea.style.left = '-9999px';

        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        const copiado = document.execCommand('copy');
        document.body.removeChild(textarea);

        if (!copiado) {
          throw new Error('No fue posible copiar la contraseña.');
        }
      }

      setMensajeContrasena('Contraseña copiada al portapapeles.');
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = contrasena;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.top = '-9999px';
        textarea.style.left = '-9999px';

        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        const copiado = document.execCommand('copy');
        document.body.removeChild(textarea);

        setMensajeContrasena(
          copiado
            ? 'Contraseña copiada al portapapeles.'
            : 'No fue posible copiar la contraseña.'
        );
      } catch {
        setMensajeContrasena('No fue posible copiar la contraseña.');
      }
    }
  };

  const cerrarModalContrasena = () => {
    setUsuarioContrasena(null);
    setMensajeContrasena('');
    setVista('listado');
    subirAlInicio();
  };

  const cerrarModalAccesoForzado = () => {
    if (
      vistaAcceso === 'recuperacion' &&
      usuarioAcceso?.contrasenaTemporal &&
      !usuarioAcceso?.debeCambiarContrasena
    ) {
      setMostrarAvisoCierreAcceso(true);
      return;
    }

    setUsuarioAcceso(null);
    setVistaAcceso('menu');
    setMostrarAvisoCierreAcceso(false);
    setMensajeContrasena('');
  };

  const cerrarModalAcceso = () => {
    setUsuarioAcceso(null);
    setVistaAcceso('menu');
    setMostrarAvisoCierreAcceso(false);
    setMensajeContrasena('');
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

                <button
                  type="button"
                  className="usuarios__boton-crear"
                  onClick={abrirCrear}
                >
                  Crear usuario
                </button>

                {totalPaginas > 1 && (
                  <div className="usuarios__paginacion-mini usuarios__paginacion-mini--tabla">
                    <button
                      type="button"
                      onClick={() => setPagina((prev) => Math.max(prev - 1, 1))}
                      disabled={pagina === 1}
                    >
                      ←
                    </button>

                    <span>{pagina}/{totalPaginas}</span>

                    <button
                      type="button"
                      onClick={() =>
                        setPagina((prev) => Math.min(prev + 1, totalPaginas))
                      }
                      disabled={pagina === totalPaginas}
                    >
                      →
                    </button>
                  </div>
                )}
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
                          className={`usuarios__badge ${obtenerClaseBadgeRol(
                            usuario.rolNombre
                          )}`}
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
                            onClick={() =>
                              usuario.debeCambiarContrasena
                                ? regenerarContrasena(usuario)
                                : prepararAcceso(usuario)
                            }
                            disabled={guardando}
                          >
                            {usuario.debeCambiarContrasena ? 'Contraseña' : 'Acceso'}
                          </button>

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

          <div className="usuarios__roles-panel">
            <div className="usuarios__roles-header">
              <div>
                <h2>Roles de acceso</h2>
                <p>{rolesFiltrados.length} resultados</p>
              </div>

              <div className="usuarios__header-derecha">
                <div className="usuarios__buscador">
                  <input
                    type="text"
                    placeholder="Buscar rol..."
                    value={busquedaRol}
                    onChange={(evento) => {
                      setBusquedaRol(evento.target.value);
                      setPaginaRoles(1);
                    }}
                  />

                  {busquedaRol.trim().length > 0 && (
                    <button
                      type="button"
                      className="usuarios__limpiar-busqueda"
                      onClick={() => {
                        setBusquedaRol('');
                        setPaginaRoles(1);
                      }}
                      aria-label="Limpiar busqueda de roles"
                    >
                      ×
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className="usuarios__boton-crear"
                  onClick={abrirCrearRol}
                  disabled={guardando}
                >
                  Crear rol
                </button>

                {totalPaginasRoles > 1 && (
                  <div className="usuarios__paginacion-mini usuarios__paginacion-mini--roles">
                    <button
                      type="button"
                      onClick={() =>
                        setPaginaRoles((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={paginaRoles === 1}
                    >
                      ←
                    </button>

                    <span>{paginaRoles}/{totalPaginasRoles}</span>

                    <button
                      type="button"
                      onClick={() =>
                        setPaginaRoles((prev) =>
                          Math.min(prev + 1, totalPaginasRoles)
                        )
                      }
                      disabled={paginaRoles === totalPaginasRoles}
                    >
                      →
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="usuarios__tabla-contenedor">
              <table className="usuarios__tabla usuarios__tabla--roles">
                <thead>
                  <tr>
                    <th>Rol</th>
                    <th>Descripcion</th>
                    <th>Permisos</th>
                    <th>Usuarios</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {rolesVisibles.map((rol) => {
                    const totalUsuariosRol =
                      conteoUsuariosPorRol[Number(rol.idRol)] || 0;
                    const permisosRol = rol.permisos || [];
                    const permisosExpandidos =
                      Boolean(rolesPermisosExpandidos[rol.idRol]);
                    const permisosVisibles = permisosExpandidos
                      ? permisosRol
                      : permisosRol.slice(0, 3);
                    const permisosOcultos = Math.max(
                      permisosRol.length - permisosVisibles.length,
                      0
                    );

                    return (
                      <tr key={rol.idRol}>
                        <td>
                          <span
                            className={`usuarios__badge ${obtenerClaseBadgeRol(
                              rol.nombreRol
                            )}`}
                          >
                            {rol.nombreRol}
                          </span>
                        </td>
                        <td>{rol.descripcion || 'Sin descripcion'}</td>
                        <td>
                          <div className="usuarios__permisos-lista">
                            {permisosVisibles.map((permiso) => (
                              <span key={permiso.idPermiso}>
                                {permiso.nombrePermiso}
                              </span>
                            ))}

                            {permisosRol.length === 0 && (
                              <span>Sin permisos</span>
                            )}

                            {permisosRol.length > 3 && (
                              <button
                                type="button"
                                className="usuarios__permisos-toggle"
                                onClick={() =>
                                  alternarPermisosRolExpandido(rol.idRol)
                                }
                              >
                                {permisosExpandidos
                                  ? 'Ver menos'
                                  : `Ver ${permisosOcultos} mas`}
                              </button>
                            )}
                          </div>
                        </td>
                        <td>{totalUsuariosRol}</td>
                        <td>
                          <div className="usuarios__acciones">
                            <button
                              type="button"
                              onClick={() => prepararEditarRol(rol)}
                              disabled={guardando}
                            >
                              Editar
                            </button>

                            <button
                              type="button"
                              className="usuarios__accion-eliminar"
                              onClick={() => prepararEliminarRol(rol)}
                              disabled={guardando}
                              title={
                                totalUsuariosRol > 0
                                  ? 'No se puede eliminar porque tiene usuarios asociados.'
                                  : 'Eliminar rol'
                              }
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {rolesFiltrados.length === 0 && (
                    <tr>
                      <td colSpan="5">
                        <p className="usuarios__sin-datos">
                          No se encontraron roles.
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

      {vista === 'rol' && (
        <>
          <button
            type="button"
            className="usuarios__volver usuarios__volver--form"
            onClick={abrirListado}
            aria-label="Volver a roles"
          >
            ←
          </button>

          <div className="usuarios__form-titulo">
            {rolEditando ? (
              <h1>
                Editar <span>rol</span>
              </h1>
            ) : (
              <h1>
                Crear <span>rol</span>
              </h1>
            )}
            <p>
              {rolEditando
                ? 'Actualiza el nombre, la descripcion y los permisos del rol seleccionado.'
                : 'Define un nuevo rol y selecciona los permisos que tendra en la plataforma.'}
            </p>
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

          <form
            className="usuarios__form-card usuarios__form-card--rol"
            onSubmit={guardarRol}
          >
            <div className="usuarios__rol-form">
              <div className="usuarios__campo">
                <label htmlFor="nombreRol">
                  {rolEditando ? 'Nombre del rol' : 'Nuevo rol'}
                </label>
                <input
                  id="nombreRol"
                  type="text"
                  placeholder="Nombre del rol"
                  value={rolForm.nombreRol}
                  onChange={(evento) =>
                    actualizarCampoRol('nombreRol', evento.target.value)
                  }
                  disabled={guardando}
                />
              </div>

              <div className="usuarios__campo">
                <label htmlFor="descripcionRol">Descripcion</label>
                <input
                  id="descripcionRol"
                  type="text"
                  placeholder="Descripcion breve"
                  value={rolForm.descripcion}
                  onChange={(evento) =>
                    actualizarCampoRol('descripcion', evento.target.value)
                  }
                  disabled={guardando}
                />
              </div>

              <fieldset className="usuarios__permisos">
                <legend>Permisos</legend>

                <div className="usuarios__permisos-grid">
                  {permisos.map((permiso) => {
                    const moduloPermiso = obtenerModuloPermiso(
                      permiso.nombrePermiso
                    );

                    return (
                      <label
                        key={permiso.idPermiso}
                        className="usuarios__permiso-opcion"
                      >
                        <input
                          type="checkbox"
                          checked={rolForm.permisosIds.includes(
                            Number(permiso.idPermiso)
                          )}
                          onChange={() =>
                            alternarPermisoRol(permiso.idPermiso)
                          }
                          disabled={guardando}
                        />
                        <span className="usuarios__permiso-contenido">
                          <span className="usuarios__permiso-nombre">
                            {permiso.nombrePermiso}
                          </span>
                          <span
                            className={`usuarios__permiso-etiqueta usuarios__permiso-etiqueta--${moduloPermiso.clase}`}
                          >
                            {moduloPermiso.nombre}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
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
                  : rolEditando
                    ? rolFormSinCambios
                      ? 'Guardar sin cambios'
                      : 'Guardar rol'
                    : 'Crear rol'}
              </button>
            </div>
          </form>
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
                    placeholder="nombre@hitss.com"
                    value={form.correo}
                    onChange={(evento) =>
                      actualizarCampo('correo', evento.target.value)
                    }
                  />
                </div>
                <small>Solo se aceptan correos con dominio @hitss.com.</small>
              </div>

              <div className="usuarios__campo usuarios__campo--full">
                <SelectBuscable
                  id="rolUsuario"
                  label="Rol"
                  placeholder="Seleccione rol"
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

      {rolEliminando && (
        <div className="usuarios__modal-fondo">
          <div className="usuarios__modal usuarios__modal--confirmacion usuarios__modal--eliminar">
            <button
              type="button"
              className="usuarios__modal-cerrar"
              onClick={() => setRolEliminando(null)}
              aria-label="Cerrar"
            >
              x
            </button>

            <h2>Eliminar rol</h2>
            <p>
              Estas seguro de eliminar el rol{' '}
              <strong>{rolEliminando.nombreRol}</strong>?
            </p>

            <div className="usuarios__modal-acciones">
              <button
                type="button"
                className="usuarios__boton-secundario"
                onClick={() => setRolEliminando(null)}
                disabled={guardando}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="usuarios__boton-eliminar"
                onClick={confirmarEliminarRol}
                disabled={guardando}
              >
                {guardando ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {usuarioAcceso && (
        <div className="usuarios__modal-fondo">
          <div className="usuarios__modal usuarios__modal--acceso">
            {vistaAcceso !== 'recuperacion' && (
              <button
                type="button"
                className="usuarios__modal-cerrar"
                onClick={cerrarModalAcceso}
                aria-label="Cerrar"
              >
                x
              </button>
            )}

            <h2>Gestionar acceso</h2>
            <p>
              {usuarioAcceso.nombre} {usuarioAcceso.apellido}
            </p>

            {vistaAcceso === 'menu' ? (
              <div className="usuarios__modal-scroll">
                {usuarioAcceso.activo && (
                  <button
                    type="button"
                    className="usuarios__access-card"
                    onClick={generarContrasenaTemporalAcceso}
                    disabled={guardando}
                  >
                    <strong>Olvidó su contraseña</strong>
                    <span>
                      Despues de entregar la contraseña temporal, obliga al usuario a cambiarla en el siguiente inicio de sesion.
                    </span>
                  </button>
                )}

                <div className="usuarios__access-section usuarios__access-section--danger">
                  <h3>{usuarioAcceso.activo ? 'Desactivar usuario' : 'Activar usuario'}</h3>
                  <p>
                    {usuarioAcceso.activo
                      ? 'Desactiva el usuario si no debe ingresar temporalmente a la plataforma.'
                      : 'Activa el usuario para permitirle iniciar sesion nuevamente.'}
                  </p>

                  <button
                    type="button"
                    className={usuarioAcceso.activo ? 'usuarios__boton-eliminar' : 'usuarios__boton-secundario'}
                    onClick={alternarEstadoDesdeAcceso}
                    disabled={guardando}
                  >
                    {usuarioAcceso.activo ? 'Desactivar usuario' : 'Activar usuario'}
                  </button>
                </div>

                {mensajeContrasena && (
                  <div className="usuarios__modal-feedback">
                    {mensajeContrasena}
                  </div>
                )}
              </div>
            ) : (
              <div className="usuarios__modal-scroll usuarios__modal-scroll--sin-scroll">
                <div className="usuarios__modal-icono">OK</div>
                <h2>Contraseña temporal creada</h2>
                <p>
                  La contraseña se genero automaticamente. Copiala y compartela
                  con el usuario para que pueda iniciar sesion en la plataforma.
                </p>

                {mensajeContrasena && (
                  <div className="usuarios__modal-feedback usuarios__modal-feedback--top">
                    {mensajeContrasena}
                  </div>
                )}

                <label>Contraseña temporal</label>
                <div className="usuarios__password-box">
                  <strong>{usuarioAcceso.contrasenaTemporal}</strong>
                  <button type="button" onClick={copiarContrasenaAcceso}>
                    Copiar
                  </button>
                </div>

                <div className="usuarios__info">
                  <span>i</span>
                  <p>Despues de entregar la contraseña temporal, obliga al usuario a cambiarla en el siguiente inicio de sesion.</p>
                </div>

              </div>
            )}

            <button
              type="button"
              className={vistaAcceso === 'recuperacion' ? 'usuarios__boton-cambio usuarios__boton-ancho' : 'usuarios__modal-boton'}
              onClick={vistaAcceso === 'recuperacion' ? forzarCambioContrasena : cerrarModalAccesoForzado}
              disabled={vistaAcceso === 'recuperacion' && (guardando || usuarioAcceso.debeCambiarContrasena)}
            >
              {vistaAcceso === 'recuperacion'
                ? usuarioAcceso.debeCambiarContrasena
                  ? 'Cambio obligatorio activado'
                  : 'Obligar cambio en el siguiente inicio de sesión'
                : 'Cerrar'}
            </button>

            {mostrarAvisoCierreAcceso && (
              <div className="usuarios__access-warning-layer">
                <div className="usuarios__access-warning">
                  <h3>Cambio obligatorio pendiente</h3>
                  <p>
                    Vuelve y pulsa <strong>Obligar cambio en el siguiente inicio de sesión</strong> para que el usuario cree una nueva contraseña.
                  </p>

                  <div className="usuarios__access-warning-actions">
                    <button
                      type="button"
                      className="usuarios__boton-secundario"
                      onClick={() => setMostrarAvisoCierreAcceso(false)}
                    >
                      Volver
                    </button>

                    <button
                      type="button"
                      className="usuarios__boton-cambio"
                      onClick={cerrarModalAcceso}
                    >
                      Cerrar sin aplicar
                    </button>
                  </div>
                </div>
              </div>
            )}
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



