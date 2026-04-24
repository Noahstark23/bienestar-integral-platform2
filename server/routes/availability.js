import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../lib/logger.js';

const router = Router();

// GET /api/availability (protegido)
router.get('/', authenticateToken, async (req, res, next) => {
    try {
        const slots = await prisma.availabilitySlot.findMany({
            where: { isActive: true },
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
        });
        res.json(slots);
    } catch (err) {
        logger.error('GET /api/availability', err);
        next(err);
    }
});

// POST /api/availability (protegido)
router.post('/', authenticateToken, async (req, res, next) => {
    try {
        const { dayOfWeek, startTime, endTime } = req.body;

        if (dayOfWeek === undefined || !startTime || !endTime) {
            return res.status(400).json({ error: 'dayOfWeek, startTime y endTime son requeridos' });
        }

        const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
            return res.status(400).json({ error: 'Formato de tiempo inválido. Usar HH:mm' });
        }

        const newSlot = await prisma.availabilitySlot.create({
            data: { dayOfWeek: parseInt(dayOfWeek), startTime, endTime }
        });
        res.status(201).json(newSlot);
    } catch (err) {
        logger.error('POST /api/availability', err);
        next(err);
    }
});

// PUT /api/availability/:id (protegido)
router.put('/:id', authenticateToken, async (req, res, next) => {
    try {
        const updated = await prisma.availabilitySlot.update({
            where: { id: parseInt(req.params.id) },
            data: req.body
        });
        res.json(updated);
    } catch (err) {
        logger.error('PUT /api/availability/:id', err);
        next(err);
    }
});

// DELETE /api/availability/:id (protegido)
router.delete('/:id', authenticateToken, async (req, res, next) => {
    try {
        await prisma.availabilitySlot.delete({
            where: { id: parseInt(req.params.id) }
        });
        res.json({ success: true, message: 'Slot eliminado' });
    } catch (err) {
        logger.error('DELETE /api/availability/:id', err);
        next(err);
    }
});

// GET /api/availability/public (PÚBLICO — días y horarios disponibles para el formulario de citas)
router.get('/public', async (req, res, next) => {
    try {
        const slots = await prisma.availabilitySlot.findMany({
            where: { isActive: true },
            select: { dayOfWeek: true, startTime: true, endTime: true },
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
        });
        res.json(slots);
    } catch (err) {
        logger.error('GET /api/availability/public', err);
        next(err);
    }
});

// POST /api/availability/check (PÚBLICO — usado desde landing page)
router.post('/check', async (req, res, next) => {
    try {
        const { fechaHora } = req.body;

        if (!fechaHora) {
            return res.status(400).json({ error: 'fechaHora es requerido' });
        }

        const requestedDate = new Date(fechaHora);
        const dayOfWeek = requestedDate.getDay();
        const timeStr = requestedDate.toTimeString().slice(0, 5); // "HH:mm"

        const daySlots = await prisma.availabilitySlot.findMany({
            where: { dayOfWeek, isActive: true }
        });

        if (daySlots.length === 0) {
            return res.json({ available: false, reason: 'No hay horario de atención ese día' });
        }

        const isWithinSlot = daySlots.some(slot => timeStr >= slot.startTime && timeStr < slot.endTime);
        if (!isWithinSlot) {
            return res.json({ available: false, reason: 'Fuera del horario de atención' });
        }

        const existingAppointment = await prisma.appointment.findFirst({
            where: { fechaHora: requestedDate, estado: { not: 'Cancelada' } }
        });

        if (existingAppointment) {
            return res.json({ available: false, reason: 'Horario ya reservado' });
        }

        res.json({ available: true, reason: null });
    } catch (err) {
        logger.error('POST /api/availability/check', err);
        next(err);
    }
});

export default router;
