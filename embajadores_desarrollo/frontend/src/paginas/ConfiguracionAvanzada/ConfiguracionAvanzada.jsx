import { useEffect, useState } from 'react';

import { Link, useLocation } from 'react-router-dom';

import LayoutPrincipal from '../../componentes/layout/LayoutPrincipal/LayoutPrincipal';
import ContenedorPagina from '../../componentes/layout/ContenedorPagina/ContenedorPagina';
import EstadoIncidente from '../../componentes/incidentes/EstadoIncidente/EstadoIncidente';

import configuracionServicio from '../../services/configuracionServicio';
import masivoServicio, {
  obtenerDiasActivosMasivos,
} from '../../services/masivoServicio';

import AplicacionesTipos from './secciones/AplicacionesTipos/AplicacionesTipos';
import CiudadesCavs from './secciones/CiudadesCavs/CiudadesCavs';
import Usuarios from './secciones/Usuarios/Usuarios';
// import HorarioLaboral from './secciones/HorarioLaboral/HorarioLaboral';

import './ConfiguracionAvanzada.css';

function ConfiguracionAvanzada() {
  const location = useLocation();
  const [vistaActiva, setVistaActiva] = useState('inicio');
  const [diasActivosMasivos, setDiasActivosMasivos] = useState(
    obtenerDiasActivosMasivos()
  );
  const [fechaConfiguracionDiasActivos, setFechaConfiguracionDiasActivos] =
    useState(new Date().toISOString());
  const [mensajeDiasActivos, setMensajeDiasActivos] = useState('');
  const [editandoDiasActivos, setEditandoDiasActivos] = useState(false);
  const [masivosCerradosActivos, setMasivosCerradosActivos] = useState([]);
  const [cargandoMasivosCerrados, setCargandoMasivosCerrados] = useState(false);

  const [totalAplicaciones, setTotalAplicaciones] = useState(0);
  const [totalTiposFalla, setTotalTiposFalla] = useState(0);

  const [totalCiudades, setTotalCiudades] = useState(0);
  const [totalCavs, setTotalCavs] = useState(0);
  const [totalUsuarios, setTotalUsuarios] = useState(0);

  const [cargando, setCargando] = useState(true);
  const [mensajeError, setMensajeError] = useState('');

  useEffect(() => {
    cargarResumen();
    cargarDiasActivosMasivos();
    cargarMasivosCerradosActivos();
  }, []);

  useEffect(() => {
    if (location.state?.vistaActiva === 'horario') {
      setVistaActiva('horario');
      cargarMasivosCerradosActivos();
    }
  }, [location.state]);

  const cargarDiasActivosMasivos = async () => {
    try {
      const configuracion =
        await configuracionServicio.obtenerDiasActivosMasivos();

      setDiasActivosMasivos(configuracion.diasActivos);
      setFechaConfiguracionDiasActivos(
        configuracion.fechaActualizacion || new Date().toISOString()
      );
      setEditandoDiasActivos(!configuracion.fechaActualizacion);
    } catch (error) {
      setDiasActivosMasivos(obtenerDiasActivosMasivos());
      setFechaConfiguracionDiasActivos(new Date().toISOString());
      setEditandoDiasActivos(true);
    }
  };

  const cargarMasivosCerradosActivos = async () => {
    try {
      setCargandoMasivosCerrados(true);

      const masivos = await masivoServicio.listarMasivos(
        {},
        { incluirCerrados: true }
      );

      setMasivosCerradosActivos(
        masivos.filter((masivo) => masivo.estado === 'cerrado')
      );
    } catch (error) {
      setMasivosCerradosActivos([]);
    } finally {
      setCargandoMasivosCerrados(false);
    }
  };

  const cargarResumen = async () => {
    try {
      setCargando(true);
      setMensajeError('');

      const [aplicaciones, tiposFalla, ciudades, cavs, usuarios] = await Promise.all([
        configuracionServicio.listarAplicaciones(),
        configuracionServicio.listarTiposFalla(),
        configuracionServicio.listarCiudades(),
        configuracionServicio.listarCavs(),
        configuracionServicio.listarUsuarios(),
      ]);

      setTotalAplicaciones(aplicaciones.length);
      setTotalTiposFalla(tiposFalla.length);
      setTotalCiudades(ciudades.length);
      setTotalCavs(cavs.length);
      setTotalUsuarios(usuarios.length);
    } catch (error) {
      setMensajeError(
        error.message || 'No fue posible cargar la configuraciÃ³n.'
      );
    } finally {
      setCargando(false);
    }
  };

  const abrirInicio = () => {
    setMensajeDiasActivos('');
    setVistaActiva('inicio');
    cargarResumen();
  };

  const tarjetas = [
    {
      id: 'aplicaciones-tipos',
      icono: 'AT',
      titulo: 'Aplicaciones / Tipos de falla',
      descripcion:
        'Administra las aplicaciones y los tipos de falla disponibles en la plataforma.',
      total: totalAplicaciones + totalTiposFalla,
      clase: 'rojo',
      accion: () => setVistaActiva('aplicaciones-tipos'),
    },
    {
      id: 'usuarios',
      icono: 'US',
      titulo: 'Usuarios',
      descripcion: 'Gestiona los usuarios, roles y permisos de acceso.',
      total: totalUsuarios,
      clase: 'morado',
      accion: () => setVistaActiva('usuarios'),
    },
    {
      id: 'ciudades-cavs',
      icono: 'CC',
      titulo: 'Ciudades / CAVs',
      descripcion: 'Administra las ciudades disponibles y los CAVs asociados.',
      total: totalCiudades + totalCavs,
      clase: 'azul',
      accion: () => setVistaActiva('ciudades-cavs'),
    },
    {
      id: 'horario',
      icono: 'DA',
      titulo: 'Días activos',
      descripcion:
        'Define cuánto tiempo se muestran los incidentes masivos cerrados.',
      total: diasActivosMasivos,
      clase: 'verde',
      accion: () => {
        setMensajeDiasActivos('');
        setVistaActiva('horario');
      },
    },
  ];

  const formatearFechaCorta = (fecha) => {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'short',
    }).format(fecha);
  };

  const calcularFechaInicioDiasActivos = () => {
    const fecha = new Date(fechaConfiguracionDiasActivos);

    if (Number.isNaN(fecha.getTime())) {
      return formatearFechaCorta(new Date());
    }

    return formatearFechaCorta(fecha);
  };

  const calcularFechaFinDiasActivos = () => {
    const dias = Math.max(1, Number(diasActivosMasivos) || 1);
    const fecha = new Date(fechaConfiguracionDiasActivos);

    if (Number.isNaN(fecha.getTime())) {
      fecha.setTime(Date.now());
    }

    fecha.setDate(fecha.getDate() + dias);

    return formatearFechaCorta(fecha);
  };

  const cancelarDiasActivos = async () => {
    setMensajeDiasActivos('');
    await cargarDiasActivosMasivos();
  };

  const guardarDiasActivos = async (evento) => {
    evento.preventDefault();

    try {
      const configuracionGuardada =
        await configuracionServicio.guardarDiasActivosMasivos(
          diasActivosMasivos
        );

      setDiasActivosMasivos(configuracionGuardada.diasActivos);
      setFechaConfiguracionDiasActivos(
        configuracionGuardada.fechaActualizacion || new Date().toISOString()
      );
      setEditandoDiasActivos(false);
      setMensajeDiasActivos('Configuración guardada correctamente.');
      await cargarMasivosCerradosActivos();
    } catch (error) {
      setMensajeDiasActivos('');
      setMensajeError(
        error.message || 'No fue posible guardar los días activos.'
      );
    }
  };

  const editarDiasActivos = () => {
    setMensajeDiasActivos('');
    setEditandoDiasActivos(true);
  };

  const eliminarDiasActivos = async () => {
    try {
      const configuracionEliminada =
        await configuracionServicio.eliminarDiasActivosMasivos();

      setDiasActivosMasivos(configuracionEliminada.diasActivos);
      setFechaConfiguracionDiasActivos(new Date().toISOString());
      setEditandoDiasActivos(true);
      setMensajeDiasActivos('Configuración eliminada correctamente.');
      await cargarMasivosCerradosActivos();
    } catch (error) {
      setMensajeDiasActivos('');
      setMensajeError(
        error.message || 'No fue posible eliminar los días activos.'
      );
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'Sin registrar';

    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(fecha));
  };

  const formatearUsuarios = (usuariosAfectados, usuariosTotales) => {
    if (usuariosTotales === null || usuariosTotales === undefined) {
      return usuariosAfectados ?? 0;
    }

    return `${usuariosAfectados ?? 0} / ${usuariosTotales}`;
  };

  return (
    <LayoutPrincipal>
      <ContenedorPagina>
        {vistaActiva === 'inicio' && (
          <>
            <section className="configuracion__hero">
              <div className="configuracion__hero-texto">
                <span className="configuracion__hero-etiqueta">
                  Administrador
                </span>

                <h1 className="configuracion__hero-titulo">
                  Configuración <span>avanzada</span>
                </h1>

                <p className="configuracion__hero-descripcion">
                  Gestiona los catálogos y configuraciones generales de la
                  plataforma.
                </p>
              </div>
            </section>

            {mensajeError && (
              <div className="configuracion__alerta configuracion__alerta--error">
                {mensajeError}
              </div>
            )}

            {cargando ? (
              <p className="configuracion__texto-simple">
                Cargando configuración...
              </p>
            ) : (
              <section className="configuracion__grid">
                {tarjetas.map((tarjeta) => (
                  <article
                    key={tarjeta.id}
                    className="configuracion__tarjeta"
                  >
                    <div className="configuracion__tarjeta-superior">
                      <div
                        className={`configuracion__icono configuracion__icono--${tarjeta.clase}`}
                      >
                        {tarjeta.icono}
                      </div>

                      <span
                        className={`configuracion__contador configuracion__contador--${tarjeta.clase}`}
                      >
                        {tarjeta.total}
                      </span>
                    </div>

                    <div className="configuracion__tarjeta-cuerpo">
                      <h2>{tarjeta.titulo}</h2>
                      <p>{tarjeta.descripcion}</p>
                    </div>

                    <button
                      type="button"
                      className="configuracion__boton-outline"
                      onClick={tarjeta.accion}
                    >
                      Administrar
                    </button>
                  </article>
                ))}
              </section>
            )}
          </>
        )}

        {vistaActiva === 'aplicaciones-tipos' && (
          <AplicacionesTipos onVolver={abrirInicio} />
        )}

        {vistaActiva === 'ciudades-cavs' && (
          <CiudadesCavs onVolver={abrirInicio} />
        )}

        {vistaActiva === 'usuarios' && (
          <Usuarios onVolver={abrirInicio} />
        )}

        {vistaActiva === 'horario' && (
          <section className="configuracion__bloque">
            <button
              type="button"
              className="configuracion__volver"
              onClick={abrirInicio}
            >
              &larr;
            </button>

            <div className="configuracion__titulo-seccion">
              <h1>
                Días <span>activos</span>
              </h1>

              <p>
                Establece durante cuántos días se podrán ver los incidentes
                masivos cerrados en el listado de masivos.
              </p>
            </div>

            {mensajeDiasActivos && (
              <div className="configuracion__alerta configuracion__alerta--exito configuracion__alerta-dias-activos">
                {mensajeDiasActivos}
              </div>
            )}

            {editandoDiasActivos ? (
              <form
                className="configuracion__dias-activos"
                onSubmit={guardarDiasActivos}
              >
                <div className="configuracion__dias-activos-campo">
                  <label htmlFor="diasActivosMasivos">
                    Cantidad de días
                  </label>

                  <div className="configuracion__dias-activos-control">
                    <input
                      id="diasActivosMasivos"
                      type="number"
                      min="1"
                      max="365"
                      step="1"
                      value={diasActivosMasivos}
                      onChange={(evento) => {
                        setDiasActivosMasivos(evento.target.value);
                        setMensajeDiasActivos('');
                      }}
                    />

                    <span>días</span>
                  </div>

                  <small>Rango permitido: 1 - 365 días</small>
                </div>

                <div className="configuracion__dias-activos-divisor" />

                <div className="configuracion__dias-activos-ayuda">
                  <span className="configuracion__dias-activos-icono">
                    📅
                  </span>
                  <p>
                    Con esta configuración, los incidentes masivos cerrados se
                    mostrarán desde el {calcularFechaInicioDiasActivos()} hasta
                    el {calcularFechaFinDiasActivos()}.
                  </p>
                </div>

                <div className="configuracion__dias-activos-acciones">
                  <button
                    type="button"
                    className="configuracion__boton-cancelar"
                    onClick={cancelarDiasActivos}
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="configuracion__boton-guardar"
                  >
                    Guardar cambios
                  </button>
                </div>
              </form>
            ) : (
              <div className="configuracion__dias-activos configuracion__dias-activos--resumen">
                <div className="configuracion__dias-activos-campo">
                  <span className="configuracion__dias-activos-etiqueta">
                    Días configurados
                  </span>
                  <strong className="configuracion__dias-activos-valor">
                    {diasActivosMasivos} días
                  </strong>
                </div>

                <div className="configuracion__dias-activos-divisor" />

                <div className="configuracion__dias-activos-ayuda">
                  <span className="configuracion__dias-activos-icono">
                    📅
                  </span>
                  <p>
                    Los incidentes masivos cerrados se mostrarán desde el{' '}
                    {calcularFechaInicioDiasActivos()} hasta el{' '}
                    {calcularFechaFinDiasActivos()}.
                  </p>
                </div>

                <div className="configuracion__dias-activos-acciones">
                  <button
                    type="button"
                    className="configuracion__boton-cancelar"
                    onClick={editarDiasActivos}
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    className="configuracion__boton-eliminar"
                    onClick={eliminarDiasActivos}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            )}

            <div className="configuracion__masivos-cerrados">
              <div className="configuracion__masivos-cerrados-cabecera">
                <div>
                  <div className="configuracion__masivos-cerrados-titulo">
                    <h3>Incidentes masivos cerrados</h3>
                    <span>{masivosCerradosActivos.length}</span>
                  </div>

                  <p>
                    Estos incidentes se muestran por el tiempo configurado (
                    {diasActivosMasivos} días) y luego se eliminan automáticamente.
                  </p>
                </div>

                <button
                  type="button"
                  className="configuracion__boton-actualizar"
                  onClick={cargarMasivosCerradosActivos}
                  disabled={cargandoMasivosCerrados}
                >
                  Actualizar
                </button>
              </div>

              {cargandoMasivosCerrados ? (
                <p className="configuracion__texto-simple">
                  Cargando incidentes masivos cerrados...
                </p>
              ) : masivosCerradosActivos.length === 0 ? (
                <p className="configuracion__texto-simple">
                  No hay incidentes masivos cerrados dentro de los días activos
                  configurados.
                </p>
              ) : (
                <div className="configuracion__tabla-contenedor">
                  <table className="configuracion__tabla-masivos">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Aplicación</th>
                        <th>Tipo de falla</th>
                        <th>Incidentes</th>
                        <th>CAVs</th>
                        <th>Usuarios afectados</th>
                        <th>Estado</th>
                        <th>Fecha generación</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>

                    <tbody>
                      {masivosCerradosActivos.map((masivo) => (
                        <tr key={masivo.idMasivo}>
                          <td>#{masivo.idMasivo}</td>
                          <td>
                            {masivo.aplicacionNombre || 'Sin aplicación'}
                          </td>
                          <td>{masivo.tipoFallaNombre || 'Sin tipo'}</td>
                          <td>{masivo.cantidadIncidentes}</td>
                          <td>{masivo.cantidadCavs}</td>
                          <td>
                            {formatearUsuarios(
                              masivo.usuariosAfectados,
                              masivo.usuariosTotales
                            )}
                          </td>
                          <td>
                            <EstadoIncidente estado={masivo.estado} />
                          </td>
                          <td>{formatearFecha(masivo.fechaHoraGenerado)}</td>
                          <td>
                            <Link
                              to={`/detalle-masivo/${masivo.idMasivo}`}
                              state={{ origen: 'dias-activos' }}
                              className="configuracion__enlace-detalle"
                            >
                              Ver detalle
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}
      </ContenedorPagina>
    </LayoutPrincipal>
  );
}

export default ConfiguracionAvanzada;


