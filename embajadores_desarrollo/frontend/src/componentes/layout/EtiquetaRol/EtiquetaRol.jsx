import { useAuth } from '../../../context/AuthContext';

function EtiquetaRol({ className = '' }) {
  const { usuario } = useAuth();
  const rolNombre = (usuario?.rolNombre || '').trim();

  return (
    <span className={className}>
      {rolNombre || 'Usuario'}
    </span>
  );
}

export default EtiquetaRol;
