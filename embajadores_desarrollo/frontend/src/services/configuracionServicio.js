/**
 * services/configuracionServicio.js
 *
 * Servicio para Configuración Avanzada.
 * Maneja Aplicaciones, Tipos de falla, Usuarios, Ciudades y CAVs.
 */

import apiClient from './api.js';
import config from '../config/config.js';

// ── Normalizadores ─────────────────────────────────────────────

const normalizarAplicacion = (app) => ({
  idAplicacion: app.id_aplicacion,
  nombreAplicacion: app.nombre_aplicacion,
  activo: app.activo !== false,
  servicios: Array.isArray(app.servicios)
    ? app.servicios.map((servicio) => ({
        idServicio: servicio.id_servicio,
        nombreServicio: servicio.nombre_servicio,
        aplicacionId: servicio.aplicacion_id,
        activo: servicio.activo !== false,
      }))
    : [],
});

const normalizarServicio = (servicio) => ({
  idServicio: servicio.id_servicio,
  nombreServicio: servicio.nombre_servicio,
  aplicacionId: servicio.aplicacion_id,
  nombreAplicacion: servicio.nombre_aplicacion ?? '',
  activo: servicio.activo !== false,
});

const asociarServiciosAAplicaciones = (aplicaciones, servicios) => {
  const serviciosPorAplicacion = servicios.reduce((agrupados, servicio) => {
    const aplicacionId = Number(servicio.aplicacionId);

    if (!agrupados.has(aplicacionId)) {
      agrupados.set(aplicacionId, []);
    }

    agrupados.get(aplicacionId).push(servicio);
    return agrupados;
  }, new Map());

  return aplicaciones.map((app) => ({
    ...app,
    servicios: serviciosPorAplicacion.get(Number(app.idAplicacion)) || app.servicios || [],
  }));
};

const normalizarTipoFalla = (tipo) => ({
  idTipoFalla: tipo.id_tipo_falla,
  nombreTipo: tipo.nombre_tipo,
  activo: tipo.activo !== false,
});

const normalizarCavSimple = (cav) => ({
  idCav: cav.id_cav,
  nombreCav: cav.nombre_cav,
  activo: cav.activo !== false,
  ciudadId: cav.ciudad_id ?? null,
  ciudadNombre: cav.ciudad_nombre ?? '',
  direccion: cav.direccion ?? '',
  nombreJefe: cav.nombre_jefe ?? '',
  nombreSupervisor: cav.nombre_supervisor ?? '',
  numeroTerminales: cav.numero_terminales ?? '',
});

const normalizarCiudad = (ciudad) => ({
  idCiudad: ciudad.id_ciudad,
  nombreCiudad: ciudad.nombre_ciudad,
  activo: ciudad.activo !== false,
  cavs: Array.isArray(ciudad.cavs)
    ? ciudad.cavs.map((cav) => ({
        idCav: cav.id_cav,
        nombreCav: cav.nombre_cav,
        activo: cav.activo !== false,
        direccion: cav.direccion ?? '',
        nombreJefe: cav.nombre_jefe ?? '',
        nombreSupervisor: cav.nombre_supervisor ?? '',
        numeroTerminales: cav.numero_terminales ?? '',
      }))
    : [],
});

const normalizarRol = (rol) => ({
  idRol: rol.idrol,
  nombreRol: rol.nombre_rol,
  descripcion: rol.descripcion ?? '',
  permisosIds: Array.isArray(rol.permisos_ids)
    ? rol.permisos_ids.map(Number)
    : [],
  permisos: Array.isArray(rol.permisos)
    ? rol.permisos.map((permiso) => ({
        idPermiso: permiso.idpermisos,
        nombrePermiso: permiso.nombre_permiso,
      }))
    : [],
});

const normalizarPermiso = (permiso) => ({
  idPermiso: permiso.idpermisos,
  nombrePermiso: permiso.nombre_permiso,
});

const normalizarUsuario = (usuario) => ({
  idUsuario: usuario.id_usuario,
  nombre: usuario.nombre,
  apellido: usuario.apellido,
  correo: usuario.correo,
  rolId: usuario.rol_id,
  rolNombre: usuario.rol_nombre ?? '',
  activo: Boolean(usuario.activo),
  debeCambiarContrasena: Boolean(usuario.debe_cambiar_contrasena),
  fechaCreacion: usuario.fecha_creacion ?? null,
  fechaActualizacion: usuario.fecha_actualizacion ?? null,
  ultimoLogin: usuario.ultimo_login ?? null,
  intentosFallidos: usuario.intentos_fallidos ?? 0,
  bloqueadoHasta: usuario.bloqueado_hasta ?? null,
  contrasenaTemporal: usuario.contrasena_temporal ?? '',
});

