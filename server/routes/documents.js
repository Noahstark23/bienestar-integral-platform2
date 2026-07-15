import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../lib/logger.js';
import { logAction } from '../middleware/audit.js';
import { generateDocument, DOCUMENT_TYPES } from '../lib/documents.js';

const router = Router();
router.use(authenticateToken);

// GET /api/documents/types — tipos de documento disponibles
router.get('/types', (req, res) => {
    res.json(DOCUMENT_TYPES);
});

// GET /api/documents/patient/:id/:tipo — genera un documento para el paciente
router.get('/patient/:id/:tipo', async (req, res, next) => {
    try {
        const patientId = parseInt(req.params.id);
        const { tipo } = req.params;

        const patient = await prisma.patient.findUnique({
            where: { id: patientId },
            include: {
                clinicalRecord: true,
                therapeuticGoals: { orderBy: { fechaInicio: 'asc' } },
                sessions: { orderBy: { fecha: 'asc' } },
                assessments: { orderBy: { fecha: 'asc' } },
            },
        });
        if (!patient) return res.status(404).json({ error: 'Paciente no encontrado' });

        const doc = generateDocument(tipo, patient);
        logAction(req, 'GENERATE_DOCUMENT', 'Patient', patientId, `Documento: ${tipo}`);
        res.json(doc);
    } catch (err) {
        if (err.statusCode === 400) return res.status(400).json({ error: err.message });
        logger.error('GET /api/documents/patient/:id/:tipo', err);
        next(err);
    }
});

export default router;
