import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../lib/logger.js';

const router = Router();
router.use(authenticateToken);

// ── Interpretaciones por escala ──────────────────────────────────────────────

function interpretarPHQ9(puntaje) {
    if (puntaje <= 4)  return 'Mínimo';
    if (puntaje <= 9)  return 'Leve';
    if (puntaje <= 14) return 'Moderado';
    if (puntaje <= 19) return 'Moderado-Severo';
    return 'Severo';
}

function interpretarGAD7(puntaje) {
    if (puntaje <= 4)  return 'Mínimo';
    if (puntaje <= 9)  return 'Leve';
    if (puntaje <= 14) return 'Moderado';
    return 'Severo';
}

function interpretar(tipo, puntaje) {
    if (tipo === 'PHQ9') return interpretarPHQ9(puntaje);
    if (tipo === 'GAD7') return interpretarGAD7(puntaje);
    return '';
}

// GET /api/patients/:patientId/assessments
router.get('/:patientId/assessments', async (req, res, next) => {
    try {
        const patientId = parseInt(req.params.patientId);
        const { tipo } = req.query;

        const where = { patientId };
        if (tipo) where.tipo = tipo;

        const assessments = await prisma.assessment.findMany({
            where,
            orderBy: { fecha: 'desc' }
        });

        res.json(assessments.map(a => ({
            ...a,
            respuestas: JSON.parse(a.respuestas)
        })));
    } catch (err) {
        logger.error('GET /assessments', err);
        next(err);
    }
});

// POST /api/patients/:patientId/assessments
router.post('/:patientId/assessments', async (req, res, next) => {
    try {
        const patientId = parseInt(req.params.patientId);
        const { tipo, respuestas, sessionId, notas } = req.body;

        if (!tipo || !respuestas || !Array.isArray(respuestas)) {
            return res.status(400).json({ error: 'tipo y respuestas (array) son requeridos' });
        }

        if (!['PHQ9', 'GAD7'].includes(tipo)) {
            return res.status(400).json({ error: 'tipo debe ser PHQ9 o GAD7' });
        }

        const puntaje = respuestas.reduce((sum, r) => sum + (parseInt(r) || 0), 0);
        const interpretacion = interpretar(tipo, puntaje);

        const assessment = await prisma.assessment.create({
            data: {
                patientId,
                tipo,
                respuestas: JSON.stringify(respuestas),
                puntaje,
                interpretacion,
                sessionId: sessionId ? parseInt(sessionId) : null,
                notas: notas || ''
            }
        });

        res.status(201).json({
            ...assessment,
            respuestas: JSON.parse(assessment.respuestas)
        });
    } catch (err) {
        logger.error('POST /assessments', err);
        next(err);
    }
});

// DELETE /api/patients/:patientId/assessments/:id
router.delete('/:patientId/assessments/:id', async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const patientId = parseInt(req.params.patientId);

        const existing = await prisma.assessment.findFirst({ where: { id, patientId } });
        if (!existing) return res.status(404).json({ error: 'Evaluación no encontrada' });

        await prisma.assessment.delete({ where: { id } });
        res.json({ message: 'Evaluación eliminada' });
    } catch (err) {
        logger.error('DELETE /assessments/:id', err);
        next(err);
    }
});

export default router;
