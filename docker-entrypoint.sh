#!/bin/sh
set -e

echo "=== Bienestar Integral — Iniciando ==="

# Wait for PostgreSQL to be ready (max 30s)
echo "Esperando base de datos..."
MAX_TRIES=15
COUNT=0
until node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.\$connect().then(() => { p.\$disconnect(); process.exit(0); }).catch(() => process.exit(1));
" 2>/dev/null; do
  COUNT=$((COUNT+1))
  if [ "$COUNT" -ge "$MAX_TRIES" ]; then
    echo "ERROR: No se pudo conectar a la base de datos después de ${MAX_TRIES} intentos."
    exit 1
  fi
  echo "  Intento $COUNT/$MAX_TRIES — reintentando en 2s..."
  sleep 2
done
echo "Base de datos disponible."

# Push schema (creates/updates tables without migration history)
# Use this for initial deploy. For subsequent deploys with schema changes,
# generate migrations locally and use: npx prisma migrate deploy
echo "Sincronizando schema..."
npx prisma db push --accept-data-loss

# Seed admin user (idempotent — safe to run every start)
echo "Verificando usuario admin..."
node server/seed-admin.js

echo "=== Iniciando servidor en puerto ${PORT:-3000} ==="
exec node server/index.js
