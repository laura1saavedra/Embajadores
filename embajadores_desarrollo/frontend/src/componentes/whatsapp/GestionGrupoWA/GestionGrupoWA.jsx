import { useState, useEffect } from 'react';
import whatsappServicio from '../../../services/whatsappServicio';
import './GestionGrupoWA.css';

const formatearNumero = (num) => {
  if (!num) return '';
  const limpio = num.toString().replace(/\D/g, '');
  if (limpio.length >= 10) {
    const pais = limpio.slice(0, -10);
    const main = limpio.slice(-10);
    return pais ? `+${pais} ${main.slice(0, 3)} ${main.slice(3, 6)} ${main.slice(6)}` : `${main.slice(0, 3)} ${main.slice(3, 6)} ${main.slice(6)}`;
  }
  return limpio;
};

const formatearParticipante = (p) => {
  const id = p.id || p;
  if (id.endsWith('@s.whatsapp.net')) {
    const num = id.replace('@s.whatsapp.net', '');
    return { display: formatearNumero(num), rawNum: num, rawJid: id, esAdmin: p.admin || false, esLid: false };
  }
  if (id.endsWith('@lid')) {
    return { display: id, rawNum: null, rawJid: id, esAdmin: p.admin || false, esLid: true };
  }
  return { display: id, rawNum: null, rawJid: id, esAdmin: p.admin || false, esLid: false };
};

const TABS = [
  { id: 'info', label: 'Información' },
  { id: 'participantes', label: 'Participantes' },
  { id: 'invitaciones', label: 'Invitaciones' },
  { id: 'configuracion', label: 'Configuración' },
];

