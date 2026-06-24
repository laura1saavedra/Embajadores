/**
 * services/incidenteServicio.js
 *
 * Servicio de datos para incidentes conectado a la API real.
 * Normaliza las respuestas snake_case del backend al formato camelCase
 * que usan los componentes React.
 */

import apiClient from './api.js';
import config from '../config/config.js';

// ── Normalizadores: backend (snake_case) → componentes (camelCase) ────────────

const capitalizar = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

const normalizarCiudad = (c) => ({
  idCiudad: String(c.id_ciudad),
  nombreCiudad: c.nombre_ciudad,
});

const normalizarCav = (c) => ({
  idCav: String(c.id_cav),
  nombreCav: c.nombre_cav,
  ciudadId: String(c.ciudad_id),
});

const normalizarUsuario = (u) => ({
  idUsuario: String(u.id_usuario),
  nombre: `${u.nombre || ''} ${u.apellido || ''}`.trim(),
  correo: u.correo || '',
});

const normalizarAplicacion = (a) => ({
  id: String(a.id_aplicacion),
  nombre: a.nombre_aplicacion,
  activo: a.activo !== false,
});

const normalizarServicio = (s) => ({
  id: String(s.id_servicio),
  nombre: s.nombre_servicio,
  aplicacionId: String(s.aplicacion_id || ''),
  activo: s.activo !== false,
});

const normalizarAplicacionesAfectadas = (raw) => {
  if (!Array.isArray(raw)) return [];

  return raw.map((item) => {
    const masivoId = item.masivo_id ?? null;

    return {
      idAplicacionesAfectados: String(item.id_aplicaciones_afectados || ''),
      aplicacionId: String(item.aplicacion_id || ''),
      aplicacionNombre: item.nombre_aplicacion || '',
      servicioId: String(item.servicio_id || ''),
      servicioNombre: item.nombre_servicio || '',
      tipoFallaId: String(item.tipo_falla_id || ''),
      tipoFallaNombre: item.nombre_tipo || '',

      masivoId,
      perteneceAMasivo: masivoId !== null,
    };
  });
};

const crearTextoResumido = (lista = [], limite = 2) => {
  const elementos = lista.filter(Boolean);

  if (elementos.length <= limite) {
    return elementos.join(', ');
  }

  return `${elementos.slice(0, limite).join(', ')} +${
    elementos.length - limite
  } más`;
};

const normalizarIncidente = (i) => {
  const aplicacionesAfectadas = normalizarAplicacionesAfectadas(
    i.aplicaciones_afectadas
  );

  const masivosIdsDesdeAplicaciones = aplicacionesAfectadas
    .map((app) => app.masivoId)
    .filter((id) => id !== null && id !== undefined);

  const masivosIdsBackend = Array.isArray(i.masivos_ids)
    ? i.masivos_ids
    : i.masivo_id
      ? [i.masivo_id]
      : [];

  const masivosIds = [
    ...new Set([...masivosIdsBackend, ...masivosIdsDesdeAplicaciones]),
  ];

  return {
    idIncidente: i.id_incidente,

    ciudadId: String(i.ciudad_id || ''),
    ciudadNombre: i.ciudad_nombre || '',

    cavId: String(i.cav_id || ''),
    cavNombre: i.cav_nombre || '',

    usuarioId: String(i.usuario_id || ''),
    usuarioNombre: i.usuario_nombre || '',
    usuarioCorreo: i.usuario_correo || '',

    masivoId: masivosIds.length > 0 ? masivosIds[0] : null,
    masivosIds,

    perteneceAMasivo:
      Boolean(i.pertenece_a_masivo) || masivosIds.length > 0,

    tieneAplicacionesIndividuales:
      Boolean(i.tiene_aplicaciones_individuales),

    tieneAplicacionesMasivas:
      Boolean(i.tiene_aplicaciones_masivas),

    tipoRegistro: i.tipo_registro || '',

    mensaje: i.mensaje || '',

    usuariosAfectados: i.usuarios_afectados ?? 0,
    usuariosOperacion: i.usuarios_operacion ?? null,

    estado: i.estado || 'abierto',
    fechaHoraReporte: i.fecha_hora_reporte || null,
    fechaHoraCierre: i.fecha_hora_cierre || null,

    aplicacionesAfectadas,

    aplicacionesTexto: crearTextoResumido(
      aplicacionesAfectadas.map((a) => a.aplicacionNombre),
      2
    ),

    tiposFallaTexto: crearTextoResumido(
      aplicacionesAfectadas.map((a) => a.tipoFallaNombre),
      2
    ),
  };
};

