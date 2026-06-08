import apiClient from './api.js';
import config from '../config/config.js';

const wp = config.endpoints.whatsapp;

const whatsappServicio = {
  async crearGrupo(subject, description = '', participants = []) {
    const { data } = await apiClient.post(wp.crearGrupo(), { subject, description, participants });
    return data;
  },

  async listarGrupos(conParticipantes = false) {
    const { data } = await apiClient.get(wp.listarGrupos(conParticipantes));
    return data;
  },

  async infoGrupo(jid) {
    const { data } = await apiClient.get(wp.infoGrupo(jid));
    return data;
  },

  async actualizarNombre(jid, subject) {
    const { data } = await apiClient.post(wp.actualizarNombre(), { group_jid: jid, subject });
    return data;
  },

  async actualizarDescripcion(jid, description) {
    const { data } = await apiClient.post(wp.actualizarDesc(), { group_jid: jid, description });
    return data;
  },

  async actualizarImagen(jid, image) {
    const { data } = await apiClient.post(wp.actualizarImagen(), { group_jid: jid, image });
    return data;
  },

  async obtenerParticipantes(jid) {
    const { data } = await apiClient.get(wp.participantes(jid));
    return data;
  },

  async gestionarParticipantes(jid, action, participants) {
    const { data } = await apiClient.post(wp.gestionarPartic(), { group_jid: jid, action, participants });
    return data;
  },

  async obtenerCodigoInvitacion(jid) {
    const { data } = await apiClient.get(wp.codigoInvitacion(jid));
    return data;
  },

  async revocarCodigoInvitacion(jid) {
    const { data } = await apiClient.post(wp.revocarInvitacion(jid));
    return data;
  },

  async enviarInvitacion(jid, description, numbers) {
    const { data } = await apiClient.post(wp.enviarInvitacion(), { group_jid: jid, description, numbers });
    return data;
  },

  async actualizarConfiguracion(jid, action) {
    const { data } = await apiClient.post(wp.configuracion(), { group_jid: jid, action });
    return data;
  },

  async configurarEfimero(jid, expiration) {
    const { data } = await apiClient.post(wp.efimero(), { group_jid: jid, expiration });
    return data;
  },
};

export default whatsappServicio;
