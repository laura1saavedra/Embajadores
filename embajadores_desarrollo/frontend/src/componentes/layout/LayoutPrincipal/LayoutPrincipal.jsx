import Header from '../Header/Header';
import './LayoutPrincipal.css';

function LayoutPrincipal({ children }) {
  return (
    <div className="layout-principal">
      <Header />
      <div className="layout-principal__contenido">{children}</div>
    </div>
  );
}

export default LayoutPrincipal;