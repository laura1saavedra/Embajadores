import SelectBuscable from '../SelectBuscable/SelectBuscable';
import './FiltrosIncidentes.css';

const ESTADOS = [
  { valor: '', etiqueta: 'Todos' },
  { valor: 'abierto', etiqueta: 'Abierto' },
  { valor: 'cerrado', etiqueta: 'Cerrado' },
];

const MESES = [
  { valor: '', etiqueta: 'Todos' },
  { valor: '01', etiqueta: 'Enero' },
  { valor: '02', etiqueta: 'Febrero' },
  { valor: '03', etiqueta: 'Marzo' },
  { valor: '04', etiqueta: 'Abril' },
  { valor: '05', etiqueta: 'Mayo' },
  { valor: '06', etiqueta: 'Junio' },
  { valor: '07', etiqueta: 'Julio' },
  { valor: '08', etiqueta: 'Agosto' },
  { valor: '09', etiqueta: 'Septiembre' },
  { valor: '10', etiqueta: 'Octubre' },
  { valor: '11', etiqueta: 'Noviembre' },
  { valor: '12', etiqueta: 'Diciembre' },
];

const DIAS = [
  { valor: '', etiqueta: 'Todos' },
  ...Array.from({ length: 31 }, (_, index) => {
    const valor = String(index + 1).padStart(2, '0');
    return { valor, etiqueta: valor };
  }),
];

const obtenerAnios = () => {
  const anioActual = new Date().getFullYear();

  return [
    { valor: '', etiqueta: 'Todos' },
    ...Array.from({ length: 6 }, (_, index) => {
      const anio = String(anioActual - index);
      return { valor: anio, etiqueta: anio };
    }),
  ];
};

function FiltrosIncidentes({
  filtros,
  ciudades = [],
  cavsDisponibles = [],
  tiposFalla = [],
  cantidadFiltrosActivos = 0,
  cargando = false,
  onCambioFiltro,
  onAplicarFiltros,
  onLimpiarFiltros,
}) {
  const manejarSubmit = (evento) => {
    evento.preventDefault();
    onAplicarFiltros();
  };

  const anios = obtenerAnios();

  const opcionesCiudades = [
    { valor: '', etiqueta: 'Todas' },
    ...ciudades.map((c) => ({
      valor: c.idCiudad,
      etiqueta: c.nombreCiudad,
    })),
  ];

  const opcionesCavs = [
    {
      valor: '',
      etiqueta: filtros.ciudadId
        ? 'Todos'
        : 'Primero seleccione ciudad',
    },
    ...cavsDisponibles.map((c) => ({
      valor: c.idCav,
      etiqueta: c.nombreCav,
    })),
  ];

  const opcionesTiposFalla = [
    { valor: '', etiqueta: 'Todos' },
    ...tiposFalla.map((t) => ({
      // Se envía el nombre porque el backend filtra por TipoFalla.nombre_tipo
      valor: t.nombre,
      etiqueta: t.nombre,
    })),
  ];

  return (
    <section className="filtros-incidentes">
      <div className="filtros-incidentes__cabecera">
        <h2 className="filtros-incidentes__titulo">
          Filtros de búsqueda
        </h2>

        <span className="filtros-incidentes__contador">
          Filtros activos: {cantidadFiltrosActivos}
        </span>
      </div>

      <form
        className="filtros-incidentes__formulario"
        onSubmit={manejarSubmit}
      >
        <div className="filtros-incidentes__grid">

          {/* Año */}
          <div className="filtros-incidentes__campo">
            <SelectBuscable
              id="fechaAnio"
              label="Año"
              opciones={anios}
              valor={filtros.fechaAnio}
              onChange={onCambioFiltro}
              disabled={cargando}
              placeholder="Todos"
              placeholderBusqueda="Buscar año..."
            />
          </div>

          {/* Mes */}
          <div className="filtros-incidentes__campo">
            <SelectBuscable
              id="fechaMes"
              label="Mes"
              opciones={MESES}
              valor={filtros.fechaMes}
              onChange={onCambioFiltro}
              disabled={cargando}
              placeholder="Todos"
              placeholderBusqueda="Buscar mes..."
            />
          </div>

          {/* Día */}
          <div className="filtros-incidentes__campo">
            <SelectBuscable
              id="fechaDia"
              label="Día"
              opciones={DIAS}
              valor={filtros.fechaDia}
              onChange={onCambioFiltro}
              disabled={cargando}
              placeholder="Todos"
              placeholderBusqueda="Buscar día..."
            />
          </div>

          {/* Estado */}
          <div className="filtros-incidentes__campo">
            <SelectBuscable
              id="estado"
              label="Estado"
              opciones={ESTADOS}
              valor={filtros.estado}
              onChange={onCambioFiltro}
              disabled={cargando}
              placeholder="Todos"
              placeholderBusqueda="Buscar estado..."
            />
          </div>

          {/* Ciudad */}
          <div className="filtros-incidentes__campo">
            <SelectBuscable
              id="ciudadId"
              label="Ciudad"
              opciones={opcionesCiudades}
              valor={filtros.ciudadId}
              onChange={onCambioFiltro}
              disabled={cargando}
              placeholder="Todas"
              placeholderBusqueda="Buscar ciudad..."
            />
          </div>

          {/* CAV */}
          <div className="filtros-incidentes__campo">
            <SelectBuscable
              id="cavId"
              label="CAV"
              opciones={opcionesCavs}
              valor={filtros.cavId}
              onChange={onCambioFiltro}
              disabled={cargando || !filtros.ciudadId}
              placeholder={
                filtros.ciudadId
                  ? 'Todos'
                  : 'Primero seleccione ciudad'
              }
              placeholderBusqueda="Buscar CAV..."
            />
          </div>

          {/* Tipo de falla */}
          <div className="filtros-incidentes__campo">
            <SelectBuscable
              id="tipoFalla"
              label="Tipo de falla"
              opciones={opcionesTiposFalla}
              valor={filtros.tipoFalla}
              onChange={onCambioFiltro}
              disabled={cargando}
              placeholder="Todos"
              placeholderBusqueda="Buscar tipo..."
            />
          </div>

        </div>

        <div className="filtros-incidentes__acciones">
          <button
            type="button"
            className="filtros-incidentes__boton filtros-incidentes__boton--secundario"
            onClick={onLimpiarFiltros}
            disabled={cargando}
          >
            Limpiar filtros
          </button>

          <button
            type="submit"
            className="filtros-incidentes__boton filtros-incidentes__boton--principal"
            disabled={cargando}
          >
            {cargando ? 'Aplicando filtros...' : 'Aplicar filtros'}
          </button>
        </div>
      </form>
    </section>
  );
}

export default FiltrosIncidentes;