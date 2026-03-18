import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../lib/logger.js';

const router = Router();
router.use(authenticateToken);

// GET /api/goals?patientId=
router.get('/', async (req, res, next) => {
    try {
        const { patientId } = req.query;
        if (!patientId) return res.status(400).json({ error: 'patientId requerido' });
        const goals = await prisma.therapeuticGoal.findMany({
            where: { patientId: parseInt(patientId) },
            orderBy: { creadoEn: 'desc' },
        });
        res.json(goals);
    } catch (err) {
        logger.error('GET /api/goals', err);
        next(err);
    }
});

// POST /api/goals
router.post('/', async (req, res, next) => {
    try {
        const { patientId, descripcion, fechaLimite, notas } = req.body;
        if (!patientId || !descripcion) return res.status(400).json({ error: 'patientId y descripcion requeridos' });
        const goal = await prisma.therapeuticGoal.create({
            data: {
                patientId: parseInt(patientId),
                descripcion,
                fechaLimite: fechaLimite ? new Date(fechaLimite) : null,
                notas: notas || '',
                estado: 'Pendiente',
                progreso: 0,
            },
        });
        res.status(201).json(goal);
    } catch (err) {
        logger.error('POST /api/goals', err);
        next(err);
    }
});

// PUT /api/goals/:id
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        if (updateData.estado === 'Logrado' && !updateData.fechaLogro) {
            updateData.fechaLogro = new Date();
            updateData.progreso = 100;
        }
        if (updateData.fechaLimite) updateData.fechaLimite = new Date(updateData.fechaLimite);
        if (updateData.progreso !== undefined) updateData.progreso = parseInt(updateData.progreso);

        const updatedGoal = await prisma.therapeuticGoal.update({
            where: { id: parseInt(id) },
            data: updateData,
        });

        res.json(updatedGoal);
    } catch (err) {
        logger.error('PUT /api/goals/:id', err);
        next(err);
    }
});

// DELETE /api/goals/:id
router.delete('/:id', async (req, res, next) => {
    try {
        await prisma.therapeuticGoal.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ success: true });
    } catch (err) {
        logger.error('DELETE /api/goals/:id', err);
        next(err);
    }
});

export default router;