const normalizarHistorial = (h) => ({
  idHistorial: h.id_historial,
  incidenteId: h.incidente_id,

  estadoAnterior: h.estado_anterior || '',
  estadoNuevo: h.estado_nuevo || '',

  tipoEvento: h.estado_anterior
    ? `${capitalizar(h.estado_anterior)} → ${capitalizar(h.estado_nuevo)}`
    : `Creación: ${capitalizar(h.estado_nuevo || 'abierto')}`,

  fechaCambio: h.fecha_cambio || null,
});

const normalizarContacto = (c) => ({
  idContacto: c.id_contacto,
  contactoNombre: c.nombre_contacto || c.nombre_grupo || '',
  numeroCelular: c.numero_celular || '',
  tokenWp: c.token_wp || '',
  tipo: c.tipo || (String(c.token_wp || '').endsWith('@g.us') ? 'grupo' : 'persona'),
});

// ── Convertidores: form (camelCase) → backend (snake_case) ───────────────────

const prepararCrear = (form) => ({
  cav_id: parseInt(form.cavId, 10),

  usuario_id:
    form.usuarioId !== undefined && form.usuarioId !== ''
      ? parseInt(form.usuarioId, 10)
      : null,

  usuarios_afectados: parseInt(form.usuariosAfectados, 10),

  usuarios_operacion:
    form.usuariosOperacion !== undefined && form.usuariosOperacion !== ''
      ? parseInt(form.usuariosOperacion, 10)
      : null,

  aplicaciones_afectadas: (form.filasAplicaciones || []).map((f) => ({
    aplicacion_id: parseInt(f.aplicacionId, 10),
    servicio_id: f.servicioId ? parseInt(f.servicioId, 10) : null,
    tipo_falla_id: parseInt(f.tipoFallaId, 10),
  })),
});

const prepararActualizar = (datos) => {
  const payload = {};

  if (datos.ciudadId !== undefined && datos.ciudadId !== '') {
    payload.ciudad_id = parseInt(datos.ciudadId, 10);
  }

  if (datos.cavId !== undefined && datos.cavId !== '') {
    payload.cav_id = parseInt(datos.cavId, 10);
  }

  if (datos.usuariosAfectados !== undefined && datos.usuariosAfectados !== '') {
    payload.usuarios_afectados = parseInt(datos.usuariosAfectados, 10);
  }

  if (datos.usuariosOperacion !== undefined) {
    payload.usuarios_operacion =
      datos.usuariosOperacion !== ''
        ? parseInt(datos.usuariosOperacion, 10)
        : null;
  }

  if (datos.estado !== undefined && datos.estado !== '') {
    payload.estado = datos.estado;
  }

  if (Array.isArray(datos.filasAplicaciones)) {
    payload.aplicaciones_afectadas = datos.filasAplicaciones.map((f) => ({
      aplicacion_id: parseInt(f.aplicacionId, 10),
      servicio_id: f.servicioId ? parseInt(f.servicioId, 10) : null,
      tipo_falla_id: parseInt(f.tipoFallaId, 10),
    }));
  }

  return payload;
};

const prepararContacto = (datos) => ({
  nombre_contacto: datos.nombreContacto,
  numero_celular: datos.numeroCelular || null,
  token_wp: datos.tokenWp || null,
  tipo: datos.tipo || 'persona',
});

// ── Clase principal ──────────────────────────────────────────────────────────

class IncidenteServicio {
  async obtenerCiudades() {
    const { data } = await apiClient.get(config.endpoints.ciudades());
    return (data || []).map(normalizarCiudad);
  }

  async obtenerCavsPorCiudad(ciudadId) {
    const { data } = await apiClient.get(config.endpoints.cavs(ciudadId));
    return (data || []).map(normalizarCav);
  }

  async obtenerUsuarios() {
    const { data } = await apiClient.get(config.endpoints.usuarios());
    return (data || []).map(normalizarUsuario);
  }

