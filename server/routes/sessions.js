import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../lib/logger.js';
import { logAction } from '../middleware/audit.js';

const router = Router();

// GET /api/sessions (protegido)
router.get('/', authenticateToken, async (req, res, next) => {
    try {
        const { patientId, facturada } = req.query;
        const where = {};

        if (patientId) where.patientId = parseInt(patientId);
        if (facturada !== undefined) where.facturada = (facturada === 'true');

        const sessions = await prisma.session.findMany({
            where,
            orderBy: { fecha: 'desc' }
        });
        res.json(sessions);
    } catch (err) {
        logger.error('GET /api/sessions', err);
        next(err);
    }
});

// POST /api/sessions (protegido)
router.post('/', authenticateToken, async (req, res, next) => {
    try {
        const {
            patientId, patientName, fecha, pago, estadoPago, tipo,
            notaSubjetiva, notaObjetiva, notaAnalisis, notaPlan, resumen
        } = req.body;

        if (!patientId || !fecha || pago === undefined) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        const newSession = await prisma.session.create({
            data: {
                patientId: parseInt(patientId),
                patientName: patientName || '',
                fecha: new Date(fecha),
                pago: parseFloat(pago),
                estadoPago: estadoPago || 'Pendiente',
                tipo: tipo || 'Terapia',
                notaSubjetiva: notaSubjetiva || '',
                notaObjetiva: notaObjetiva || '',
                notaAnalisis: notaAnalisis || '',
                notaPlan: notaPlan || '',
                resumen: resumen || ''
            }
        });

        logAction(req, 'CREATE_SESSION', 'Session', newSession.id, `Paciente: ${newSession.patientName}`);
        res.status(201).json(newSession);
    } catch (err) {
        logger.error('POST /api/sessions', err);
        next(err);
    }
});

// GET /api/sessions/:id — SECURITY FIX: era público, ahora requiere autenticación
router.get('/:id', authenticateToken, async (req, res, next) => {
    try {
        const session = await prisma.session.findUnique({
            where: { id: parseInt(req.params.id) },
            include: { patient: true }
        });

        if (!session) {
            return res.status(404).json({ error: 'Sesión no encontrada' });
        }

        res.json(session);
    } catch (err) {
        logger.error('GET /api/sessions/:id', err);
        next(err);
    }
});

// PUT /api/sessions/:id (protegido)
router.put('/:id', authenticateToken, async (req, res, next) => {
    try {
        const updateData = req.body;

        if (updateData.fecha) updateData.fecha = new Date(updateData.fecha);
        if (updateData.pago) updateData.pago = parseFloat(updateData.pago);

        const updatedSession = await prisma.session.update({
            where: { id: parseInt(req.params.id) },
            data: updateData
        });

        res.json(updatedSession);
    } catch (err) {
        logger.error('PUT /api/sessions/:id', err);
        next(err);
    }
});

// DELETE /api/sessions/:id (protegido)
router.delete('/:id', authenticateToken, async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        await prisma.session.delete({ where: { id } });
        logAction(req, 'DELETE_SESSION', 'Session', id);
        res.json({ success: true, message: 'Sesión eliminada' });
    } catch (err) {
        logger.error('DELETE /api/sessions/:id', err);
        next(err);
    }
});

export default router;
