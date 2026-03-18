import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

dotenv.config();

import prisma from './lib/prisma.js';
import logger from './lib/logger.js';
import { globalApiLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Routers
import authRouter from './routes/auth.js';
import chatRouter from './routes/chat.js';
import patientsRouter from './routes/patients.js';
import sessionsRouter from './routes/sessions.js';
import goalsRouter from './routes/goals.js';
import expensesRouter from './routes/expenses.js';
import appointmentsRouter from './routes/appointments.js';
import calendarRouter from './routes/calendar.js';
import availabilityRouter from './routes/availability.js';
import { telmedRouter, virtualSessionsRouter } from './routes/telemedicine.js';
import { invoicesRouter, paymentsRouter } from './routes/invoices.js';
import { financeRouter, reportsRouter, auditRouter } from './routes/finance.js';
import workshopsRouter from './routes/workshops.js';
import packagesRouter from './routes/packages.js';
import patientPortalRouter from './routes/patient-portal.js';
import assessmentsRouter from './routes/assessments.js';
import { startReminderJob } from './jobs/reminders.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validar variables de entorno requeridas
const REQUIRED_ENV_VARS = ['JWT_SECRET', 'DATABASE_URL'];
const missingVars = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
if (missingVars.length > 0) {
    logger.error(`Variables de entorno faltantes: ${missingVars.join(', ')}`);
    logger.error('Revisa tu archivo .env. Referencia: .env.example');
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE GLOBAL
// ============================================
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging de requests
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
});

// Rate limiting global (100 req/min por IP)
app.use('/api', globalApiLimiter);

// ============================================
// RUTAS
// ============================================
app.use('/api/auth', authRouter);
app.use('/api/chat', chatRouter);
app.use('/api/patients', patientsRouter);
app.use('/api/patients', assessmentsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/availability', availabilityRouter);
app.use('/api/telmed', telmedRouter);
app.use('/api/virtual-sessions', virtualSessionsRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/finance', financeRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/workshops', workshopsRouter);
app.use('/api/packages', packagesRouter);
app.use('/api/audit', auditRouter);
app.use('/api/portal', patientPortalRouter);

// Error handlers (deben ir después de todas las rutas)
app.use(notFoundHandler);
app.use(errorHandler);

// ============================================
// STARTUP — Dev vs Producción
// ============================================
async function startServer() {
    const isProd = process.env.NODE_ENV === 'production';

    if (isProd) {
        const distPath = path.join(__dirname, '..', 'dist');
        app.use(express.static(distPath));
        app.get('*', (req, res) => {
            if (!req.path.startsWith('/api')) res.sendFile(path.join(distPath, 'index.html'));
        });
        logger.info(`Modo PRODUCCION — sirviendo desde ${distPath}`);
    } else {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'spa'
        });
        app.use(vite.middlewares);
        logger.info('Modo DESARROLLO — Vite dev server activo');
    }

    app.listen(PORT, () => {
        logger.info(`Servidor corriendo en http://localhost:${PORT}`);
        startReminderJob();
    });
}

startServer();

process.on('SIGINT', async () => {
    logger.info('Cerrando servidor...');
    await prisma.$disconnect();
    process.exit(0);
});
