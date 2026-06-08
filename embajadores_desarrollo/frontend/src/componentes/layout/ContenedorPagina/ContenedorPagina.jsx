import './ContenedorPagina.css';

function ContenedorPagina({ titulo, descripcion, children }) {
  return (
    <main className="contenedor-pagina">
      {(titulo || descripcion) && (
        <header className="contenedor-pagina__encabezado">
          {titulo && <h1 className="contenedor-pagina__titulo">{titulo}</h1>}
          {descripcion && (
            <p className="contenedor-pagina__descripcion">{descripcion}</p>
          )}
        </header>
      )}

      <section className="contenedor-pagina__contenido">{children}</section>
    </main>
  );
}

export default ContenedorPagina;