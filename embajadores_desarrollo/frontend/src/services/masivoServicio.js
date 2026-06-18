/**
 * services/masivoServicio.js
 *
 * Servicio de datos para incidentes masivos.
 * Normaliza respuestas snake_case del backend al formato camelCase
 * que usan los componentes React.
 */

import apiClient from './api';
import config from '../config/config';

export const DIAS_ACTIVOS_MASIVOS_KEY = 'embajadores.diasActivosMasivosCerrados';
export const DIAS_ACTIVOS_MASIVOS_DEFAULT = 30;

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

export const obtenerDiasActivosMasivos = () => {
  if (typeof window === 'undefined') {
    return DIAS_ACTIVOS_MASIVOS_DEFAULT;
  }

  const valorGuardado = Number(
    window.localStorage.getItem(DIAS_ACTIVOS_MASIVOS_KEY)
  );

  if (!Number.isFinite(valorGuardado) || valorGuardado < 1) {
    return DIAS_ACTIVOS_MASIVOS_DEFAULT;
  }

  return valorGuardado;
};

export const guardarDiasActivosMasivos = (dias) => {
  const diasNormalizados = Math.min(
    365,
    Math.max(1, Number(dias) || DIAS_ACTIVOS_MASIVOS_DEFAULT)
  );

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(
      DIAS_ACTIVOS_MASIVOS_KEY,
      String(diasNormalizados)
    );
  }

  return diasNormalizados;
};

export const obtenerDiasActivosMasivosRemoto = async () => {
  try {
    const { data } = await apiClient.get(
      config.endpoints.configuracionDiasActivosMasivos()
    );

    const diasActivos = Number(data?.dias_activos);
    const diasNormalizados =
      Number.isFinite(diasActivos) && diasActivos >= 1
        ? diasActivos
        : DIAS_ACTIVOS_MASIVOS_DEFAULT;

    guardarDiasActivosMasivos(diasNormalizados);

    return diasNormalizados;
  } catch (error) {
    return obtenerDiasActivosMasivos();
  }
};

const masivoCerradoEstaActivo = (masivo, diasActivos) => {
  if (masivo.estado !== 'cerrado') {
    return true;
  }

  if (!masivo.fechaHoraCierre) {
    return true;
  }

  const fechaCierre = new Date(masivo.fechaHoraCierre);

  if (Number.isNaN(fechaCierre.getTime())) {
    return true;
  }

  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - diasActivos);

  return fechaCierre >= fechaLimite;
};

const normalizarDetalleMasivo = (m) => ({
  ...normalizarMasivo(m),

  cavsAfectados: Array.isArray(m.cavs_afectados)
    ? m.cavs_afectados.map(normalizarCavAfectado)
    : [],
});

// ── Servicio ────────────────────────────────────────────────────────────────

class MasivoServicio {
  async listarMasivos(filtros = {}, opciones = {}) {
    const params = new URLSearchParams();
    const { incluirCerrados = false } = opciones;

    if (filtros.aplicacionId) {
      params.append('aplicacion_id', filtros.aplicacionId);
    }

    if (filtros.tipoFallaId) {
      params.append('tipo_falla_id', filtros.tipoFallaId);
    }

    const query = params.toString() ? `?${params.toString()}` : '';

    const { data } = await apiClient.get(config.endpoints.masivos(query));
    const diasActivos = await obtenerDiasActivosMasivosRemoto();

    return (data || [])
      .map(normalizarMasivo)
      .filter((masivo) => {
        if (masivo.estado !== 'cerrado') {
          return true;
        }

        return incluirCerrados && masivoCerradoEstaActivo(masivo, diasActivos);
      });
  }

  async obtenerResumen() {
    const { data } = await apiClient.get(config.endpoints.masivoResumen());

    const resumen = data || {
      total: 0,
      abiertos: 0,
      cerrados: 0,
    };

    return {
      ...resumen,
      total: resumen.abiertos ?? 0,
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
