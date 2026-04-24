# ── Stage 1: Build frontend ───────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN NODE_ENV=development npm ci

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

# Install only production deps
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

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

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000

ENV NODE_ENV=production

ENTRYPOINT ["./docker-entrypoint.sh"]
