# Guía de Despliegue — Coolify en DigitalOcean

## Arquitectura

```
DigitalOcean Droplet ($12/mes)
└── Coolify
    ├── App (Node.js + React) → puerto 3000 → HTTPS via Coolify
    └── PostgreSQL 16         → interno, no expuesto
```

---

## Paso 1 — Crear Droplet en DigitalOcean

1. Ir a [cloud.digitalocean.com](https://cloud.digitalocean.com)
2. **Create → Droplet**
   - Imagen: **Ubuntu 24.04 LTS**
   - Plan: **Basic — $12/mes** (2 GB RAM, 1 vCPU, 50 GB SSD)
   - Región: más cercana a Nicaragua → **New York** o **Toronto**
   - Autenticación: SSH key (recomendado) o password
3. Crear el Droplet y anotar la **IP pública**

---

## Paso 2 — Instalar Coolify en el Droplet

```bash
# Conectarse al Droplet
ssh root@TU_IP_PUBLICA

# Instalar Coolify (one-liner oficial)
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Esperar ~5 minutos. Al terminar, Coolify estará en:
```
http://TU_IP_PUBLICA:8000
```

Crear la cuenta de administrador en esa pantalla.

---

## Paso 3 — Apuntar tu dominio (opcional pero recomendado)

En tu registrador de dominio, crear un registro DNS:
```
Tipo: A
Nombre: @ (o subdominio como "app")
Valor: TU_IP_PUBLICA
TTL: 300
```

---

## Paso 4 — Crear base de datos PostgreSQL en Coolify

1. En Coolify → **Resources → New Resource → Database**
2. Seleccionar **PostgreSQL 16**
3. Configurar:
   - **Name**: `bienestar-db`
   - **Database name**: `bienestar`
   - **Username**: `bienestar`
   - **Password**: generar uno seguro (guardar este valor)
4. Hacer clic en **Deploy**
5. Copiar la **Internal Connection URL** que muestra Coolify (formato: `postgresql://bienestar:PASSWORD@hostname:5432/bienestar`)

---

## Paso 5 — Crear la aplicación en Coolify

1. En Coolify → **Resources → New Resource → Application**
2. Seleccionar **Docker Compose** o **Dockerfile**
3. Conectar tu repositorio GitHub:
   - Ir a **Settings → Source → GitHub** y conectar tu cuenta
   - Seleccionar el repo `bienestar-integral-platform2`
   - Branch: `main`
4. En **Build Settings**:
   - Build method: **Dockerfile**
   - Dockerfile path: `Dockerfile`
5. En **Network**:
   - Port: `3000`
   - Domain: `tudominio.com` (Coolify agrega SSL automáticamente)

---

## Paso 6 — Configurar variables de entorno

En Coolify → tu aplicación → **Environment Variables**, agregar:

| Variable | Valor |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `DATABASE_URL` | URL interna de PostgreSQL del paso 4 |
| `JWT_SECRET` | Generar con el comando de abajo |
| `ALLOWED_ORIGIN` | `https://tudominio.com` |
| `GEMINI_API_KEY` | Tu clave de Google AI Studio (opcional) |
| `SMTP_HOST` | `smtp.gmail.com` (opcional) |
| `SMTP_PORT` | `587` (opcional) |
| `SMTP_USER` | tu correo Gmail (opcional) |
| `SMTP_PASS` | contraseña de aplicación Gmail (opcional) |
| `SMTP_FROM` | `Bienestar Integral <correo@gmail.com>` (opcional) |

### Generar JWT_SECRET seguro:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Paso 7 — Deploy

1. En Coolify → tu aplicación → **Deploy**
2. Ver los logs en tiempo real
3. El entrypoint automáticamente:
   - Espera que PostgreSQL esté listo
   - Ejecuta `prisma db push` (crea las tablas)
   - Crea el usuario admin (`lic.esmirna` / `Bienestar2024!`)
   - Inicia el servidor

---

## Paso 8 — Verificar

```
https://tudominio.com          → Landing page
https://tudominio.com/#admin   → Login admin
```

Credenciales: `lic.esmirna` / `Bienestar2024!`

**Cambiar la contraseña inmediatamente después del primer login.**

---

## Prueba local con Docker (antes de subir)

```bash
# Copiar variables de entorno
cp .env.example .env
# Editar .env y agregar JWT_SECRET real

# Levantar todo (PostgreSQL + App)
docker compose up --build

# Abrir en navegador
http://localhost:3000
```

---

## Actualizaciones futuras

Con Coolify, cada `git push` a `main` puede disparar un redeploy automático:
- En Coolify → tu app → **Settings → Webhooks** → activar auto-deploy

Para cambios de schema de base de datos:
```bash
# Localmente, generar migración
npx prisma migrate dev --name nombre_del_cambio

# Hacer commit y push → Coolify redespliega automáticamente
# El entrypoint ejecuta prisma db push al reiniciar
```

---

## Costos estimados

| Recurso | Costo/mes |
|---------|-----------|
| Droplet 2GB (Coolify + App + DB) | $12 |
| Backups automáticos DO (opcional) | +$2.40 |
| Dominio .com | ~$12/año |
| **Total** | **~$14-15/mes** |

---

## Backups de la base de datos

Desde Coolify o manualmente:
```bash
# Backup
docker exec <postgres-container> pg_dump -U bienestar bienestar > backup-$(date +%Y%m%d).sql

# Restore
docker exec -i <postgres-container> psql -U bienestar bienestar < backup-20260318.sql
```
