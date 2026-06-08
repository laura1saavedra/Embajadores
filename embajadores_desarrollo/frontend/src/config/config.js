/**
 * config.js
 *
 * Configuracion centralizada de URLs.
 * Lee de window.ENV (inyectado por env-config.js en produccion o public/env-config.js en dev).
 * Nunca usa import.meta.env directamente para mantener compatibilidad con el patron de
 * inyeccion en tiempo de ejecucion (igual a Event Control).
 */

const getEnv = (key, fallback = '') => {
  if (typeof window !== 'undefined' && window.ENV && window.ENV[key]) {
    return window.ENV[key];
  }
  if (fallback) return fallback;
  return '';
};

const config = {
  // Vacio = usa rutas relativas; CRA proxy reenvía /api/* al backend 9000.
  // En produccion inject-env.sh sobreescribe con la IP real del servidor.
  API_BASE_URL: getEnv('VITE_API_BASE_URL', ''),

  get API_URL() {
    return `${this.API_BASE_URL}/api`;
  },

  endpoints: {
    // Catalogos
    ciudades: () => `${config.API_URL}/ciudades`,

    cavs: (ciudadId) =>
      ciudadId
        ? `${config.API_URL}/cavs?ciudad_id=${ciudadId}`
        : `${config.API_URL}/cavs`,

    usuarios: () => `${config.API_URL}/usuarios`,
    contactos: () => `${config.API_URL}/contactos`,

    aplicaciones: () => `${config.API_URL}/aplicaciones`,

    // Nuevo endpoint independiente de tipos de falla
    tiposFalla: () => `${config.API_URL}/tipos-falla`,

    // Incidentes
    incidentes: (params = '') => `${config.API_URL}/incidentes${params}`,
    incidenteById: (id) => `${config.API_URL}/incidentes/${id}`,
    incidenteEstado: (id) => `${config.API_URL}/incidentes/${id}/estado`,
    incidenteCerrar: (id) => `${config.API_URL}/incidentes/${id}/cerrar`,
    incidenteHistorial: (id) => `${config.API_URL}/incidentes/${id}/historial`,
    incidenteResumen: () => `${config.API_URL}/incidentes/resumen`,

    // Masivos
    masivos: (params = '') => `${config.API_URL}/masivos${params}`,
    masivoById: (id) => `${config.API_URL}/masivos/${id}`,
    masivoCerrar: (id) => `${config.API_URL}/masivos/${id}/cerrar`,
    masivoResumen: () => `${config.API_URL}/masivos/resumen`,

    // WhatsApp grupos
    whatsapp: {
      estado: () => `${config.API_URL}/whatsapp/estado`,
      crearGrupo: () => `${config.API_URL}/whatsapp/crear`,
      listarGrupos: (conParticipantes = false) =>
        `${config.API_URL}/whatsapp/grupos?get_participants=${conParticipantes}`,
      infoGrupo: (jid) =>
        `${config.API_URL}/whatsapp/grupo?group_jid=${encodeURIComponent(jid)}`,
      actualizarNombre: () => `${config.API_URL}/whatsapp/nombre`,
      actualizarDesc: () => `${config.API_URL}/whatsapp/descripcion`,
      actualizarImagen: () => `${config.API_URL}/whatsapp/imagen`,
      participantes: (jid) =>
        `${config.API_URL}/whatsapp/participantes?group_jid=${encodeURIComponent(jid)}`,
      gestionarPartic: () => `${config.API_URL}/whatsapp/participantes`,
      codigoInvitacion: (jid) =>
        `${config.API_URL}/whatsapp/codigo-invitacion?group_jid=${encodeURIComponent(jid)}`,
      revocarInvitacion: (jid) =>
        `${config.API_URL}/whatsapp/revocar-invitacion?group_jid=${encodeURIComponent(jid)}`,
      enviarInvitacion: () => `${config.API_URL}/whatsapp/enviar-invitacion`,
      configuracion: () => `${config.API_URL}/whatsapp/configuracion`,
      efimero: () => `${config.API_URL}/whatsapp/efimero`,
    },

    // Sistema
    health: () => `${config.API_BASE_URL}/health`,
    wpEstado: () => `${config.API_URL}/whatsapp/estado`,
  },
};

export default config;