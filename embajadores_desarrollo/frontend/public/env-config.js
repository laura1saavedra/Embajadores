// env-config.js
// URL del backend. El proxy CRA reenvía /api/* al backend 9000 del servidor.
// En produccion este archivo es sobreescrito por inject-env.sh.
window.ENV = {
  VITE_API_BASE_URL: "http://127.0.0.1:8000"
};
