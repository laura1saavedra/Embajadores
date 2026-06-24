import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import LayoutPrincipal from '../../componentes/layout/LayoutPrincipal/LayoutPrincipal';
import ContenedorPagina from '../../componentes/layout/ContenedorPagina/ContenedorPagina';
import EtiquetaRol from '../../componentes/layout/EtiquetaRol/EtiquetaRol';
import SelectBuscable from '../../componentes/incidentes/SelectBuscable/SelectBuscable';
import incidenteServicio from '../../services/incidenteServicio';

import './RegistrarIncidentes.css';

const ESTADO_INICIAL = {
  ciudadId: '',
  cavId: '',
  usuariosAfectados: '',
  usuariosOperacion: '',
};

const CAMPOS_USUARIOS_NUMERICOS = new Set([
  'usuariosAfectados',
  'usuariosOperacion',
]);

const sanitizarEntero = (valor) => valor.replace(/\D/g, '');

const bloquearCaracterNoNumerico = (evento) => {
  if (evento.ctrlKey || evento.metaKey || evento.altKey) return;

  const teclasPermitidas = [
    'Backspace',
    'Delete',
    'Tab',
    'Enter',
    'Escape',
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'Home',
    'End',
  ];

  if (teclasPermitidas.includes(evento.key)) return;

  if (!/^\d$/.test(evento.key)) {
    evento.preventDefault();
  }
};

const crearFila = () => ({
  id: Date.now() + Math.random(),
  aplicacionId: '',
  servicioId: '',
  tipoFallaId: '',
});

