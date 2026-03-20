#!/bin/sh
set -e

echo "=== Bienestar Integral — Iniciando ==="

echo "=> Comprobando variables de entorno en Docker:"
if [ -z "$DATABASE_URL" ]; then
  echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  echo "ERROR CRITICO: La variable DATABASE_URL NO ESTÁ DEFINIDA."
  echo "Coolify no está inyectando esta variable al contenedor."
  echo "Por favor, añádela en la pestaña Environment Variables de Coolify."
  echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
else
  echo "DATABASE_URL detectada. Longitud: ${#DATABASE_URL} caracteres."
fi

echo "Esperando base de datos..."
MAX_TRIES=30
COUNT=0
until npx prisma db push --accept-data-loss; do
  COUNT=$((COUNT+1))
  if [ "$COUNT" -ge "$MAX_TRIES" ]; then
    echo "ERROR: No se pudo conectar a la base de datos después de $MAX_TRIES intentos."
    exit 1
  fi
  echo "  Intento $COUNT/$MAX_TRIES — reintentando en 3s..."
  sleep 3
done

echo "Schema sincronizado."

echo "Verificando usuario admin..."
node server/seed-admin.js

echo "=== Iniciando servidor en puerto ${PORT:-3000} ==="
exec node server/index.js
