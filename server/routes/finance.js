import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../lib/logger.js';

export const financeRouter = Router();
export const reportsRouter = Router();
export const auditRouter = Router();

// Todos los endpoints financieros requieren autenticación
financeRouter.use(authenticateToken);
reportsRouter.use(authenticateToken);

// GET /api/finance/kpis
financeRouter.get('/kpis', async (req, res, next) => {
    try {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const monthSessions = await prisma.session.findMany({
            where: { fecha: { gte: firstDayOfMonth, lte: now } }
        });
        const monthlyRevenue = monthSessions.reduce((sum, s) => sum + s.pago, 0);

        const pendingAppointments = await prisma.appointment.count({
            where: { estado: 'Pendiente', fechaHora: { gte: now, lte: next7Days } }
        });

        const activeSessions = await prisma.session.findMany({
            where: { fecha: { gte: thirtyDaysAgo } },
            select: { patientId: true }
        });
        const activePatients = new Set(activeSessions.map(s => s.patientId)).size;

        res.json({ monthlyRevenue, pendingAppointments, activePatients });
    } catch (err) {
        logger.error('GET /api/finance/kpis', err);
        next(err);
    }
});

// GET /api/finance/revenue-by-service
financeRouter.get('/revenue-by-service', async (req, res, next) => {
    try {
        const sessions = await prisma.session.findMany();

        const revenueByType = sessions.reduce((acc, session) => {
            const tipo = session.tipo || 'Terapia';
            acc[tipo] = (acc[tipo] || 0) + session.pago;
            return acc;
        }, {});

        const chartData = Object.entries(revenueByType).map(([name, value]) => ({
            name,
            value: parseFloat(value.toFixed(2))
        }));

        res.json(chartData);
    } catch (err) {
        logger.error('GET /api/finance/revenue-by-service', err);
        next(err);
    }
});

// GET /api/finance/new-patients-trend
financeRouter.get('/new-patients-trend', async (req, res, next) => {
    try {
        const patients = await prisma.patient.findMany({ orderBy: { createdAt: 'asc' } });

        const monthlyCount = {};
        patients.forEach(patient => {
            const date = new Date(patient.createdAt);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyCount[monthKey] = (monthlyCount[monthKey] || 0) + 1;
        });

        const chartData = Object.entries(monthlyCount).map(([month, count]) => ({ month, nuevos: count }));
        res.json(chartData);
    } catch (err) {
        logger.error('GET /api/finance/new-patients-trend', err);
        next(err);
    }
});

// GET /api/reports/accounts-receivable
reportsRouter.get('/accounts-receivable', async (req, res, next) => {
    try {
        const invoices = await prisma.invoice.findMany({
            where: { saldo: { gt: 0 }, estado: { not: 'Cancelada' } },
            include: { patient: { select: { id: true, nombre: true, telefono: true } } },
            orderBy: { fechaVencimiento: 'asc' }
        });

        const now = new Date();
        const total = invoices.reduce((sum, inv) => sum + inv.saldo, 0);
        const vencidas = invoices.filter(inv => new Date(inv.fechaVencimiento) < now);
        const totalVencidas = vencidas.reduce((sum, inv) => sum + inv.saldo, 0);
        const porVencer = invoices.filter(inv => new Date(inv.fechaVencimiento) >= now);
        const totalPorVencer = porVencer.reduce((sum, inv) => sum + inv.saldo, 0);

        res.json({
            total, totalVencidas, totalPorVencer,
            cantidadVencidas: vencidas.length,
            cantidadPorVencer: porVencer.length,
            invoices
        });
    } catch (err) {
        logger.error('GET /api/reports/accounts-receivable', err);
        next(err);
    }
});

// GET /api/finance/stats — ingresos y sesiones últimos 6 meses
financeRouter.get('/stats', async (req, res, next) => {
    try {
        const now = new Date();
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({
                year: d.getFullYear(),
                month: d.getMonth(),
                label: d.toLocaleDateString('es-NI', { month: 'short', year: '2-digit' }),
            });
        }

        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const sessions = await prisma.session.findMany({
            where: { fecha: { gte: sixMonthsAgo } },
            select: { fecha: true, pago: true, tipo: true },
        });

        const statsMap = {};
        months.forEach(m => { statsMap[`${m.year}-${m.month}`] = { label: m.label, ingresos: 0, sesiones: 0 }; });

        sessions.forEach(s => {
            const d = new Date(s.fecha);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            if (statsMap[key]) {
                statsMap[key].ingresos += s.pago;
                statsMap[key].sesiones += 1;
            }
        });

        res.json(Object.values(statsMap));
    } catch (err) {
        logger.error('GET /api/finance/stats', err);
        next(err);
    }
});

// GET /api/finance/monthly-report?month=YYYY-MM
financeRouter.get('/monthly-report', async (req, res, next) => {
    try {
        const monthParam = req.query.month || new Date().toISOString().slice(0, 7);
        const [year, month] = monthParam.split('-').map(Number);
        const from = new Date(year, month - 1, 1);
        const to = new Date(year, month, 1);

        const [sessions, expenses, patients] = await Promise.all([
            prisma.session.findMany({ where: { fecha: { gte: from, lt: to } }, select: { pago: true, tipo: true, patientId: true } }),
            prisma.expense.findMany({ where: { fecha: { gte: from, lt: to } }, select: { monto: true, categoria: true } }),
            prisma.patient.findMany({ where: { createdAt: { gte: from, lt: to } }, select: { id: true } }),
        ]);

        const totalIngresos = sessions.reduce((s, x) => s + x.pago, 0);
        const totalGastos = expenses.reduce((s, x) => s + x.monto, 0);
        const totalSesiones = sessions.length;
        const nuevoPacientes = patients.length;
        const uniquePatients = new Set(sessions.map(s => s.patientId)).size;

        const byType = sessions.reduce((acc, s) => {
            acc[s.tipo || 'General'] = (acc[s.tipo || 'General'] || 0) + 1;
            return acc;
        }, {});

        res.json({
            mes: monthParam,
            totalIngresos, totalGastos, balance: totalIngresos - totalGastos,
            totalSesiones, nuevoPacientes, pacientesAtendidos: uniquePatients,
            distribucionTipos: Object.entries(byType).map(([tipo, count]) => ({ tipo, count })),
        });
    } catch (err) {
        logger.error('GET /api/finance/monthly-report', err);
        next(err);
    }
});

// ============================================
// AUDIT LOG — /api/audit
// ============================================
auditRouter.use(authenticateToken);

// GET /api/audit — últimas 100 entradas
auditRouter.get('/', async (req, res, next) => {
    try {
        const logs = await prisma.auditLog.findMany({
            orderBy: { creadoEn: 'desc' },
            take: 100
        });
        res.json(logs);
    } catch (err) {
        logger.error('GET /api/audit', err);
        next(err);
    }
});
