import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import LayoutPrincipal from '../../componentes/layout/LayoutPrincipal/LayoutPrincipal';
import ContenedorPagina from '../../componentes/layout/ContenedorPagina/ContenedorPagina';
import SelectBuscable from '../../componentes/incidentes/SelectBuscable/SelectBuscable';
import incidenteServicio from '../../services/incidenteServicio';

import './RegistrarIncidentes.css';

// ── Constantes ────────────────────────────────────────────────────────────────

const ESTADO_INICIAL = {
  ciudadId: '',
  cavId: '',
  usuariosAfectados: '',
  usuariosTotalidad: '',
};

const crearFila = () => ({
  id: Date.now() + Math.random(),
  aplicacionId: '',
  tipoFallaId: '',
});

// ── Componente ────────────────────────────────────────────────────────────────

function RegistrarIncidente() {
  const [formulario, setFormulario] = useState(ESTADO_INICIAL);

  const [ciudades, setCiudades] = useState([]);
  const [cavs, setCavs] = useState([]);

  const [aplicaciones, setAplicaciones] = useState([]);
  const [tiposFalla, setTiposFalla] = useState([]);

  const [guardando, setGuardando] = useState(false);

  const [mensajeExito, setMensajeExito] = useState('');
  const [mensajeError, setMensajeError] = useState('');

  const [idRegistrado, setIdRegistrado] = useState(null);
  const [masivoRegistradoId, setMasivoRegistradoId] = useState(null);
  const [perteneceAMasivo, setPerteneceAMasivo] = useState(false);

  const [filasAplicaciones, setFilasAplicaciones] = useState([
    crearFila(),
  ]);

  // ── Carga inicial ──────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      try {
        setCiudades(await incidenteServicio.obtenerCiudades());
      } catch {
        setCiudades([]);
      }

      try {
        setAplicaciones(await incidenteServicio.obtenerAplicaciones());
      } catch {
        setAplicaciones([]);
      }

      try {
        setTiposFalla(await incidenteServicio.obtenerTiposFalla());
      } catch {
        setTiposFalla([]);
      }
    };

    init();
  }, []);

  // ── CAVs ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!formulario.ciudadId) {
      setCavs([]);
      return;
    }

    incidenteServicio
      .obtenerCavsPorCiudad(formulario.ciudadId)
      .then(setCavs)
      .catch(() => setCavs([]));
  }, [formulario.ciudadId]);

  // ── Handlers formulario ────────────────────────────────────────────────────

  const manejarCambio = (e) => {
    const { name, value } = e.target;

    if (name === 'ciudadId') {
      setFormulario((prev) => ({
        ...prev,
        ciudadId: value,
        cavId: '',
      }));
    } else {
      setFormulario((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    setMensajeError('');
  };

  const manejarCambioFila = (filaId, campo, valor) => {
    setFilasAplicaciones((prev) =>
      prev.map((fila) =>
        fila.id === filaId
          ? { ...fila, [campo]: valor }
          : fila
      )
    );

    setMensajeError('');
  };

  const agregarFila = () => {
    setFilasAplicaciones((prev) => [...prev, crearFila()]);
  };

  const quitarFila = (filaId) => {
    if (filasAplicaciones.length === 1) return;

    setFilasAplicaciones((prev) =>
      prev.filter((fila) => fila.id !== filaId)
    );
  };

  // ── Limpiar ────────────────────────────────────────────────────────────────

  const manejarLimpiar = () => {
    setFormulario(ESTADO_INICIAL);
    setCavs([]);
    setFilasAplicaciones([crearFila()]);
    setMensajeExito('');
    setMensajeError('');
    setIdRegistrado(null);
    setMasivoRegistradoId(null);
    setPerteneceAMasivo(false);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const manejarSubmit = async (e) => {
    e.preventDefault();

    if (
      !formulario.ciudadId ||
      !formulario.cavId ||
      formulario.usuariosAfectados === ''
    ) {
      setMensajeError('Completa todos los campos obligatorios (*).');
      return;
    }

    const filasValidas = filasAplicaciones.filter(
      (fila) => fila.aplicacionId && fila.tipoFallaId
    );

    if (filasValidas.length === 0) {
      setMensajeError(
        'Selecciona al menos una aplicación y un tipo de falla.'
      );
      return;
    }

    const usuariosAfectados = Number(formulario.usuariosAfectados);

    const usuariosTotalidad =
      formulario.usuariosTotalidad !== ''
        ? Number(formulario.usuariosTotalidad)
        : null;

    if (usuariosAfectados < 0) {
      setMensajeError(
        'Los usuarios afectados no pueden ser negativos.'
      );
      return;
    }

    if (
      usuariosTotalidad !== null &&
      usuariosAfectados > usuariosTotalidad
    ) {
      setMensajeError(
        'Los usuarios afectados no pueden ser mayores que los usuarios totales.'
      );
      return;
    }

    try {
      setGuardando(true);
      setMensajeError('');

      const creado = await incidenteServicio.crearIncidente({
        ...formulario,
        filasAplicaciones: filasValidas,
      });

      const incidentePerteneceAMasivo =
        creado.perteneceAMasivo || Boolean(creado.masivoId);

      setFormulario(ESTADO_INICIAL);
      setCavs([]);
      setFilasAplicaciones([crearFila()]);

      setIdRegistrado(creado.idIncidente);
      setMasivoRegistradoId(creado.masivoId || null);
      setPerteneceAMasivo(incidentePerteneceAMasivo);

      if (incidentePerteneceAMasivo) {
        setMensajeExito(
          creado.mensaje ||
            `Incidente #${creado.idIncidente} registrado correctamente. Este incidente fue asociado al incidente masivo #${creado.masivoId} y se podrá consultar en la sección de Masivos.`
        );
      } else {
        setMensajeExito(
          creado.mensaje ||
            `Incidente #${creado.idIncidente} registrado correctamente en estado "abierto".`
        );
      }
    } catch (err) {
      setMensajeError(
        err.message || 'No fue posible registrar el incidente.'
      );
    } finally {
      setGuardando(false);
    }
  };

  // ── Datos derivados ────────────────────────────────────────────────────────

  const opcionesCiudades = ciudades.map((c) => ({
    valor: c.idCiudad,
    etiqueta: c.nombreCiudad,
  }));

  const opcionesCavs = cavs.map((c) => ({
    valor: c.idCav,
    etiqueta: c.nombreCav,
  }));

  const opcionesAplicaciones = aplicaciones.map((a) => ({
    valor: a.id,
    etiqueta: a.nombre,
  }));

  const opcionesTiposFalla = tiposFalla.map((t) => ({
    valor: t.id,
    etiqueta: t.nombre,
  }));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <LayoutPrincipal>
      <ContenedorPagina>
        <section className="ri__hero">
          <div className="ri__hero-texto">
            <span className="ri__hero-etiqueta">Embajador/a</span>

            <h1 className="ri__hero-titulo">
              Registra un <span>incidente</span>
            </h1>

            <p className="ri__hero-desc">
              Reporta una novedad de forma clara y rápida.
              Completa la información del incidente para dejarlo
              registrado en el sistema.
            </p>
          </div>
        </section>

        {mensajeExito && (
          <div className="ri__alerta ri__alerta--exito">
            {mensajeExito}

            <div className="ri__enlaces-exito">
              {perteneceAMasivo && masivoRegistradoId ? (
                <Link
                  to={`/detalle-masivo/${masivoRegistradoId}`}
                  className="ri__enlace"
                >
                  Ver masivo #{masivoRegistradoId} →
                </Link>
              ) : (
                <>
                  <Link
                    to="/historial-incidentes"
                    className="ri__enlace"
                  >
                    Ver historial →
                  </Link>

                  {idRegistrado && (
                    <Link
                      to={`/detalle-incidente/${idRegistrado}`}
                      className="ri__enlace"
                    >
                      Ver incidente #{idRegistrado} →
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {mensajeError && (
          <div className="ri__alerta ri__alerta--error">
            {mensajeError}
          </div>
        )}

        <form className="ri__layout" onSubmit={manejarSubmit}>
          <div className="ri__card">
            <div className="ri__bloque">
              <h2 className="ri__bloque-titulo">
                Información del incidente
              </h2>

              <div className="ri__grid">
                <div className="ri__campo">
                  <SelectBuscable
                    id="ciudadId"
                    label="Ciudad"
                    required
                    valor={formulario.ciudadId}
                    onChange={manejarCambio}
                    opciones={opcionesCiudades}
                    placeholder="Seleccionar ciudad"
                    placeholderBusqueda="Buscar ciudad..."
                  />
                </div>

                <div className="ri__campo">
                  <SelectBuscable
                    id="cavId"
                    label="CAV"
                    required
                    valor={formulario.cavId}
                    onChange={manejarCambio}
                    opciones={opcionesCavs}
                    placeholder={
                      formulario.ciudadId
                        ? 'Seleccionar CAV'
                        : 'Primero elija ciudad'
                    }
                    placeholderBusqueda="Buscar CAV..."
                    disabled={!formulario.ciudadId}
                  />
                </div>

                <div className="ri__campo">
                  <label htmlFor="usuariosAfectados">
                    Usuarios afectados{' '}
                    <span className="ri__requerido">*</span>
                  </label>

                  <input
                    id="usuariosAfectados"
                    name="usuariosAfectados"
                    type="number"
                    min="0"
                    value={formulario.usuariosAfectados}
                    onChange={manejarCambio}
                  />
                </div>

                <div className="ri__campo">
                  <label htmlFor="usuariosTotalidad">
                    Usuarios totales
                  </label>

                  <input
                    id="usuariosTotalidad"
                    name="usuariosTotalidad"
                    type="number"
                    min="0"
                    value={formulario.usuariosTotalidad}
                    onChange={manejarCambio}
                  />
                </div>
              </div>
            </div>

            <hr className="ri__divisor" />

            <div className="ri__bloque">
              <div className="ri__bloque-cabecera">
                <h2
                  className="ri__bloque-titulo"
                  style={{ marginBottom: 0 }}
                >
                  Aplicaciones afectadas y tipo de falla{' '}
                  <span className="ri__requerido">*</span>
                </h2>

                <button
                  type="button"
                  className="ri__btn-agregar"
                  onClick={agregarFila}
                >
                  + Agregar
                </button>
              </div>

              <div className="ri__tabla-head">
                <span className="ri__tabla-head-num">#</span>
                <span>Aplicación</span>
                <span>Tipo de falla</span>
                <span />
              </div>

              <div className="ri__tabla-body">
                {filasAplicaciones.map((fila, idx) => (
                  <div key={fila.id} className="ri__fila">
                    <span className="ri__fila-num">
                      {idx + 1}
                    </span>

                    <SelectBuscable
                      id={`app-${fila.id}`}
                      valor={fila.aplicacionId}
                      opciones={opcionesAplicaciones}
                      onChange={(e) =>
                        manejarCambioFila(
                          fila.id,
                          'aplicacionId',
                          e.target.value
                        )
                      }
                      placeholder="— Seleccione aplicación —"
                      placeholderBusqueda="Buscar aplicación..."
                      sinResultadosTexto="Sin aplicaciones"
                    />

                    <SelectBuscable
                      id={`tipo-${fila.id}`}
                      valor={fila.tipoFallaId}
                      opciones={opcionesTiposFalla}
                      onChange={(e) =>
                        manejarCambioFila(
                          fila.id,
                          'tipoFallaId',
                          e.target.value
                        )
                      }
                      placeholder="— Seleccione tipo de falla —"
                      placeholderBusqueda="Buscar tipo de falla..."
                      sinResultadosTexto="Sin tipos de falla"
                    />

                    <button
                      type="button"
                      className="ri__btn-quitar"
                      onClick={() => quitarFila(fila.id)}
                      disabled={filasAplicaciones.length === 1}
                      title="Quitar fila"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="ri__acciones">
              <button
                type="button"
                className="ri__boton ri__boton--secundario"
                onClick={manejarLimpiar}
                disabled={guardando}
              >
                Limpiar
              </button>

              <button
                type="submit"
                className="ri__boton ri__boton--principal"
                disabled={guardando}
              >
                {guardando
                  ? 'Guardando...'
                  : 'Registrar incidente'}
              </button>
            </div>
          </div>
        </form>
      </ContenedorPagina>
    </LayoutPrincipal>
  );
}

export default RegistrarIncidente;