function GestionGrupoWA({ onCerrar, jid, nombre = '' }) {
  const [tabActiva, setTabActiva] = useState('info');
  const [cargando, setCargando] = useState(false);
  const [cargandoPartic, setCargandoPartic] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // Info
  const [infoGrupo, setInfoGrupo] = useState(null);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaDesc, setNuevaDesc] = useState('');
  const [nuevaImagen, setNuevaImagen] = useState('');

  // Participantes
  const [participantes, setParticipantes] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 10;
  const [accion, setAccion] = useState('add');
  const [numerosPartic, setNumerosPartic] = useState('');

  // Invitaciones
  const [codigoInvitacion, setCodigoInvitacion] = useState('');
  const [numerosInvitar, setNumerosInvitar] = useState('');
  const [mensajeInvitacion, setMensajeInvitacion] = useState('Únete a nuestro grupo de WhatsApp:');

  // Configuración
  const [configuracion, setConfiguracion] = useState('not_announcement');
  const [efimero, setEfimero] = useState(0);

  useEffect(() => {
    if (!jid) return;
    if (!jid.includes('@g.us')) {
      mostrarMensaje('error', `JID inválido: "${jid}". Un grupo de WhatsApp debe tener un JID que termine en @g.us (ej: 120363403675305399@g.us). Edita este contacto y corrige el JID.`);
      return;
    }
    cargarInfo();
    cargarParticipantes();
  }, [jid]);

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 4000);
  };

  const copiar = (texto) => {
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(texto);
      } else {
        const ta = document.createElement('textarea');
        ta.value = texto;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      mostrarMensaje('exito', 'Copiado al portapapeles');
    } catch { /* silencioso */ }
  };

  const cargarInfo = async () => {
    setCargando(true);
    try {
      const data = await whatsappServicio.infoGrupo(jid);
      setInfoGrupo(data);
      setNuevoNombre(data.subject || '');
      setNuevaDesc(data.description || '');
    } catch (e) {
      mostrarMensaje('error', e.message || 'No se pudo cargar la información del grupo.');
    } finally {
      setCargando(false);
    }
  };

  const cargarParticipantes = async () => {
    setCargandoPartic(true);
    try {
      const data = await whatsappServicio.obtenerParticipantes(jid);
      setParticipantes(data.participants || []);
    } catch (e) {
      mostrarMensaje('error', e.message || 'No se pudieron cargar los participantes.');
    } finally {
      setCargandoPartic(false);
    }
  };

  const actualizarNombre = async () => {
    if (!nuevoNombre.trim()) { mostrarMensaje('error', 'El nombre es obligatorio.'); return; }
    setCargando(true);
    try {
      await whatsappServicio.actualizarNombre(jid, nuevoNombre.trim());
      mostrarMensaje('exito', 'Nombre actualizado.');
      cargarInfo();
    } catch (e) { mostrarMensaje('error', e.message || 'Error al actualizar nombre.'); }
    finally { setCargando(false); }
  };

  const actualizarDesc = async () => {
    setCargando(true);
    try {
      await whatsappServicio.actualizarDescripcion(jid, nuevaDesc);
      mostrarMensaje('exito', 'Descripción actualizada.');
      cargarInfo();
    } catch (e) { mostrarMensaje('error', e.message || 'Error al actualizar descripción.'); }
    finally { setCargando(false); }
  };

  const actualizarImagen = async () => {
    if (!nuevaImagen.trim()) { mostrarMensaje('error', 'La URL de la imagen es obligatoria.'); return; }
    setCargando(true);
    try {
      await whatsappServicio.actualizarImagen(jid, nuevaImagen.trim());
      mostrarMensaje('exito', 'Imagen actualizada.');
      setNuevaImagen('');
    } catch (e) { mostrarMensaje('error', e.message || 'Error al actualizar imagen.'); }
    finally { setCargando(false); }
  };

  const toggleSeleccion = (id) => {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const seleccionarTodos = () => {
    const elegibles = participantes.filter((p) => !p.id.endsWith('@lid')).map((p) => p.id);
    if (seleccionados.length === elegibles.length) setSeleccionados([]);
    else setSeleccionados(elegibles);
  };

  const ejecutarAccion = async () => {
    let lista = [];
    if (accion === 'add') {
      lista = numerosPartic.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
      if (!lista.length) { mostrarMensaje('error', 'Ingresa al menos un número.'); return; }
    } else {
      if (!seleccionados.length) { mostrarMensaje('error', 'Selecciona al menos un participante.'); return; }
      lista = seleccionados.map((id) => {
        if (id.endsWith('@s.whatsapp.net')) return id.replace('@s.whatsapp.net', '');
        return id;
      });
    }
    setCargando(true);
    try {
      await whatsappServicio.gestionarParticipantes(jid, accion, lista);
      const textos = { add: 'agregados', remove: 'removidos', promote: 'promovidos a admin', demote: 'degradados de admin' };
      mostrarMensaje('exito', `Participantes ${textos[accion]}.`);
      setNumerosPartic('');
      setSeleccionados([]);
      cargarParticipantes();
    } catch (e) { mostrarMensaje('error', e.message || 'Error al gestionar participantes.'); }
    finally { setCargando(false); }
  };

  const obtenerCodigo = async () => {
    setCargando(true);
    try {
      const data = await whatsappServicio.obtenerCodigoInvitacion(jid);
      setCodigoInvitacion(data.inviteCode || data.code || data.invite_code || '');
      mostrarMensaje('exito', 'Código obtenido.');
    } catch (e) { mostrarMensaje('error', e.message || 'Error al obtener código.'); }
    finally { setCargando(false); }
  };

  const revocarCodigo = async () => {
    setCargando(true);
    try {
      await whatsappServicio.revocarCodigoInvitacion(jid);
      setCodigoInvitacion('');
      mostrarMensaje('exito', 'Código revocado.');
    } catch (e) { mostrarMensaje('error', e.message || 'Error al revocar código.'); }
    finally { setCargando(false); }
  };

  const enviarInvitacion = async () => {
    const nums = numerosInvitar.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
    if (!nums.length) { mostrarMensaje('error', 'Ingresa al menos un número.'); return; }
    setCargando(true);
    try {
      await whatsappServicio.enviarInvitacion(jid, mensajeInvitacion, nums);
      mostrarMensaje('exito', 'Invitaciones enviadas.');
      setNumerosInvitar('');
    } catch (e) { mostrarMensaje('error', e.message || 'Error al enviar invitaciones.'); }
    finally { setCargando(false); }
  };

  const aplicarConfiguracion = async () => {
    setCargando(true);
    try {
      await whatsappServicio.actualizarConfiguracion(jid, configuracion);
      mostrarMensaje('exito', 'Configuración aplicada.');
    } catch (e) { mostrarMensaje('error', e.message || 'Error al aplicar configuración.'); }
    finally { setCargando(false); }
  };

  const aplicarEfimero = async () => {
    setCargando(true);
    try {
      await whatsappServicio.configurarEfimero(jid, parseInt(efimero));
      mostrarMensaje('exito', 'Mensajes efímeros configurados.');
    } catch (e) { mostrarMensaje('error', e.message || 'Error al configurar efímeros.'); }
    finally { setCargando(false); }
  };

  // Paginación participantes
  const filtrados = participantes.filter((p) => {
    if (!busqueda) return true;
    const f = formatearParticipante(p);
    return f.display.toLowerCase().includes(busqueda.toLowerCase()) || (p.id || '').includes(busqueda);
  });
  const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA);
  const visibles = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  useEffect(() => { setPagina(1); }, [busqueda]);

  return (
    <div className="gestion-grupo-wa__overlay" onClick={onCerrar}>
      <div className="gestion-grupo-wa__modal" onClick={(e) => e.stopPropagation()}>

        {/* Cabecera */}
        <div className="gestion-grupo-wa__cabecera">
          <div>
            <h2>Gestión del grupo</h2>
            <p className="gestion-grupo-wa__nombre-grupo">{nombre || 'Grupo de WhatsApp'}</p>
            <code className="gestion-grupo-wa__jid">{jid}</code>
          </div>
          <button className="gestion-grupo-wa__cerrar" onClick={onCerrar}>✕</button>
        </div>

        {/* Mensaje flash */}
        {mensaje.texto && (
          <div className={`gestion-grupo-wa__alerta gestion-grupo-wa__alerta--${mensaje.tipo}`}>
            {mensaje.texto}
          </div>
        )}

        {/* Tabs */}
        <div className="gestion-grupo-wa__tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`gestion-grupo-wa__tab${tabActiva === t.id ? ' gestion-grupo-wa__tab--activa' : ''}`}
              onClick={() => setTabActiva(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div className="gestion-grupo-wa__contenido">

          {/* ── TAB INFO ── */}
          {tabActiva === 'info' && (
            <div className="gestion-grupo-wa__seccion">
              <div className="gestion-grupo-wa__bloque">
                <label className="gestion-grupo-wa__bloque-titulo">Nombre del grupo</label>
                <div className="gestion-grupo-wa__fila-accion">
                  <input
                    type="text"
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    placeholder="Nuevo nombre del grupo"
                    disabled={cargando}
                  />
                  <button className="gestion-grupo-wa__boton gestion-grupo-wa__boton--principal" onClick={actualizarNombre} disabled={cargando || !nuevoNombre.trim()}>
                    Actualizar
                  </button>
                </div>
              </div>

              <div className="gestion-grupo-wa__bloque">
                <label className="gestion-grupo-wa__bloque-titulo">Descripción</label>
                <textarea
                  rows="3"
                  value={nuevaDesc}
                  onChange={(e) => setNuevaDesc(e.target.value)}
                  placeholder="Descripción del grupo..."
                  disabled={cargando}
                />
                <div className="gestion-grupo-wa__bloque-acciones">
                  <button className="gestion-grupo-wa__boton gestion-grupo-wa__boton--principal" onClick={actualizarDesc} disabled={cargando}>
                    Actualizar descripción
                  </button>
                </div>
              </div>

              <div className="gestion-grupo-wa__bloque">
                <label className="gestion-grupo-wa__bloque-titulo">Imagen del grupo</label>
                <div className="gestion-grupo-wa__fila-accion">
                  <input
                    type="text"
                    value={nuevaImagen}
                    onChange={(e) => setNuevaImagen(e.target.value)}
                    placeholder="URL de la imagen (accesible públicamente)"
                    disabled={cargando}
                  />
                  <button className="gestion-grupo-wa__boton gestion-grupo-wa__boton--principal" onClick={actualizarImagen} disabled={cargando || !nuevaImagen.trim()}>
                    Actualizar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB PARTICIPANTES ── */}
          {tabActiva === 'participantes' && (
            <div className="gestion-grupo-wa__seccion">
              {/* Lista actual */}
              <div className="gestion-grupo-wa__bloque">
                <div className="gestion-grupo-wa__bloque-cabecera">
                  <label className="gestion-grupo-wa__bloque-titulo">
                    Participantes actuales ({participantes.length})
                  </label>
                  <button className="gestion-grupo-wa__boton-link" onClick={cargarParticipantes} disabled={cargandoPartic}>
                    {cargandoPartic ? 'Cargando...' : 'Recargar'}
                  </button>
                </div>

                <input
                  type="text"
                  className="gestion-grupo-wa__buscador"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar participante..."
                />

                <div className="gestion-grupo-wa__seleccion-barra">
                  <button className="gestion-grupo-wa__boton-link" onClick={seleccionarTodos}>
                    {seleccionados.length === participantes.filter((p) => !p.id.endsWith('@lid')).length
                      ? 'Deseleccionar todos'
                      : 'Seleccionar todos'}
                  </button>
                  {seleccionados.length > 0 && (
                    <span className="gestion-grupo-wa__badge">{seleccionados.length} seleccionado(s)</span>
                  )}
                </div>

                <div className="gestion-grupo-wa__lista-partic">
                  {visibles.length === 0 ? (
                    <p className="gestion-grupo-wa__vacio">
                      {cargandoPartic ? 'Cargando...' : busqueda ? 'Sin resultados para esa búsqueda.' : 'No hay participantes.'}
                    </p>
                  ) : (
                    visibles.map((p) => {
                      const f = formatearParticipante(p);
                      const seleccionado = seleccionados.includes(p.id);
                      const esLid = f.esLid;
                      return (
                        <div
                          key={p.id}
                          className={`gestion-grupo-wa__partic${seleccionado ? ' gestion-grupo-wa__partic--sel' : ''}${esLid ? ' gestion-grupo-wa__partic--lid' : ''}`}
                          onClick={() => !esLid && toggleSeleccion(p.id)}
                        >
                          <input
                            type="checkbox"
                            checked={seleccionado}
                            disabled={esLid}
                            onChange={() => {}}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="gestion-grupo-wa__partic-info">
                            <span className="gestion-grupo-wa__partic-display">{f.display}</span>
                            {f.esAdmin && <span className="gestion-grupo-wa__badge-admin">Admin</span>}
                            {esLid && <span className="gestion-grupo-wa__badge-lid">ID interno</span>}
                          </div>
                          <button
                            className="gestion-grupo-wa__boton-copiar-mini"
                            onClick={(e) => { e.stopPropagation(); copiar(f.rawNum || f.rawJid); }}
                            title="Copiar"
                          >
                            📋
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {totalPaginas > 1 && (
                  <div className="gestion-grupo-wa__paginacion">
                    <button className="gestion-grupo-wa__boton gestion-grupo-wa__boton--ghost" onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina === 1}>
                      ← Anterior
                    </button>
                    <span className="gestion-grupo-wa__pagina-info">Página {pagina} de {totalPaginas}</span>
                    <button className="gestion-grupo-wa__boton gestion-grupo-wa__boton--ghost" onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}>
                      Siguiente →
                    </button>
                  </div>
                )}
              </div>

              {/* Gestionar */}
              <div className="gestion-grupo-wa__bloque">
                <label className="gestion-grupo-wa__bloque-titulo">Gestionar participantes</label>
                <select value={accion} onChange={(e) => { setAccion(e.target.value); setNumerosPartic(''); }} disabled={cargando}>
                  <option value="add">Agregar participantes (escribir números)</option>
                  <option value="remove">Remover participantes (seleccionar de la lista)</option>
                  <option value="promote">Promover a admin (seleccionar de la lista)</option>
                  <option value="demote">Degradar de admin (seleccionar de la lista)</option>
                </select>

                {accion === 'add' ? (
                  <>
                    <textarea
                      rows="3"
                      value={numerosPartic}
                      onChange={(e) => setNumerosPartic(e.target.value)}
                      placeholder={'573100000000, 573100000001\n(separados por coma o línea)'}
                      className="gestion-grupo-wa__mono"
                      disabled={cargando}
                    />
                    <p className="gestion-grupo-wa__ayuda">Números con indicativo de país, sin el +</p>
                  </>
                ) : (
                  <div className="gestion-grupo-wa__seleccionados-resumen">
                    <strong>{seleccionados.length} participante(s) seleccionado(s)</strong>
                    {seleccionados.length === 0 && (
                      <p className="gestion-grupo-wa__ayuda">Selecciona participantes de la lista de arriba.</p>
                    )}
                  </div>
                )}

                <button
                  className="gestion-grupo-wa__boton gestion-grupo-wa__boton--principal gestion-grupo-wa__boton--bloque"
                  onClick={ejecutarAccion}
                  disabled={cargando || (accion === 'add' ? !numerosPartic.trim() : seleccionados.length === 0)}
                >
                  {cargando ? 'Ejecutando...' : 'Ejecutar acción'}
                </button>
              </div>
            </div>
          )}

          {/* ── TAB INVITACIONES ── */}
          {tabActiva === 'invitaciones' && (
            <div className="gestion-grupo-wa__seccion">
              <div className="gestion-grupo-wa__bloque">
                <label className="gestion-grupo-wa__bloque-titulo">Código de invitación</label>
                {codigoInvitacion ? (
                  <>
                    <div className="gestion-grupo-wa__fila-accion">
                      <input type="text" value={codigoInvitacion} readOnly className="gestion-grupo-wa__mono" />
                      <button className="gestion-grupo-wa__boton gestion-grupo-wa__boton--secundario" onClick={() => copiar(codigoInvitacion)}>
                        📋 Copiar
                      </button>
                      <button className="gestion-grupo-wa__boton gestion-grupo-wa__boton--peligro" onClick={revocarCodigo} disabled={cargando}>
                        Revocar
                      </button>
                    </div>
                    <p className="gestion-grupo-wa__ayuda">
                      Enlace: https://chat.whatsapp.com/{codigoInvitacion}
                      <button className="gestion-grupo-wa__boton-link" style={{ marginLeft: 8 }} onClick={() => copiar(`https://chat.whatsapp.com/${codigoInvitacion}`)}>
                        Copiar enlace
                      </button>
                    </p>
                  </>
                ) : (
                  <button className="gestion-grupo-wa__boton gestion-grupo-wa__boton--principal gestion-grupo-wa__boton--bloque" onClick={obtenerCodigo} disabled={cargando}>
                    {cargando ? 'Obteniendo...' : 'Obtener código de invitación'}
                  </button>
                )}
              </div>

              <div className="gestion-grupo-wa__bloque">
                <label className="gestion-grupo-wa__bloque-titulo">Enviar invitación por WhatsApp</label>
                <input
                  type="text"
                  value={mensajeInvitacion}
                  onChange={(e) => setMensajeInvitacion(e.target.value)}
                  placeholder="Mensaje de invitación"
                  disabled={cargando}
                />
                <textarea
                  rows="3"
                  value={numerosInvitar}
                  onChange={(e) => setNumerosInvitar(e.target.value)}
                  placeholder={'573100000000, 573100000001\n(separados por coma o línea)'}
                  className="gestion-grupo-wa__mono"
                  disabled={cargando}
                />
                <button
                  className="gestion-grupo-wa__boton gestion-grupo-wa__boton--principal gestion-grupo-wa__boton--bloque"
                  onClick={enviarInvitacion}
                  disabled={cargando || !numerosInvitar.trim()}
                >
                  {cargando ? 'Enviando...' : 'Enviar invitaciones'}
                </button>
              </div>
            </div>
          )}

          {/* ── TAB CONFIGURACIÓN ── */}
          {tabActiva === 'configuracion' && (
            <div className="gestion-grupo-wa__seccion">
              <div className="gestion-grupo-wa__bloque">
                <label className="gestion-grupo-wa__bloque-titulo">Mensajes y edición</label>
                <select value={configuracion} onChange={(e) => setConfiguracion(e.target.value)} disabled={cargando}>
                  <option value="announcement">Solo admins pueden enviar mensajes</option>
                  <option value="not_announcement">Todos pueden enviar mensajes</option>
                  <option value="locked">Solo admins pueden editar configuración</option>
                  <option value="unlocked">Todos pueden editar configuración</option>
                </select>
                <button
                  className="gestion-grupo-wa__boton gestion-grupo-wa__boton--principal gestion-grupo-wa__boton--bloque"
                  onClick={aplicarConfiguracion}
                  disabled={cargando}
                >
                  {cargando ? 'Aplicando...' : 'Aplicar configuración'}
                </button>
              </div>

              <div className="gestion-grupo-wa__bloque">
                <label className="gestion-grupo-wa__bloque-titulo">Mensajes efímeros</label>
                <select value={efimero} onChange={(e) => setEfimero(e.target.value)} disabled={cargando}>
                  <option value="0">Desactivado (mensajes permanentes)</option>
                  <option value="86400">24 horas</option>
                  <option value="604800">7 días</option>
                  <option value="7776000">90 días</option>
                </select>
                <button
                  className="gestion-grupo-wa__boton gestion-grupo-wa__boton--principal gestion-grupo-wa__boton--bloque"
                  onClick={aplicarEfimero}
                  disabled={cargando}
                >
                  {cargando ? 'Aplicando...' : 'Aplicar configuración efímera'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="gestion-grupo-wa__footer">
          <button className="gestion-grupo-wa__boton gestion-grupo-wa__boton--secundario" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default GestionGrupoWA;
