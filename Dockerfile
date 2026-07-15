# ── Stage 1: Build frontend ───────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
# Reintenta npm ci ante fallos transitorios (p. ej. la descarga de los engine
# binaries de Prisma desde binaries.prisma.sh, que a veces da ECONNRESET).
RUN i=0; until NODE_ENV=development npm ci; do \
      i=$((i+1)); \
      if [ "$i" -ge 3 ]; then echo "npm ci falló tras $i intentos"; exit 1; fi; \
      echo "Reintentando npm ci (intento $i)..."; sleep 10; \
    done

COPY . .

# Install openssl for Prisma
RUN apk add --no-cache openssl

# Build Vite frontend (outputs to /app/dist)
RUN NODE_OPTIONS="--max-old-space-size=1024" npm run build

# Generate Prisma client for production target
RUN npx prisma generate

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Install only production deps.
# --ignore-scripts evita el postinstall de Prisma (que re-descarga los engine
# binaries): no hace falta porque el cliente generado y los engines se copian
# del builder más abajo. Quita un punto de fallo de red en el build.
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Copy Prisma schema + generated client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma

# Copy server source
COPY server ./server

# Copy entrypoint script
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

# Install netcat for DB health check and openssl for Prisma
RUN apk add --no-cache netcat-openbsd openssl

# Usuario no-root por seguridad.
# NO hacemos `chown -R /app`: recorrería y DUPLICARÍA todo node_modules en una
# capa enorme (llena el disco del droplet de 1GB y es lentísimo — rompía el
# build en este paso). Los archivos quedan de root pero legibles/ejecutables
# por todos (perms por defecto de npm/prisma). Solo damos escritura a
# server/knowledge, único lugar donde el servidor escribe en runtime (el caché
# del índice RAG; además tolera fallos de escritura).
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /app/server/knowledge
USER appuser

EXPOSE 3000

ENV NODE_ENV=production

# Detecta proceso colgado (no solo caído): si /api/health no responde,
# Docker marca el contenedor unhealthy y Coolify puede auto-reiniciarlo.
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
    CMD wget -qO- http://localhost:${PORT:-3000}/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
