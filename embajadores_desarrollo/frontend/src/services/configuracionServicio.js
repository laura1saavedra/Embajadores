/**
 * services/configuracionServicio.js
 *
 * Servicio para Configuración Avanzada.
 * Maneja Aplicaciones, Tipos de falla, Ciudades y CAVs.
 */

import apiClient from './api.js';
import config from '../config/config.js';

// ── Normalizadores ─────────────────────────────────────────────

const normalizarAplicacion = (app) => ({
  idAplicacion: app.id_aplicacion,
  nombreAplicacion: app.nombre_aplicacion,
});

const normalizarTipoFalla = (tipo) => ({
  idTipoFalla: tipo.id_tipo_falla,
  nombreTipo: tipo.nombre_tipo,
});

const normalizarCavSimple = (cav) => ({
  idCav: cav.id_cav,
  nombreCav: cav.nombre_cav,
  ciudadId: cav.ciudad_id ?? null,
  ciudadNombre: cav.ciudad_nombre ?? '',
});

const normalizarCiudad = (ciudad) => ({
  idCiudad: ciudad.id_ciudad,
  nombreCiudad: ciudad.nombre_ciudad,
  cavs: Array.isArray(ciudad.cavs)
    ? ciudad.cavs.map((cav) => ({
        idCav: cav.id_cav,
        nombreCav: cav.nombre_cav,
      }))
    : [],
});

// ── Servicio ───────────────────────────────────────────────────

class ConfiguracionServicio {
  // ─────────────────────────────────────────────────────────────
  // Aplicaciones
  // ─────────────────────────────────────────────────────────────

  async listarAplicaciones() {
    const { data } = await apiClient.get(config.endpoints.aplicaciones());
    return (data || []).map(normalizarAplicacion);
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
        cavs,
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

  async crearCav(nombreCav, ciudadId) {
    const { data } = await apiClient.post(config.endpoints.cavs(), {
      nombre_cav: nombreCav,
      ciudad_id: Number(ciudadId),
    });

    return normalizarCavSimple(data);
  }

  async actualizarCav(idCav, nombreCav, ciudadId) {
    const { data } = await apiClient.put(
      `${config.endpoints.cavs()}/${idCav}`,
      {
        nombre_cav: nombreCav,
        ciudad_id: Number(ciudadId),
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
}

const configuracionServicio = new ConfiguracionServicio();

export default configuracionServicio;