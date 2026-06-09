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
});

const normalizarAplicacionesAfectadas = (raw) => {
  if (!Array.isArray(raw)) return [];

  return raw.map((item) => {
    const masivoId = item.masivo_id ?? null;

    return {
      idAplicacionesAfectados: String(item.id_aplicaciones_afectados || ''),
      aplicacionId: String(item.aplicacion_id || ''),
      aplicacionNombre: item.nombre_aplicacion || '',
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

    mensaje: i.mensaje || '',

    usuariosAfectados: i.usuarios_afectados ?? 0,
    usuariosTotalidad: i.usuarios_totalidad ?? null,

    estado: i.estado || 'abierto',
    fechaHoraReporte: i.fecha_hora_reporte || null,

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

// ── Convertidores: form (camelCase) → backend (snake_case) ───────────────────

const prepararCrear = (form) => ({
  cav_id: parseInt(form.cavId, 10),

  usuario_id:
    form.usuarioId !== undefined && form.usuarioId !== ''
      ? parseInt(form.usuarioId, 10)
      : null,

  usuarios_afectados: parseInt(form.usuariosAfectados, 10),

  usuarios_totalidad:
    form.usuariosTotalidad !== undefined && form.usuariosTotalidad !== ''
      ? parseInt(form.usuariosTotalidad, 10)
      : null,

  aplicaciones_afectadas: (form.filasAplicaciones || []).map((f) => ({
    aplicacion_id: parseInt(f.aplicacionId, 10),
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

  if (datos.usuariosTotalidad !== undefined) {
    payload.usuarios_totalidad =
      datos.usuariosTotalidad !== ''
        ? parseInt(datos.usuariosTotalidad, 10)
        : null;
  }

  if (Array.isArray(datos.filasAplicaciones)) {
    payload.aplicaciones_afectadas = datos.filasAplicaciones.map((f) => ({
      aplicacion_id: parseInt(f.aplicacionId, 10),
      tipo_falla_id: parseInt(f.tipoFallaId, 10),
    }));
  }

  return payload;
};

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
    const { data } = await apiClient.get(config.endpoints.aplicaciones());
    return (data || []).map(normalizarAplicacion);
  }

  async obtenerTiposFalla() {
    const { data } = await apiClient.get(config.endpoints.tiposFalla());

    return (data || []).map((t) => ({
      id: String(t.id_tipo_falla),
      nombre: t.nombre_tipo,
    }));
  }

  async listarIncidentes(filtros = {}) {
    const params = new URLSearchParams();

    if (filtros.estado) params.append('estado', filtros.estado);
    if (filtros.ciudadId) params.append('ciudad_id', filtros.ciudadId);
    if (filtros.cavId) params.append('cav_id', filtros.cavId);
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
}

const incidenteServicio = new IncidenteServicio();

export default incidenteServicio;