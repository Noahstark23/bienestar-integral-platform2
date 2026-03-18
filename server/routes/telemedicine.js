import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../lib/logger.js';

export const telmedRouter = Router();
export const virtualSessionsRouter = Router();

// ============================================
// TELEMEDICINE AVAILABILITY — /api/telmed
// ============================================

// GET /api/telmed/availability (PÚBLICO)
telmedRouter.get('/availability', async (req, res, next) => {
    try {
        const slots = await prisma.telmedAvailability.findMany({
            where: { isActive: true },
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
        });
        res.json(slots);
    } catch (err) {
        logger.error('GET /api/telmed/availability', err);
        next(err);
    }
});

// POST /api/telmed/availability (protegido)
telmedRouter.post('/availability', authenticateToken, async (req, res, next) => {
    try {
        const { dayOfWeek, startTime, endTime } = req.body;

        if (dayOfWeek === undefined || !startTime || !endTime) {
            return res.status(400).json({ error: 'dayOfWeek, startTime y endTime son requeridos' });
        }

        const slot = await prisma.telmedAvailability.create({
            data: { dayOfWeek: parseInt(dayOfWeek), startTime, endTime }
        });
        res.status(201).json(slot);
    } catch (err) {
        logger.error('POST /api/telmed/availability', err);
        next(err);
    }
});

// DELETE /api/telmed/availability/:id (protegido)
telmedRouter.delete('/availability/:id', authenticateToken, async (req, res, next) => {
    try {
        await prisma.telmedAvailability.delete({
            where: { id: parseInt(req.params.id) }
        });
        res.json({ message: 'Horario eliminado' });
    } catch (err) {
        logger.error('DELETE /api/telmed/availability/:id', err);
        next(err);
    }
});

// ============================================
// VIRTUAL SESSIONS — /api/virtual-sessions
// ============================================

// GET /api/virtual-sessions (protegido)
virtualSessionsRouter.get('/', authenticateToken, async (req, res, next) => {
    try {
        const { estado } = req.query;
        const where = {};
        if (estado) where.estado = estado;

        const sessions = await prisma.virtualSession.findMany({
            where,
            include: {
                patient: { select: { id: true, nombre: true, telefono: true } }
            },
            orderBy: { fechaHora: 'desc' }
        });
        res.json(sessions);
    } catch (err) {
        logger.error('GET /api/virtual-sessions', err);
        next(err);
    }
});

// POST /api/virtual-sessions (PÚBLICO — solicitud del paciente)
virtualSessionsRouter.post('/', async (req, res, next) => {
    try {
        const { nombrePaciente, telefono = '', fechaHora, patientId, duracion = 60, isAdmin = false } = req.body;

        if (!nombrePaciente || !fechaHora) {
            return res.status(400).json({ error: 'Nombre y fecha/hora son requeridos' });
        }

        const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const codigo = `VS-${randomCode}`;
        const roomName = `bienestar-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

        const session = await prisma.virtualSession.create({
            data: {
                codigo,
                roomName,
                nombrePaciente,
                telefono,
                fechaHora: new Date(fechaHora),
                duracion,
                patientId: patientId ? parseInt(patientId) : null,
                estado: isAdmin ? 'Aprobada' : 'Solicitada'
            }
        });

        res.status(201).json(session);
    } catch (err) {
        logger.error('POST /api/virtual-sessions', err);
        next(err);
    }
});

// POST /api/virtual-sessions/join (PÚBLICO — paciente entra con código)
virtualSessionsRouter.post('/join', async (req, res, next) => {
    try {
        const { codigo } = req.body;

        if (!codigo) {
            return res.status(400).json({ error: 'El código de sesión es requerido' });
        }

        const session = await prisma.virtualSession.findUnique({
            where: { codigo: codigo.toUpperCase().trim() }
        });

        if (!session) {
            return res.status(404).json({ error: 'Código de sesión no encontrado. Verifica el código e intenta de nuevo.' });
        }

        if (session.estado === 'Completada') {
            return res.status(400).json({ error: 'Esta sesión ya fue completada.' });
        }
        if (session.estado === 'Cancelada') {
            return res.status(400).json({ error: 'Esta sesión fue cancelada.' });
        }
        if (session.estado === 'Solicitada') {
            return res.status(400).json({ error: 'Tu sesión aún no ha sido aprobada. La doctora te confirmará pronto.' });
        }

        const now = new Date();
        const sessionTime = new Date(session.fechaHora);
        const diffMinutes = (now - sessionTime) / (1000 * 60);

        if (diffMinutes < -30) {
            const horaFormateada = sessionTime.toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' });
            return res.status(400).json({
                error: `Tu sesión está programada para las ${horaFormateada}. Podrás conectarte 30 minutos antes.`
            });
        }

        if (diffMinutes > session.duracion + 30) {
            return res.status(400).json({ error: 'Esta sesión ya expiró. Contacta al consultorio para reprogramar.' });
        }

        if (session.estado === 'Aprobada') {
            await prisma.virtualSession.update({
                where: { id: session.id },
                data: { estado: 'EnCurso' }
            });
        }

        res.json({
            roomName: session.roomName,
            nombrePaciente: session.nombrePaciente,
            duracion: session.duracion
        });
    } catch (err) {
        logger.error('POST /api/virtual-sessions/join', err);
        next(err);
    }
});

// PUT /api/virtual-sessions/:id (protegido)
virtualSessionsRouter.put('/:id', authenticateToken, async (req, res, next) => {
    try {
        const { estado, notas } = req.body;
        const updateData = {};
        if (estado) updateData.estado = estado;
        if (notas !== undefined) updateData.notas = notas;

        const session = await prisma.virtualSession.update({
            where: { id: parseInt(req.params.id) },
            data: updateData,
            include: {
                patient: { select: { id: true, nombre: true, telefono: true } }
            }
        });
        res.json(session);
    } catch (err) {
        logger.error('PUT /api/virtual-sessions/:id', err);
        next(err);
    }
});

// DELETE /api/virtual-sessions/:id (protegido)
virtualSessionsRouter.delete('/:id', authenticateToken, async (req, res, next) => {
    try {
        await prisma.virtualSession.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ message: 'Sesión eliminada' });
    } catch (err) {
        logger.error('DELETE /api/virtual-sessions/:id', err);
        next(err);
    }
});
