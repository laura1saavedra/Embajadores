import './Paginacion.css';

const crearRangoPaginas = (paginaActual, totalPaginas) => {
  const totalNormalizado = Math.max(1, Number(totalPaginas) || 1);
  const actual = Math.min(Math.max(1, Number(paginaActual) || 1), totalNormalizado);
  const maxVisibles = 5;

  if (totalNormalizado <= maxVisibles) {
    return Array.from({ length: totalNormalizado }, (_, index) => index + 1);
  }

  let inicio = Math.max(1, actual - 2);
  let fin = Math.min(totalNormalizado, inicio + maxVisibles - 1);

  if (fin - inicio + 1 < maxVisibles) {
    inicio = Math.max(1, fin - maxVisibles + 1);
  }

  return Array.from({ length: fin - inicio + 1 }, (_, index) => inicio + index);
};

function Paginacion({
  paginaActual,
  totalPaginas,
  onCambiarPagina,
  className = '',
}) {
  const totalNormalizado = Math.max(1, Number(totalPaginas) || 1);
  const actual = Math.min(Math.max(1, Number(paginaActual) || 1), totalNormalizado);

  if (totalNormalizado <= 1) return null;

  const cambiarPagina = (pagina) => {
    if (pagina < 1 || pagina > totalNormalizado || pagina === actual) return;
    onCambiarPagina?.(pagina);
  };

  const paginas = crearRangoPaginas(actual, totalNormalizado);

  return (
    <nav
      className={`paginacion ${className}`.trim()}
      aria-label="Paginacion"
    >
      <button
        type="button"
        className="paginacion__control"
        onClick={() => cambiarPagina(actual - 1)}
        disabled={actual === 1}
        aria-label="Pagina anterior"
      >
        ‹
      </button>

      {paginas.map((pagina) => (
        <button
          key={pagina}
          type="button"
          className={`paginacion__pagina${
            pagina === actual ? ' paginacion__pagina--activa' : ''
          }`}
          onClick={() => cambiarPagina(pagina)}
          aria-current={pagina === actual ? 'page' : undefined}
          aria-label={`Ir a pagina ${pagina}`}
        >
          {pagina}
        </button>
      ))}

      <button
        type="button"
        className="paginacion__control"
        onClick={() => cambiarPagina(actual + 1)}
        disabled={actual === totalNormalizado}
        aria-label="Pagina siguiente"
      >
        ›
      </button>
    </nav>
  );
}

export default Paginacion;