  async obtenerAplicaciones() {
    const { data } = await apiClient.get(
      `${config.endpoints.aplicaciones()}?solo_activos=true`
    );
    return (data || []).map(normalizarAplicacion);
  }

  async obtenerServicios() {
    const { data } = await apiClient.get(
      `${config.endpoints.servicios()}?solo_activos=true`
    );
    return (data || []).map(normalizarServicio);
  }

  async obtenerTiposFalla() {
    const { data } = await apiClient.get(
      `${config.endpoints.tiposFalla()}?solo_activos=true`
    );

    return (data || []).map((t) => ({
      id: String(t.id_tipo_falla),
      nombre: t.nombre_tipo,
      activo: t.activo !== false,
    }));
  }

  async listarIncidentes(filtros = {}) {
    const params = new URLSearchParams();

    if (filtros.estado) params.append('estado', filtros.estado);
    if (filtros.ciudadId) params.append('ciudad_id', filtros.ciudadId);
    if (filtros.cavId) params.append('cav_id', filtros.cavId);
    if (filtros.aplicacionId) {
      params.append('aplicacion_id', filtros.aplicacionId);
    }
    if (filtros.tipoFalla) params.append('tipo_falla', filtros.tipoFalla);
    if (filtros.busqueda) params.append('busqueda', filtros.busqueda);
    if (filtros.anio) params.append('anio', filtros.anio);
    if (filtros.mes) params.append('mes', filtros.mes);
    if (filtros.dia) params.append('dia', filtros.dia);

    const query = params.toString() ? `?${params.toString()}` : '';

    const { data } = await apiClient.get(config.endpoints.incidentes(query));

    return (data || []).map(normalizarIncidente);
  }

  async obtenerResumen() {
    const { data } = await apiClient.get(config.endpoints.incidenteResumen());

    return data || {
      total: 0,
      abiertos: 0,
      cerrados: 0,
    };
  }

  async crearIncidente(datosFormulario) {
    const payload = prepararCrear(datosFormulario);

    const { data } = await apiClient.post(
      config.endpoints.incidentes(),
      payload
    );

    return normalizarIncidente(data);
  }

  async obtenerIncidentePorId(idIncidente) {
    const { data } = await apiClient.get(
      config.endpoints.incidenteById(idIncidente)
    );

    return normalizarIncidente(data);
  }

  async editarIncidente(idIncidente, datos) {
    const payload = prepararActualizar(datos);

    const { data } = await apiClient.put(
      config.endpoints.incidenteById(idIncidente),
      payload
    );

    return normalizarIncidente(data);
  }

  async actualizarEstadoIncidente(idIncidente, nuevoEstado) {
    const { data } = await apiClient.patch(
      config.endpoints.incidenteEstado(idIncidente),
      { estado: nuevoEstado }
    );

    return normalizarIncidente(data);
  }

  async obtenerHistorialPorIncidente(idIncidente) {
    const { data } = await apiClient.get(
      config.endpoints.incidenteHistorial(idIncidente)
    );

    return (data || []).map(normalizarHistorial);
  }

  async obtenerNotificacionesPorIncidente(idIncidente) {
    return this.obtenerHistorialPorIncidente(idIncidente);
  }

  async eliminarIncidente(idIncidente) {
    const { data } = await apiClient.delete(
      config.endpoints.incidenteById(idIncidente)
    );

    return data;
  }

  async obtenerContactos() {
    const { data } = await apiClient.get(config.endpoints.contactos());

    return (data || []).map(normalizarContacto);
  }

  async crearContacto(datos) {
    const { data } = await apiClient.post(
      config.endpoints.contactos(),
      prepararContacto(datos)
    );

    return normalizarContacto(data);
  }

  async actualizarContacto(idContacto, datos) {
    const { data } = await apiClient.put(
      `${config.endpoints.contactos()}/${idContacto}`,
      prepararContacto(datos)
    );

    return normalizarContacto(data);
  }

  async eliminarContacto(idContacto) {
    const { data } = await apiClient.delete(
      `${config.endpoints.contactos()}/${idContacto}`
    );

    return data;
  }
}

const incidenteServicio = new IncidenteServicio();

export default incidenteServicio;

