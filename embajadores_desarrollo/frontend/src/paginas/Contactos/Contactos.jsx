import { useEffect, useMemo, useState } from 'react';
import LayoutPrincipal from '../../componentes/layout/LayoutPrincipal/LayoutPrincipal';
import ContenedorPagina from '../../componentes/layout/ContenedorPagina/ContenedorPagina';
import CrearGrupoWA from '../../componentes/whatsapp/CrearGrupoWA/CrearGrupoWA';
import GestionGrupoWA from '../../componentes/whatsapp/GestionGrupoWA/GestionGrupoWA';
import incidenteServicio from '../../services/incidenteServicio';
import './Contactos.css';

const FORM_VACIO = {
  nombreContacto: '',
  numeroCelular: '',
  tokenWp: '',
  tipo: 'persona',
};

const CONTACTOS_POR_PAGINA = 5;

function Contactos() {
  const [contactos, setContactos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  // Modal crear/editar
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');

  // Confirmación eliminar
  const [eliminandoId, setEliminandoId] = useState(null);

  // Modales WA
  const [modalCrearGrupo, setModalCrearGrupo] = useState(false);
  const [grupoGestionando, setGrupoGestionando] = useState(null);

  // Paginación
  const [paginaPersonas, setPaginaPersonas] = useState(1);
  const [paginaGrupos, setPaginaGrupos] = useState(1);

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    try {
      setCargando(true);
      setError('');
      const data = await incidenteServicio.obtenerContactos();
      setContactos(data);
      setPaginaPersonas(1);
      setPaginaGrupos(1);
    } catch (e) {
      setError(e.message || 'No se pudieron cargar los contactos.');
    } finally {
      setCargando(false);
    }
  };

  const abrirCrear = () => {
    setForm(FORM_VACIO);
    setEditandoId(null);
    setErrorForm('');
    setModalAbierto(true);
  };

  const abrirEditar = (c) => {
    setForm({
      nombreContacto: c.contactoNombre,
      numeroCelular: c.numeroCelular || '',
      tokenWp: c.tokenWp || '',
      tipo: c.tipo || 'persona',
    });
    setEditandoId(c.idContacto);
    setErrorForm('');
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setEditandoId(null);
    setErrorForm('');
  };

  const manejarCambio = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrorForm('');
  };

  const manejarGuardar = async (e) => {
    e.preventDefault();

    if (!form.nombreContacto.trim()) {
      setErrorForm('El nombre del contacto es obligatorio.');
      return;
    }

    if (form.tipo === 'persona' && !form.numeroCelular.trim()) {
      setErrorForm('El número WhatsApp es obligatorio.');
      return;
    }

    if (form.tipo === 'grupo' && !form.tokenWp.trim()) {
      setErrorForm('El JID del grupo es obligatorio.');
      return;
    }

    if (form.tipo === 'grupo' && !form.tokenWp.trim().includes('@g.us')) {
      setErrorForm('El JID del grupo debe terminar en @g.us (ej: 120363403675305399@g.us). Puedes obtenerlo al crear el grupo con "Crear grupo en WA".');
      return;
    }

    // Para personas, el token WA es el mismo número celular
    const payload = { ...form };

    if (form.tipo === 'persona') {
      payload.tokenWp = form.numeroCelular.trim();
    }

    try {
      setGuardando(true);
      setErrorForm('');

      if (editandoId) {
        await incidenteServicio.actualizarContacto(editandoId, payload);
        setExito('Contacto actualizado correctamente.');
      } else {
        await incidenteServicio.crearContacto(payload);
        setExito('Contacto creado correctamente.');
      }

      cerrarModal();
      await cargar();
      setTimeout(() => setExito(''), 4000);
    } catch (e) {
      setErrorForm(e.message || 'No se pudo guardar el contacto.');
    } finally {
      setGuardando(false);
    }
  };

  const manejarEliminar = async (id) => {
    try {
      await incidenteServicio.eliminarContacto(id);
      setEliminandoId(null);
      setExito('Contacto eliminado.');
      await cargar();
      setTimeout(() => setExito(''), 3000);
    } catch (e) {
      setError(e.message || 'No se pudo eliminar el contacto.');
    }
  };

  const personas = contactos.filter((c) => c.tipo === 'persona');
  const grupos = contactos.filter((c) => c.tipo === 'grupo');

  const totalPaginasPersonas = Math.ceil(personas.length / CONTACTOS_POR_PAGINA);
  const totalPaginasGrupos = Math.ceil(grupos.length / CONTACTOS_POR_PAGINA);

  const personasVisibles = useMemo(() => {
    const inicio = (paginaPersonas - 1) * CONTACTOS_POR_PAGINA;
    const fin = inicio + CONTACTOS_POR_PAGINA;

    return personas.slice(inicio, fin);
  }, [personas, paginaPersonas]);

  const gruposVisibles = useMemo(() => {
    const inicio = (paginaGrupos - 1) * CONTACTOS_POR_PAGINA;
    const fin = inicio + CONTACTOS_POR_PAGINA;

    return grupos.slice(inicio, fin);
  }, [grupos, paginaGrupos]);

  const irPaginaAnteriorPersonas = () => {
    if (paginaPersonas === 1) return;
    setPaginaPersonas((prev) => prev - 1);
  };

  const irPaginaSiguientePersonas = () => {
    if (paginaPersonas === totalPaginasPersonas) return;
    setPaginaPersonas((prev) => prev + 1);
  };

  const irPaginaAnteriorGrupos = () => {
    if (paginaGrupos === 1) return;
    setPaginaGrupos((prev) => prev - 1);
  };

  const irPaginaSiguienteGrupos = () => {
    if (paginaGrupos === totalPaginasGrupos) return;
    setPaginaGrupos((prev) => prev + 1);
  };

  return (
    <LayoutPrincipal>
      <ContenedorPagina>
        <section className="contactos__hero">
          <span className="contactos__hero-etiqueta">Embajador/a</span>

          <h1 className="contactos__hero-titulo">
            Contactos <span>WhatsApp</span>
          </h1>

          <p className="contactos__hero-descripcion">
            Gestiona las personas y grupos que recibirán notificaciones al registrar o cerrar incidentes.
          </p>
        </section>

        {error && <div className="contactos__alerta contactos__alerta--error">{error}</div>}
        {exito && <div className="contactos__alerta contactos__alerta--exito">{exito}</div>}

        <div className="contactos__cabecera-acciones">
          <button className="contactos__boton contactos__boton--principal" onClick={abrirCrear}>
            + Agregar contacto
          </button>
        </div>

        {cargando ? (
          <p className="contactos__texto-carga">Cargando contactos...</p>
        ) : (
          <div className="contactos__secciones">
            {/* PERSONAS */}
            <section className="contactos__grupo">
              <div className="contactos__grupo-cabecera">
                <span className="contactos__grupo-icono">👤</span>
                <h2 className="contactos__grupo-titulo">Personas</h2>
                <span className="contactos__grupo-contador">{personas.length}</span>
              </div>

              {personas.length === 0 ? (
                <p className="contactos__vacio">
                  No hay personas registradas. Agrega una con el botón de arriba.
                </p>
              ) : (
                <>
                  <div className="contactos__lista">
                    {personasVisibles.map((c) => (
                      <div key={c.idContacto} className="contactos__tarjeta">
                        <div className="contactos__tarjeta-info">
                          <strong className="contactos__nombre">{c.contactoNombre}</strong>
                          {c.numeroCelular && (
                            <span className="contactos__dato">📱 {c.numeroCelular}</span>
                          )}
                        </div>

                        <div className="contactos__tarjeta-acciones">
                          <button
                            className="contactos__boton contactos__boton--secundario"
                            onClick={() => abrirEditar(c)}
                          >
                            Editar
                          </button>

                          {eliminandoId === c.idContacto ? (
                            <div className="contactos__confirmar-fila">
                              <span>¿Eliminar?</span>
                              <button
                                className="contactos__boton contactos__boton--peligro"
                                onClick={() => manejarEliminar(c.idContacto)}
                              >
                                Sí
                              </button>
                              <button
                                className="contactos__boton contactos__boton--ghost"
                                onClick={() => setEliminandoId(null)}
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              className="contactos__boton contactos__boton--peligro"
                              onClick={() => setEliminandoId(c.idContacto)}
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {totalPaginasPersonas > 1 && (
                    <div className="contactos__paginacion">
                      <button
                        type="button"
                        className="contactos__paginacion-boton"
                        onClick={irPaginaAnteriorPersonas}
                        disabled={paginaPersonas === 1}
                      >
                        ← Anterior
                      </button>

                      <span className="contactos__paginacion-info">
                        {paginaPersonas} de {totalPaginasPersonas}
                      </span>

                      <button
                        type="button"
                        className="contactos__paginacion-boton"
                        onClick={irPaginaSiguientePersonas}
                        disabled={paginaPersonas === totalPaginasPersonas}
                      >
                        Siguiente →
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* GRUPOS */}
            <section className="contactos__grupo">
              <div className="contactos__grupo-cabecera">
                <span className="contactos__grupo-icono">👥</span>
                <h2 className="contactos__grupo-titulo">Grupos</h2>
                <span className="contactos__grupo-contador">{grupos.length}</span>
                <button
                  className="contactos__boton contactos__boton--wa"
                  onClick={() => setModalCrearGrupo(true)}
                >
                  + Crear grupo en WA
                </button>
              </div>

              {grupos.length === 0 ? (
                <p className="contactos__vacio">
                  No hay grupos registrados. Usa "Crear grupo en WA" o agrega un grupo con su JID
                  (ej: <code>120363403675305399@g.us</code>).
                </p>
              ) : (
                <>
                  <div className="contactos__lista">
                    {gruposVisibles.map((c) => (
                      <div key={c.idContacto} className="contactos__tarjeta contactos__tarjeta--grupo">
                        <div className="contactos__tarjeta-info">
                          <strong className="contactos__nombre">{c.contactoNombre}</strong>
                          {c.tokenWp && (
                            <span className="contactos__dato contactos__token">
                              JID: <code>{c.tokenWp}</code>
                            </span>
                          )}
                        </div>

                        <div className="contactos__tarjeta-acciones">
                          {c.tokenWp && (
                            <button
                              className="contactos__boton contactos__boton--wa"
                              onClick={() => setGrupoGestionando({ jid: c.tokenWp, nombre: c.contactoNombre })}
                            >
                              Gestionar
                            </button>
                          )}

                          <button
                            className="contactos__boton contactos__boton--secundario"
                            onClick={() => abrirEditar(c)}
                          >
                            Editar
                          </button>

                          {eliminandoId === c.idContacto ? (
                            <div className="contactos__confirmar-fila">
                              <span>¿Eliminar?</span>
                              <button
                                className="contactos__boton contactos__boton--peligro"
                                onClick={() => manejarEliminar(c.idContacto)}
                              >
                                Sí
                              </button>
                              <button
                                className="contactos__boton contactos__boton--ghost"
                                onClick={() => setEliminandoId(null)}
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              className="contactos__boton contactos__boton--peligro"
                              onClick={() => setEliminandoId(c.idContacto)}
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {totalPaginasGrupos > 1 && (
                    <div className="contactos__paginacion">
                      <button
                        type="button"
                        className="contactos__paginacion-boton"
                        onClick={irPaginaAnteriorGrupos}
                        disabled={paginaGrupos === 1}
                      >
                        ← Anterior
                      </button>

                      <span className="contactos__paginacion-info">
                        {paginaGrupos} de {totalPaginasGrupos}
                      </span>

                      <button
                        type="button"
                        className="contactos__paginacion-boton"
                        onClick={irPaginaSiguienteGrupos}
                        disabled={paginaGrupos === totalPaginasGrupos}
                      >
                        Siguiente →
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        )}

        {/* Modal crear/editar */}
        {modalAbierto && (
          <div className="contactos__overlay" onClick={cerrarModal}>
            <div className="contactos__modal" onClick={(e) => e.stopPropagation()}>
              <div className="contactos__modal-cabecera">
                <h2>{editandoId ? 'Editar contacto' : 'Nuevo contacto'}</h2>
                <button className="contactos__cerrar-modal" onClick={cerrarModal}>✕</button>
              </div>

              {errorForm && (
                <div className="contactos__alerta contactos__alerta--error">{errorForm}</div>
              )}

              <form onSubmit={manejarGuardar} className="contactos__form">
                {/* Tipo */}
                <div className="contactos__form-campo">
                  <label>Tipo *</label>
                  <div className="contactos__tipo-selector">
                    <label className={`contactos__tipo-opcion ${form.tipo === 'persona' ? 'contactos__tipo-opcion--activo' : ''}`}>
                      <input
                        type="radio"
                        name="tipo"
                        value="persona"
                        checked={form.tipo === 'persona'}
                        onChange={manejarCambio}
                      />
                      👤 Persona
                    </label>

                    <label className={`contactos__tipo-opcion ${form.tipo === 'grupo' ? 'contactos__tipo-opcion--activo' : ''}`}>
                      <input
                        type="radio"
                        name="tipo"
                        value="grupo"
                        checked={form.tipo === 'grupo'}
                        onChange={manejarCambio}
                      />
                      👥 Grupo
                    </label>
                  </div>
                </div>

                {/* Nombre */}
                <div className="contactos__form-campo">
                  <label htmlFor="nombreContacto">
                    {form.tipo === 'grupo' ? 'Nombre del grupo *' : 'Nombre completo *'}
                  </label>
                  <input
                    id="nombreContacto"
                    name="nombreContacto"
                    type="text"
                    value={form.nombreContacto}
                    onChange={manejarCambio}
                    placeholder={form.tipo === 'grupo' ? 'Ej. Grupo Incidentes CAVs' : 'Ej. Juan Pérez'}
                  />
                </div>

                {/* Número WA (solo personas) */}
                {form.tipo === 'persona' && (
                  <div className="contactos__form-campo">
                    <label htmlFor="numeroCelular">Número WhatsApp *</label>
                    <input
                      id="numeroCelular"
                      name="numeroCelular"
                      type="text"
                      value={form.numeroCelular}
                      onChange={manejarCambio}
                      placeholder="Ej. 573001112233"
                    />
                    <p className="contactos__form-ayuda">
                      Sin el + y con indicativo del país (ej: <code>573001234567</code>)
                    </p>
                  </div>
                )}

                {/* JID (solo grupos) */}
                {form.tipo === 'grupo' && (
                  <div className="contactos__form-campo">
                    <label htmlFor="tokenWp">JID del grupo WA *</label>
                    <input
                      id="tokenWp"
                      name="tokenWp"
                      type="text"
                      value={form.tokenWp}
                      onChange={manejarCambio}
                      placeholder="Ej. 120363403675305399@g.us"
                    />
                    <p className="contactos__form-ayuda">
                      El JID se obtiene al crear el grupo (termina en @g.us)
                    </p>
                  </div>
                )}

                <div className="contactos__form-acciones">
                  <button
                    type="button"
                    className="contactos__boton contactos__boton--secundario"
                    onClick={cerrarModal}
                    disabled={guardando}
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="contactos__boton contactos__boton--principal"
                    disabled={guardando}
                  >
                    {guardando ? 'Guardando...' : editandoId ? 'Guardar cambios' : 'Crear contacto'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal crear grupo WA */}
        {modalCrearGrupo && (
          <CrearGrupoWA
            onCerrar={() => setModalCrearGrupo(false)}
            onContactoCreado={() => {
              cargar();
              setExito('Grupo guardado como contacto.');
              setTimeout(() => setExito(''), 4000);
            }}
          />
        )}

        {/* Modal gestionar grupo WA */}
        {grupoGestionando && (
          <GestionGrupoWA
            jid={grupoGestionando.jid}
            nombre={grupoGestionando.nombre}
            onCerrar={() => setGrupoGestionando(null)}
          />
        )}
      </ContenedorPagina>
    </LayoutPrincipal>
  );
}

export default Contactos;