// ── Servicio ───────────────────────────────────────────────────

class ConfiguracionServicio {
  // ─────────────────────────────────────────────────────────────
  // Aplicaciones
  // ─────────────────────────────────────────────────────────────

  async listarAplicaciones() {
    const [{ data: aplicacionesData }, { data: serviciosData }] = await Promise.all([
      apiClient.get(config.endpoints.aplicaciones()),
      apiClient.get(config.endpoints.servicios()),
    ]);

    const aplicaciones = (aplicacionesData || []).map(normalizarAplicacion);
    const servicios = (serviciosData || []).map(normalizarServicio);

    return asociarServiciosAAplicaciones(aplicaciones, servicios);
  }

  async crearAplicacion(nombreAplicacion) {
    const { data } = await apiClient.post(config.endpoints.aplicaciones(), {
      nombre_aplicacion: nombreAplicacion,
    });

    return normalizarAplicacion(data);
  }

  async actualizarAplicacion(idAplicacion, nombreAplicacion) {
    const { data } = await apiClient.put(
      `${config.endpoints.aplicaciones()}/${idAplicacion}`,
      {
        nombre_aplicacion: nombreAplicacion,
      }
    );

    return normalizarAplicacion(data);
  }

  async eliminarAplicacion(idAplicacion) {
    const { data } = await apiClient.delete(
      `${config.endpoints.aplicaciones()}/${idAplicacion}`
    );

    return data;
  }

  async cambiarEstadoAplicacion(idAplicacion, activo) {
    const { data } = await apiClient.patch(
      `${config.endpoints.aplicaciones()}/${idAplicacion}/estado`,
      { activo }
    );

    return normalizarAplicacion(data);
  }

  // Servicios

  async listarServicios(aplicacionId = '') {
    const url = aplicacionId
      ? `${config.endpoints.servicios()}?aplicacion_id=${aplicacionId}`
      : config.endpoints.servicios();

    const { data } = await apiClient.get(url);
    return (data || []).map(normalizarServicio);
  }

  async crearServicio(nombreServicio, aplicacionId) {
    const { data } = await apiClient.post(config.endpoints.servicios(), {
      nombre_servicio: nombreServicio,
      aplicacion_id: Number(aplicacionId),
    });

    return normalizarServicio(data);
  }

  async actualizarServicio(idServicio, nombreServicio, aplicacionId) {
    const { data } = await apiClient.put(
      `${config.endpoints.servicios()}/${idServicio}`,
      {
        nombre_servicio: nombreServicio,
        aplicacion_id: Number(aplicacionId),
      }
    );

    return normalizarServicio(data);
  }

  async eliminarServicio(idServicio) {
    const { data } = await apiClient.delete(
      `${config.endpoints.servicios()}/${idServicio}`
    );

    return data;
  }

  async cambiarEstadoServicio(idServicio, activo) {
    const { data } = await apiClient.patch(
      `${config.endpoints.servicios()}/${idServicio}/estado`,
      { activo }
    );

    return normalizarServicio(data);
  }

  // ─────────────────────────────────────────────────────────────
  // Tipos de falla
  // ─────────────────────────────────────────────────────────────

  async listarTiposFalla() {
    const { data } = await apiClient.get(config.endpoints.tiposFalla());
    return (data || []).map(normalizarTipoFalla);
  }

  async crearTipoFalla(nombreTipo) {
    const { data } = await apiClient.post(config.endpoints.tiposFalla(), {
      nombre_tipo: nombreTipo,
    });

    return normalizarTipoFalla(data);
  }

  async actualizarTipoFalla(idTipoFalla, nombreTipo) {
    const { data } = await apiClient.put(
      `${config.endpoints.tiposFalla()}/${idTipoFalla}`,
      {
        nombre_tipo: nombreTipo,
      }
    );

    return normalizarTipoFalla(data);
  }

  async eliminarTipoFalla(idTipoFalla) {
    const { data } = await apiClient.delete(
      `${config.endpoints.tiposFalla()}/${idTipoFalla}`
    );

    return data;
  }

