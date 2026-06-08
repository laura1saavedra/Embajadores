import { useEffect, useMemo, useRef, useState } from 'react';
import './SelectBuscable.css';

function SelectBuscable({
  id,
  label,
  placeholder = 'Seleccione una opción',
  placeholderBusqueda = 'Buscar...',
  opciones = [],
  valor = '',
  onChange,
  disabled = false,
  required = false,
  sinResultadosTexto = 'No se encontraron resultados',
}) {
  const contenedorRef = useRef(null);
  const controlRef = useRef(null);
  const panelRef = useRef(null);
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [posicionPanel, setPosicionPanel] = useState({ top: 0, left: 0, width: 0, maxListaHeight: 220 });

  const opcionSeleccionada = useMemo(() => {
    return opciones.find((opcion) => String(opcion.valor) === String(valor));
  }, [opciones, valor]);

  const opcionesFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return opciones;

    return opciones.filter((opcion) =>
      String(opcion.etiqueta).toLowerCase().includes(texto)
    );
  }, [opciones, busqueda]);

  const calcularPosicion = () => {
    if (!controlRef.current) return;
    const rect = controlRef.current.getBoundingClientRect();
    const espacioDebajo = window.innerHeight - rect.bottom - 6;
    const alturaBusqueda = 58;
    const maxListaHeight = Math.max(80, espacioDebajo - alturaBusqueda - 8);

    setPosicionPanel({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
      maxListaHeight,
    });
  };

  useEffect(() => {
    const manejarClickFuera = (evento) => {
      const enContenedor = contenedorRef.current?.contains(evento.target);
      const enPanel = panelRef.current?.contains(evento.target);
      if (!enContenedor && !enPanel) {
        setAbierto(false);
        setBusqueda('');
      }
    };

    document.addEventListener('mousedown', manejarClickFuera);

    return () => {
      document.removeEventListener('mousedown', manejarClickFuera);
    };
  }, []);

  useEffect(() => {
    if (!abierto) return;

    const alResizeScroll = () => calcularPosicion();

    window.addEventListener('resize', alResizeScroll);
    window.addEventListener('scroll', alResizeScroll, true);

    return () => {
      window.removeEventListener('resize', alResizeScroll);
      window.removeEventListener('scroll', alResizeScroll, true);
    };
  }, [abierto]);

  const abrirOCerrar = () => {
    if (disabled) return;
    if (!abierto) {
      calcularPosicion();
    }
    setAbierto((prev) => !prev);
    if (abierto) {
      setBusqueda('');
    }
  };

  const seleccionarOpcion = (opcion) => {
    if (onChange) {
      onChange({
        target: {
          name: id,
          value: opcion.valor,
        },
      });
    }

    setAbierto(false);
    setBusqueda('');
  };

  return (
    <div className="select-buscable" ref={contenedorRef}>
      {label && (
        <label htmlFor={id} className="select-buscable__label">
          {label} {required && <span className="select-buscable__requerido">*</span>}
        </label>
      )}

      <button
        type="button"
        id={id}
        ref={controlRef}
        className={`select-buscable__control ${
          abierto ? 'select-buscable__control--abierto' : ''
        }`}
        onClick={abrirOCerrar}
        disabled={disabled}
      >
        <span className="select-buscable__valor">
          {opcionSeleccionada ? opcionSeleccionada.etiqueta : placeholder}
        </span>

        <span className="select-buscable__icono">{abierto ? '▴' : '▾'}</span>
      </button>

      {abierto && (
        <div
          ref={panelRef}
          className="select-buscable__panel"
          style={{
            position: 'fixed',
            top: `${posicionPanel.top}px`,
            left: `${posicionPanel.left}px`,
            width: `${posicionPanel.width}px`,
          }}
        >
          <div className="select-buscable__busqueda-contenedor">
            <input
              type="text"
              className="select-buscable__busqueda"
              placeholder={placeholderBusqueda}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              autoFocus
            />
          </div>

          <div className="select-buscable__lista" style={{ maxHeight: `${posicionPanel.maxListaHeight}px` }}>
            {opcionesFiltradas.length > 0 ? (
              opcionesFiltradas.map((opcion) => (
                <button
                  key={`${id}-${opcion.valor}`}
                  type="button"
                  className={`select-buscable__opcion ${
                    String(opcion.valor) === String(valor)
                      ? 'select-buscable__opcion--activa'
                      : ''
                  }`}
                  onClick={() => seleccionarOpcion(opcion)}
                >
                  {opcion.etiqueta}
                </button>
              ))
            ) : (
              <div className="select-buscable__sin-resultados">
                {sinResultadosTexto}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SelectBuscable;