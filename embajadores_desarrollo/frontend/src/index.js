import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/reset.css';
import './styles/global.css';

const contenedorRaiz = document.getElementById('root');

if (!contenedorRaiz) {
  throw new Error('No se encontró el elemento root para renderizar la aplicación.');
}

ReactDOM.createRoot(contenedorRaiz).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
