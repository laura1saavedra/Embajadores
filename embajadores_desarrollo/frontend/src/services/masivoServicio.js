/**
 * services/masivoServicio.js
 *
 * Servicio de datos para incidentes masivos.
 * Normaliza respuestas snake_case del backend al formato camelCase
 * que usan los componentes React.
 */

import apiClient from './api';
import config from '../config/config';

// ── Normalizadores ──────────────────────────────────────────────────────────

const normalizarIncidenteDeCav = (i) => ({
  idIncidente: i.id_incidente,

  idAplicacionesAfectados: i.id_aplicaciones_afectados || null,
  aplicacionId: String(i.aplicacion_id || ''),
  tipoFallaId: String(i.tipo_falla_id || ''),

  usuariosAfectados: i.usuarios_afectados ?? 0,
  usuariosTotalidad: i.usuarios_totalidad ?? null,

  estado: i.estado || 'abierto',
  fechaHoraReporte: i.fecha_hora_reporte || null,
});

const normalizarCavAfectado = (cav) => ({
  cavId: String(cav.cav_id || ''),
  cavNombre: cav.cav_nombre || '',

  ciudadId: String(cav.ciudad_id || ''),
  ciudadNombre: cav.ciudad_nombre || '',

  usuariosAfectados: cav.usuarios_afectados ?? 0,
  usuariosTotalidad: cav.usuarios_totalidad ?? null,

  cantidadIncidentes: cav.cantidad_incidentes ?? 0,

  incidentes: Array.isArray(cav.incidentes)
    ? cav.incidentes.map(normalizarIncidenteDeCav)
    : [],
});

const normalizarMasivo = (m) => ({
  idMasivo: m.idmasivo,

  aplicacionId: String(m.aplicacion_id || ''),
  aplicacionNombre: m.nombre_aplicacion || '',

  tipoFallaId: String(m.tipo_falla_id || ''),
  tipoFallaNombre: m.nombre_tipo_falla || '',

  usuariosTotales: m.usuarios_totales ?? null,
  usuariosAfectados: m.usuarios_totales_afectados ?? 0,

  cantidadIncidentes: m.cantidad_incidentes ?? 0,
  cantidadCavs: m.cantidad_cavs_afectados ?? 0,

  estado: m.estado || 'abierto',

  fechaHoraGenerado: m.fecha_hora_generado || null,
  fechaHoraCierre: m.fecha_hora_cierre || null,

  diasActivos: m.dias_activos ?? null,
});

const normalizarDetalleMasivo = (m) => ({
  ...normalizarMasivo(m),

  cavsAfectados: Array.isArray(m.cavs_afectados)
    ? m.cavs_afectados.map(normalizarCavAfectado)
    : [],
});

// ── Servicio ────────────────────────────────────────────────────────────────

class MasivoServicio {
  async listarMasivos(filtros = {}) {
    const params = new URLSearchParams();

    if (filtros.aplicacionId) {
      params.append('aplicacion_id', filtros.aplicacionId);
    }

    if (filtros.tipoFallaId) {
      params.append('tipo_falla_id', filtros.tipoFallaId);
    }

    const query = params.toString() ? `?${params.toString()}` : '';

    const { data } = await apiClient.get(config.endpoints.masivos(query));

    return (data || []).map(normalizarMasivo);
  }

  async obtenerResumen() {
    const { data } = await apiClient.get(config.endpoints.masivoResumen());

    return data || {
      total: 0,
      abiertos: 0,
      cerrados: 0,
    };
  }

  async obtenerMasivoPorId(idMasivo) {
    const { data } = await apiClient.get(
      config.endpoints.masivoById(idMasivo)
    );

    return normalizarDetalleMasivo(data);
  }

  async cerrarMasivo(idMasivo) {
    const { data } = await apiClient.patch(
      config.endpoints.masivoCerrar(idMasivo),
      { estado: 'cerrado' }
    );

    return data;
  }
}

const masivoServicio = new MasivoServicio();

export default masivoServicio;