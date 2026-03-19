#!/bin/sh
set -e

echo "=== Bienestar Integral — Iniciando ==="

# Extraer host y puerto del DATABASE_URL
DB_HOST=$(echo $DATABASE_URL | sed 's/.*@\([^:]*\):.*/\1/')
DB_PORT=$(echo $DATABASE_URL | sed 's/.*:\([0-9]*\)\/.*/\1/')

echo "Esperando base de datos en $DB_HOST:$DB_PORT..."
MAX_TRIES=30
COUNT=0
until nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; do
  COUNT=$((COUNT+1))
  if [ "$COUNT" -ge "$MAX_TRIES" ]; then
    echo "ERROR: No se pudo conectar a $DB_HOST:$DB_PORT después de $MAX_TRIES intentos."
    exit 1
  fi
  echo "  Intento $COUNT/$MAX_TRIES — reintentando en 2s..."
  sleep 2
done
echo "Base de datos disponible."

# Push schema
echo "Sincronizando schema..."
npx prisma db push --accept-data-loss

# Seed admin user
echo "Verificando usuario admin..."
node server/seed-admin.js

echo "=== Iniciando servidor en puerto ${PORT:-3000} ==="
exec node server/index.js