  async cambiarEstadoTipoFalla(idTipoFalla, activo) {
    const { data } = await apiClient.patch(
      `${config.endpoints.tiposFalla()}/${idTipoFalla}/estado`,
      { activo }
    );

    return normalizarTipoFalla(data);
  }

  // ─────────────────────────────────────────────────────────────
  // Ciudades
  // ─────────────────────────────────────────────────────────────

  async listarCiudades() {
    const { data } = await apiClient.get(config.endpoints.ciudades());
    return (data || []).map(normalizarCiudad);
  }

  async obtenerCiudadPorId(idCiudad) {
    const { data } = await apiClient.get(
      `${config.endpoints.ciudades()}/${idCiudad}`
    );

    return normalizarCiudad(data);
  }

  async crearCiudad(nombreCiudad) {
    const { data } = await apiClient.post(config.endpoints.ciudades(), {
      nombre_ciudad: nombreCiudad,
    });

    return normalizarCiudad(data);
  }

  async crearCiudadCompleta(nombreCiudad, cavs = []) {
    const { data } = await apiClient.post(
      `${config.endpoints.ciudades()}/completa`,
      {
        nombre_ciudad: nombreCiudad,
        cavs: cavs.map((cav) => ({
          nombre_cav: cav.nombre,
          direccion: cav.info.direccion,
          nombre_jefe: cav.info.jefe,
          nombre_supervisor: cav.info.supervisor,
          numero_terminales: Number(cav.info.terminales),
        })),
      }
    );

    return normalizarCiudad(data);
  }

  async actualizarCiudad(idCiudad, nombreCiudad) {
    const { data } = await apiClient.put(
      `${config.endpoints.ciudades()}/${idCiudad}`,
      {
        nombre_ciudad: nombreCiudad,
      }
    );

    return normalizarCiudad(data);
  }

  async eliminarCiudad(idCiudad) {
    const { data } = await apiClient.delete(
      `${config.endpoints.ciudades()}/${idCiudad}`
    );

    return data;
  }

  async cambiarEstadoCiudad(idCiudad, activo) {
    const { data } = await apiClient.patch(
      `${config.endpoints.ciudades()}/${idCiudad}/estado`,
      { activo: Boolean(activo) }
    );

    return normalizarCiudad(data);
  }

  // ─────────────────────────────────────────────────────────────
  // CAVs
  // ─────────────────────────────────────────────────────────────

  async listarCavs(ciudadId = '') {
    const url = ciudadId
      ? `${config.endpoints.cavs()}?ciudad_id=${ciudadId}`
      : config.endpoints.cavs();

    const { data } = await apiClient.get(url);
    return (data || []).map(normalizarCavSimple);
  }

  async obtenerCavPorId(idCav) {
    const { data } = await apiClient.get(
      `${config.endpoints.cavs()}/${idCav}`
    );

    return normalizarCavSimple(data);
  }

  async crearCav(nombreCav, ciudadId, detalle = {}) {
    const { data } = await apiClient.post(config.endpoints.cavs(), {
      nombre_cav: nombreCav,
      ciudad_id: Number(ciudadId),
      direccion: detalle.direccion,
      nombre_jefe: detalle.nombreJefe,
      nombre_supervisor: detalle.nombreSupervisor,
      numero_terminales:
        detalle.numeroTerminales !== undefined
          ? Number(detalle.numeroTerminales)
          : undefined,
    });

    return normalizarCavSimple(data);
  }

  async actualizarCav(idCav, nombreCav, ciudadId, detalle = {}) {
    const { data } = await apiClient.put(
      `${config.endpoints.cavs()}/${idCav}`,
      {
        nombre_cav: nombreCav,
        ciudad_id: Number(ciudadId),
        direccion: detalle.direccion,
        nombre_jefe: detalle.nombreJefe,
        nombre_supervisor: detalle.nombreSupervisor,
        numero_terminales:
          detalle.numeroTerminales !== undefined
            ? Number(detalle.numeroTerminales)
            : undefined,
      }
    );

    return normalizarCavSimple(data);
  }

  async eliminarCav(idCav) {
    const { data } = await apiClient.delete(
      `${config.endpoints.cavs()}/${idCav}`
    );

    return data;
  }

  async cambiarEstadoCav(idCav, activo) {
    const { data } = await apiClient.patch(
      `${config.endpoints.cavs()}/${idCav}/estado`,
      { activo: Boolean(activo) }
    );

    return normalizarCavSimple(data);
  }

  // ─────────────────────────────────────────────────────────────
  // Usuarios
  // ─────────────────────────────────────────────────────────────

