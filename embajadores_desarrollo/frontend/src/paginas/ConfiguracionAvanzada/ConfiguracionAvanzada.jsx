import { useEffect, useState } from 'react';

import LayoutPrincipal from '../../componentes/layout/LayoutPrincipal/LayoutPrincipal';
import ContenedorPagina from '../../componentes/layout/ContenedorPagina/ContenedorPagina';
import EtiquetaRol from '../../componentes/layout/EtiquetaRol/EtiquetaRol';

import configuracionServicio from '../../services/configuracionServicio';

import AplicacionesTipos from './secciones/AplicacionesTipos/AplicacionesTipos';
import CiudadesCavs from './secciones/CiudadesCavs/CiudadesCavs';
import Usuarios from './secciones/Usuarios/Usuarios';

import './ConfiguracionAvanzada.css';

function ConfiguracionAvanzada() {
  const [vistaActiva, setVistaActiva] = useState('inicio');

  const [totalAplicaciones, setTotalAplicaciones] = useState(0);
  const [totalTiposFalla, setTotalTiposFalla] = useState(0);
  const [totalCiudades, setTotalCiudades] = useState(0);
  const [totalCavs, setTotalCavs] = useState(0);
  const [totalUsuarios, setTotalUsuarios] = useState(0);

  const [cargando, setCargando] = useState(true);
  const [mensajeError, setMensajeError] = useState('');

  useEffect(() => {
    cargarResumen();
  }, []);

  const cargarResumen = async () => {
    try {
      setCargando(true);
      setMensajeError('');

      const [aplicaciones, tiposFalla, ciudades, cavs, usuarios] =
        await Promise.all([
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
        error.message || 'No fue posible cargar la configuracion.'
      );
    } finally {
      setCargando(false);
    }
  };

  const abrirInicio = () => {
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
  ];

  return (
    <LayoutPrincipal>
      <ContenedorPagina>
        {vistaActiva === 'inicio' && (
          <>
            <section className="configuracion__hero">
              <div className="configuracion__hero-texto">
                <EtiquetaRol className="configuracion__hero-etiqueta" />

                <h1 className="configuracion__hero-titulo">
                  Configuracion <span>avanzada</span>
                </h1>

                <p className="configuracion__hero-descripcion">
                  Gestiona los catalogos y configuraciones generales de la
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
                Cargando configuracion...
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

        {vistaActiva === 'usuarios' && <Usuarios onVolver={abrirInicio} />}
      </ContenedorPagina>
    </LayoutPrincipal>
  );
}

export default ConfiguracionAvanzada;
