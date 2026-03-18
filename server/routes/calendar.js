import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../lib/logger.js';

const router = Router();

// GET /api/calendar/events
router.get('/events', authenticateToken, async (req, res, next) => {
    try {
        const { start, end } = req.query;

        if (!start || !end) {
            return res.status(400).json({ error: 'start y end son requeridos' });
        }

        const startDate = new Date(start);
        const endDate = new Date(end);

        const appointments = await prisma.appointment.findMany({
            where: {
                fechaHora: { gte: startDate, lte: endDate },
                estado: { not: 'Cancelada' }
            },
            orderBy: { fechaHora: 'asc' }
        });

        const sessions = await prisma.session.findMany({
            where: { fecha: { gte: startDate, lte: endDate } },
            include: {
                patient: { select: { id: true, nombre: true, telefono: true } }
            },
            orderBy: { fecha: 'asc' }
        });

        const events = [
            ...appointments.map(apt => {
                const s = new Date(apt.fechaHora);
                const e = new Date(s.getTime() + 60 * 60 * 1000);
                return {
                    id: `apt-${apt.id}`,
                    title: `Cita - ${apt.nombrePaciente}`,
                    start: s.toISOString(),
                    end: e.toISOString(),
                    type: 'appointment',
                    status: apt.estado,
                    resourceId: apt.id,
                    data: { nombrePaciente: apt.nombrePaciente, telefono: apt.telefono }
                };
            }),
            ...sessions.map(ses => {
                const s = new Date(ses.fecha);
                const e = new Date(s.getTime() + 60 * 60 * 1000);
                return {
                    id: `ses-${ses.id}`,
                    title: `Sesión - ${ses.patient.nombre}`,
                    start: s.toISOString(),
                    end: e.toISOString(),
                    type: 'session',
                    patientId: ses.patientId,
                    resourceId: ses.id,
                    data: { nombrePaciente: ses.patient.nombre, tipo: ses.tipo }
                };
            })
        ];

        events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
        res.json(events);
    } catch (err) {
        logger.error('GET /api/calendar/events', err);
        next(err);
    }
});

export default router;
