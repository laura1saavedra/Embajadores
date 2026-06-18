export const PERMISOS = {
  REGISTRAR_INCIDENTE: 'Registrar incidente',
  VER_HISTORIAL_INCIDENTES: 'Ver historial de incidentes',
  CERRAR_INCIDENTE: 'Cerrar incidente',
  VER_INCIDENTES_MASIVOS: 'Ver incidentes masivos',
  CERRAR_INCIDENTE_MASIVO: 'Cerrar incidente masivo',
  EDITAR_INCIDENTE: 'Editar incidente',
  GESTIONAR_CONTACTOS_WA: 'Gestionar contactos WA',
  GESTIONAR_CONFIGURACION_AVANZADA: 'Gestionar configuracion avanzada',
};

const normalizarTexto = (texto = '') =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const usuarioTienePermiso = (usuario, permisoRequerido) => {
  if (!permisoRequerido) return true;

  const permisoNormalizado = normalizarTexto(permisoRequerido);
  const permisos = Array.isArray(usuario?.permisos) ? usuario.permisos : [];

  return permisos.some((permiso) => {
    const nombrePermiso =
      typeof permiso === 'string'
        ? permiso
        : permiso?.nombrePermiso ?? permiso?.nombre_permiso ?? permiso?.name ?? '';

    return normalizarTexto(nombrePermiso) === permisoNormalizado;
  });
};

export const usuarioTieneAlgunPermiso = (usuario, permisosRequeridos = []) =>
  permisosRequeridos.some((permiso) => usuarioTienePermiso(usuario, permiso));

export const obtenerRutaInicialPorPermisos = (usuario) => {
  const rutas = [
    [PERMISOS.REGISTRAR_INCIDENTE, '/registrar-incidente'],
    [PERMISOS.VER_INCIDENTES_MASIVOS, '/masivos'],
    [PERMISOS.VER_HISTORIAL_INCIDENTES, '/historial-incidentes'],
    [PERMISOS.GESTIONAR_CONTACTOS_WA, '/contactos'],
    [PERMISOS.GESTIONAR_CONFIGURACION_AVANZADA, '/configuracion-avanzada'],
  ];

  const rutaPermitida = rutas.find(([permiso]) =>
    usuarioTienePermiso(usuario, permiso)
  );

  return rutaPermitida?.[1] ?? '/sin-permisos';
};
