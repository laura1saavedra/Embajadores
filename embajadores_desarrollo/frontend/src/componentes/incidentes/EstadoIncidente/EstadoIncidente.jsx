import './EstadoIncidente.css';

function EstadoIncidente({ estado = '' }) {
  const estadoNormalizado = estado.toLowerCase().trim();

  const obtenerClase = () => {
    if (estadoNormalizado === 'abierto') return 'estado-incidente--abierto';
    if (estadoNormalizado === 'cerrado') return 'estado-incidente--cerrado';
    return 'estado-incidente--neutro';
  };

  const obtenerTexto = () => {
    if (estadoNormalizado === 'abierto') return 'Abierto';
    if (estadoNormalizado === 'cerrado') return 'Cerrado';
    return estado || 'Sin estado';
  };

  return (
    <span className={`estado-incidente ${obtenerClase()}`}>
      {obtenerTexto()}
    </span>
  );
}

export default EstadoIncidente;