  async listarUsuarios({ soloActivos = false } = {}) {
    const url = soloActivos
      ? `${config.endpoints.usuarios()}?solo_activos=true`
      : config.endpoints.usuarios();

    const { data } = await apiClient.get(url);
    return (data || []).map(normalizarUsuario);
  }

  async listarRoles({ refrescar = false } = {}) {
    const cacheBuster = refrescar ? `?_=${Date.now()}` : '';
    const { data } = await apiClient.get(
      `${config.endpoints.usuarios()}/roles${cacheBuster}`
    );

    return (data || []).map(normalizarRol);
  }

  async listarPermisos() {
    const { data } = await apiClient.get(
      `${config.endpoints.usuarios()}/permisos`
    );

    return (data || []).map(normalizarPermiso);
  }

  async crearRol({ nombreRol, descripcion = '', permisosIds = [] }) {
    const { data } = await apiClient.post(
      `${config.endpoints.usuarios()}/roles`,
      {
        nombre_rol: nombreRol,
        descripcion,
        permisos_ids: permisosIds.map(Number),
      }
    );

    return normalizarRol(data);
  }

  async actualizarRol(idRol, { nombreRol, descripcion, permisosIds }) {
    const payload = {};

    if (nombreRol !== undefined) {
      payload.nombre_rol = nombreRol;
    }

    if (descripcion !== undefined) {
      payload.descripcion = descripcion;
    }

    if (permisosIds !== undefined) {
      payload.permisos_ids = permisosIds.map(Number);
    }

    const { data } = await apiClient.put(
      `${config.endpoints.usuarios()}/roles/${idRol}`,
      payload
    );

    return normalizarRol(data);
  }

  async eliminarRol(idRol) {
    const { data } = await apiClient.delete(
      `${config.endpoints.usuarios()}/roles/${idRol}`
    );

    return data;
  }

  async obtenerUsuarioPorId(idUsuario) {
    const { data } = await apiClient.get(
      `${config.endpoints.usuarios()}/${idUsuario}`
    );

    return normalizarUsuario(data);
  }

  async crearUsuario({ nombre, apellido, correo, rolId }) {
    const { data } = await apiClient.post(config.endpoints.usuarios(), {
      nombre,
      apellido,
      correo,
      rol_id: Number(rolId),
    });

    return normalizarUsuario(data);
  }

  async actualizarUsuario(idUsuario, datosUsuario) {
    const payload = {};

    if (datosUsuario.nombre !== undefined) {
      payload.nombre = datosUsuario.nombre;
    }

    if (datosUsuario.apellido !== undefined) {
      payload.apellido = datosUsuario.apellido;
    }

    if (datosUsuario.correo !== undefined) {
      payload.correo = datosUsuario.correo;
    }

    if (datosUsuario.rolId !== undefined) {
      payload.rol_id = Number(datosUsuario.rolId);
    }

    if (datosUsuario.activo !== undefined) {
      payload.activo = Boolean(datosUsuario.activo);
    }

    if (datosUsuario.debeCambiarContrasena !== undefined) {
      payload.debe_cambiar_contrasena = Boolean(
        datosUsuario.debeCambiarContrasena
      );
    }

    const { data } = await apiClient.put(
      `${config.endpoints.usuarios()}/${idUsuario}`,
      payload
    );

    return normalizarUsuario(data);
  }

  async cambiarEstadoUsuario(idUsuario, activo) {
    const { data } = await apiClient.patch(
      `${config.endpoints.usuarios()}/${idUsuario}/estado`,
      {
        activo: Boolean(activo),
      }
    );

    return normalizarUsuario(data);
  }

  async regenerarContrasenaUsuario(idUsuario) {
    const { data } = await apiClient.post(
      `${config.endpoints.usuarios()}/${idUsuario}/regenerar-contrasena`,
      {}
    );

    return normalizarUsuario(data);
  }

  async generarContrasenaAccesoUsuario(idUsuario) {
    const { data } = await apiClient.post(
      `${config.endpoints.usuarios()}/${idUsuario}/generar-contrasena-acceso`,
      {}
    );

    return normalizarUsuario(data);
  }

  async eliminarUsuario(idUsuario) {
    const { data } = await apiClient.delete(
      `${config.endpoints.usuarios()}/${idUsuario}`
    );

    return data;
  }
}

const configuracionServicio = new ConfiguracionServicio();

export default configuracionServicio;
