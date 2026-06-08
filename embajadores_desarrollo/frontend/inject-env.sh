#!/bin/sh
# inject-env.sh
# Inyecta variables de entorno en tiempo de ejecucion sobreescribiendo env-config.js.
# Se ejecuta como entrypoint del contenedor Docker antes de servir la app.
# Patron identico al de event_control_f/inject-env.sh.

echo "Inyectando variables de entorno en Embajadores Frontend..."

cat > /app/dist/env-config.js << EOF
window.ENV = {
  VITE_API_BASE_URL: "${VITE_API_BASE_URL:-http://localhost:9000}"
};
EOF

echo "Variables inyectadas:"
echo "  VITE_API_BASE_URL: ${VITE_API_BASE_URL}"

exec "$@"