function RegistrarIncidente() {
  const avisoRef = useRef(null);
  const [formulario, setFormulario] = useState(ESTADO_INICIAL);
  const [ciudades, setCiudades] = useState([]);
  const [cavs, setCavs] = useState([]);
  const [aplicaciones, setAplicaciones] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [tiposFalla, setTiposFalla] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');
  const [mensajeError, setMensajeError] = useState('');
  const [versionAviso, setVersionAviso] = useState(0);
  const [idRegistrado, setIdRegistrado] = useState(null);
  const [tipoRegistro, setTipoRegistro] = useState('');
  const [filasAplicaciones, setFilasAplicaciones] = useState([
    crearFila(),
  ]);

  useEffect(() => {
    if (!versionAviso || (!mensajeExito && !mensajeError)) return;

    requestAnimationFrame(() => {
      avisoRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }, [versionAviso, mensajeExito, mensajeError]);

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
        setServicios(await incidenteServicio.obtenerServicios());
      } catch {
        setServicios([]);
      }

      try {
        setTiposFalla(await incidenteServicio.obtenerTiposFalla());
      } catch {
        setTiposFalla([]);
      }
    };

    init();
  }, []);

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

  const manejarCambio = (e) => {
    const { name, value } = e.target;
    const valor = CAMPOS_USUARIOS_NUMERICOS.has(name)
      ? sanitizarEntero(value)
      : value;

    if (name === 'ciudadId') {
      setFormulario((prev) => ({
        ...prev,
        ciudadId: valor,
        cavId: '',
      }));
    } else {
      setFormulario((prev) => ({
        ...prev,
        [name]: valor,
      }));
    }

    setMensajeError('');
  };

  const manejarCambioFila = (filaId, campo, valor) => {
    setFilasAplicaciones((prev) =>
      prev.map((fila) =>
        fila.id === filaId
          ? {
              ...fila,
              [campo]: valor,
              ...(campo === 'aplicacionId' ? { servicioId: '' } : {}),
            }
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

  const mostrarErrorSubmit = (mensaje) => {
    setMensajeExito('');
    setMensajeError(mensaje);
    setVersionAviso((prev) => prev + 1);
  };

  const mostrarExitoSubmit = (mensaje) => {
    setMensajeError('');
    setMensajeExito(mensaje);
    setVersionAviso((prev) => prev + 1);
  };

  const manejarLimpiar = () => {
    setFormulario(ESTADO_INICIAL);
    setCavs([]);
    setFilasAplicaciones([crearFila()]);
    setMensajeExito('');
    setMensajeError('');
    setIdRegistrado(null);
    setTipoRegistro('');
  };

  const manejarSubmit = async (e) => {
    e.preventDefault();

    if (
      !formulario.ciudadId ||
      !formulario.cavId ||
      formulario.usuariosAfectados === '' ||
      formulario.usuariosOperacion === ''
    ) {
      mostrarErrorSubmit('Completa todos los campos obligatorios (*).');
      return;
    }

    const filasValidas = filasAplicaciones.filter(
      (fila) => fila.aplicacionId && fila.servicioId && fila.tipoFallaId
    );

    const combinaciones = new Set();

    for (const fila of filasValidas) {
      const clave = `${fila.aplicacionId}-${fila.servicioId}-${fila.tipoFallaId}`;

      if (combinaciones.has(clave)) {
        mostrarErrorSubmit(
          'No se puede registrar la misma combinación de aplicación y tipo de falla más de una vez.'
        );
        return;
      }

      combinaciones.add(clave);
    }

    if (filasValidas.length === 0) {
      mostrarErrorSubmit(
        'Selecciona al menos una aplicación y un tipo de falla.'
      );
      return;
    }

    const usuariosAfectados = Number(formulario.usuariosAfectados);
    const usuariosOperacion = Number(formulario.usuariosOperacion);

    if (usuariosAfectados <= 0) {
      mostrarErrorSubmit(
        'Los usuarios afectados deben ser mayores que cero.'
      );
      return;
    }

    if (usuariosOperacion <= 0) {
      mostrarErrorSubmit(
        'Los usuarios en operación deben ser mayores que cero.'
      );
      return;
    }

    if (usuariosAfectados > usuariosOperacion) {
      mostrarErrorSubmit(
        'Los usuarios afectados no pueden ser mayores que los usuarios en operación.'
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

      setFormulario(ESTADO_INICIAL);
      setCavs([]);
      setFilasAplicaciones([crearFila()]);
      setIdRegistrado(creado.idIncidente);
      setTipoRegistro(creado.tipoRegistro);
      mostrarExitoSubmit(creado.mensaje);
    } catch (err) {
      mostrarErrorSubmit(
        err.message || 'No fue posible registrar el incidente.'
      );
    } finally {
      setGuardando(false);
    }
  };

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

  const obtenerOpcionesServicios = (aplicacionId) =>
    servicios
      .filter((servicio) => servicio.aplicacionId === aplicacionId)
      .map((servicio) => ({
        valor: servicio.id,
        etiqueta: servicio.nombre,
      }));

  return (
    <LayoutPrincipal>
      <ContenedorPagina>
        <section className="ri__hero">
          <div className="ri__hero-texto">
            <EtiquetaRol className="ri__hero-etiqueta" />

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
          <div ref={avisoRef} className="ri__alerta ri__alerta--exito">
            {mensajeExito}

            <div className="ri__enlaces-exito">
              {(tipoRegistro === 'historial' || tipoRegistro === 'mixto') && (
                <Link
                  to="/historial-incidentes"
                  className="ri__enlace"
                >
                  Ir a historial →
                </Link>
              )}

              {(tipoRegistro === 'masivo' || tipoRegistro === 'mixto') && (
                <Link to="/masivos" className="ri__enlace">
                  Ir a resumen →
                </Link>
              )}
            </div>
          </div>
        )}

        {mensajeError && (
          <div ref={avisoRef} className="ri__alerta ri__alerta--error">
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
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={formulario.usuariosAfectados}
                    onChange={manejarCambio}
                    onKeyDown={bloquearCaracterNoNumerico}
                  />
                </div>

                <div className="ri__campo">
                  <label htmlFor="usuariosOperacion">
                    Usuarios en operación{' '}
                    <span className="ri__requerido">*</span>
                  </label>

                  <input
                    id="usuariosOperacion"
                    name="usuariosOperacion"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={formulario.usuariosOperacion}
                    onChange={manejarCambio}
                    onKeyDown={bloquearCaracterNoNumerico}
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
                  Aplicaciones afectadas, servicio y tipo de falla{' '}
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
                <span>Servicio</span>
                <span>Tipo de falla</span>
                <span />
              </div>

              <div className="ri__tabla-body">
                {filasAplicaciones.map((fila, idx) => (
                  <div key={fila.id} className="ri__fila">
                    <span className="ri__fila-num">{idx + 1}</span>

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
                      id={`servicio-${fila.id}`}
                      valor={fila.servicioId}
                      opciones={obtenerOpcionesServicios(fila.aplicacionId)}
                      onChange={(e) =>
                        manejarCambioFila(
                          fila.id,
                          'servicioId',
                          e.target.value
                        )
                      }
                      placeholder={
                        fila.aplicacionId
                          ? 'Seleccione servicio'
                          : 'Primero seleccione aplicacion'
                      }
                      placeholderBusqueda="Buscar servicio..."
                      sinResultadosTexto="Sin servicios"
                      disabled={!fila.aplicacionId}
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
                      x
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
                {guardando ? 'Guardando...' : 'Registrar incidente'}
              </button>
            </div>
          </div>
        </form>
      </ContenedorPagina>
    </LayoutPrincipal>
  );
}

export default RegistrarIncidente;
