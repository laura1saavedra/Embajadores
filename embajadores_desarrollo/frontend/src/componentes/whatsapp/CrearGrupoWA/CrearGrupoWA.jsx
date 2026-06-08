import { useState } from 'react';
import whatsappServicio from '../../../services/whatsappServicio';
import incidenteServicio from '../../../services/incidenteServicio';
import './CrearGrupoWA.css';

function CrearGrupoWA({ onCerrar, onContactoCreado }) {
  const [form, setForm] = useState({ subject: '', description: '', participants: '' });
  const [creando, setCreando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [grupoCreado, setGrupoCreado] = useState(null); // { jid, subject }

  const manejarCambio = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const manejarCrear = async (e) => {
    e.preventDefault();
    if (!form.subject.trim()) {
      setError('El nombre del grupo es obligatorio.');
      return;
    }
    const participantsList = form.participants
      .split(/[,\n]/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    if (participantsList.length === 0) {
      setError('Debes agregar al menos un número participante.');
      return;
    }
    try {
      setCreando(true);
      setError('');
      const respuesta = await whatsappServicio.crearGrupo(
        form.subject.trim(),
        form.description.trim(),
        participantsList
      );
      const jid = respuesta?.id || respuesta?.groupId || respuesta?.group?.id;
      if (!jid) {
        setError('El grupo fue creado pero no se recibió el JID. Revisa la consola de Evolution API.');
        return;
      }
      setGrupoCreado({ jid, subject: form.subject.trim() });
    } catch (err) {
      setError(err.message || 'No se pudo crear el grupo.');
    } finally {
      setCreando(false);
    }
  };

  const manejarGuardarContacto = async () => {
    if (!grupoCreado) return;
    try {
      setGuardando(true);
      await incidenteServicio.crearContacto({
        nombreContacto: grupoCreado.subject,
        numeroCelular: '',
        tokenWp: grupoCreado.jid,
        tipo: 'grupo',
      });
      if (onContactoCreado) onContactoCreado();
      onCerrar();
    } catch (err) {
      setError(err.message || 'No se pudo guardar el contacto.');
    } finally {
      setGuardando(false);
    }
  };

  const copiarJid = () => {
    if (!grupoCreado?.jid) return;
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(grupoCreado.jid);
      } else {
        const ta = document.createElement('textarea');
        ta.value = grupoCreado.jid;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
    } catch { /* silencioso */ }
  };

  return (
    <div className="crear-grupo-wa__overlay" onClick={onCerrar}>
      <div className="crear-grupo-wa__modal" onClick={(e) => e.stopPropagation()}>

        <div className="crear-grupo-wa__cabecera">
          <h2>Crear grupo de WhatsApp</h2>
          <button className="crear-grupo-wa__cerrar" onClick={onCerrar}>✕</button>
        </div>

        {error && (
          <div className="crear-grupo-wa__alerta crear-grupo-wa__alerta--error">{error}</div>
        )}

        {!grupoCreado ? (
          <form onSubmit={manejarCrear} className="crear-grupo-wa__form">
            <div className="crear-grupo-wa__campo">
              <label htmlFor="subject">Nombre del grupo *</label>
              <input
                id="subject"
                name="subject"
                type="text"
                value={form.subject}
                onChange={manejarCambio}
                placeholder="Ej. Incidentes CAVs Norte"
                maxLength={100}
                disabled={creando}
              />
            </div>

            <div className="crear-grupo-wa__campo">
              <label htmlFor="description">Descripción (opcional)</label>
              <textarea
                id="description"
                name="description"
                rows="2"
                value={form.description}
                onChange={manejarCambio}
                placeholder="Descripción del grupo..."
                disabled={creando}
              />
            </div>

            <div className="crear-grupo-wa__campo">
              <label htmlFor="participants">Participantes *</label>
              <textarea
                id="participants"
                name="participants"
                rows="4"
                value={form.participants}
                onChange={manejarCambio}
                placeholder={'573100000000, 573100000001\n(separados por coma o línea)'}
                disabled={creando}
                className="crear-grupo-wa__mono"
              />
              <p className="crear-grupo-wa__ayuda">
                Números con indicativo de país, sin el + (ej: <code>573001234567</code>)
              </p>
            </div>

            <div className="crear-grupo-wa__info-box">
              Los números deben estar registrados en WhatsApp para poder agregarlos al grupo.
            </div>

            <div className="crear-grupo-wa__acciones">
              <button
                type="button"
                className="crear-grupo-wa__boton crear-grupo-wa__boton--secundario"
                onClick={onCerrar}
                disabled={creando}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="crear-grupo-wa__boton crear-grupo-wa__boton--principal"
                disabled={creando}
              >
                {creando ? 'Creando grupo...' : 'Crear grupo'}
              </button>
            </div>
          </form>
        ) : (
          <div className="crear-grupo-wa__exito">
            <div className="crear-grupo-wa__exito-icono">✅</div>
            <h3>¡Grupo creado exitosamente!</h3>
            <p className="crear-grupo-wa__exito-nombre">{grupoCreado.subject}</p>

            <div className="crear-grupo-wa__jid-box">
              <label>JID del grupo (úsalo para recibir notificaciones):</label>
              <div className="crear-grupo-wa__jid-fila">
                <code className="crear-grupo-wa__jid">{grupoCreado.jid}</code>
                <button
                  type="button"
                  className="crear-grupo-wa__boton-copiar"
                  onClick={copiarJid}
                  title="Copiar JID"
                >
                  📋
                </button>
              </div>
            </div>

            <p className="crear-grupo-wa__exito-desc">
              Guarda este grupo como contacto para poder seleccionarlo al registrar incidentes.
            </p>

            <div className="crear-grupo-wa__acciones">
              <button
                type="button"
                className="crear-grupo-wa__boton crear-grupo-wa__boton--secundario"
                onClick={onCerrar}
                disabled={guardando}
              >
                Solo cerrar
              </button>
              <button
                type="button"
                className="crear-grupo-wa__boton crear-grupo-wa__boton--principal"
                onClick={manejarGuardarContacto}
                disabled={guardando}
              >
                {guardando ? 'Guardando...' : 'Guardar como contacto'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CrearGrupoWA;
