import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../lib/logger.js';
import { logAction } from '../middleware/audit.js';

const router = Router();
router.use(authenticateToken);

// GET /api/patients — soporta ?estado=Activo|Alta|En Pausa|Todos y ?page=&limit=
router.get('/', async (req, res, next) => {
    try {
        const { estado, page = 1, limit = 20 } = req.query;

        const where = {};
        if (estado && estado !== 'Todos') where.estado = estado;

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        const [patients, total] = await Promise.all([
            prisma.patient.findMany({
                where,
                include: { sessions: true },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limitNum
            }),
            prisma.patient.count({ where })
        ]);

        res.json({
            data: patients,
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum)
        });
    } catch (err) {
        logger.error('GET /api/patients', err);
        next(err);
    }
});

// GET /api/patients/:id
router.get('/:id', async (req, res, next) => {
    try {
        const patient = await prisma.patient.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                clinicalRecord: true,
                sessions: { orderBy: { fecha: 'desc' } },
                therapeuticGoals: { orderBy: { fechaInicio: 'desc' } }
            }
        });

        if (!patient) return res.status(404).json({ error: 'Paciente no encontrado' });
        res.json(patient);
    } catch (err) {
        logger.error('GET /api/patients/:id', err);
        next(err);
    }
});

// POST /api/patients
router.post('/', async (req, res, next) => {
    try {
        const {
            nombre, edad, telefono, motivo,
            fechaNacimiento, ocupacion, escolaridad, estadoCivil,
            tutorNombre, tutorRelacion
        } = req.body;

        if (!nombre || !edad || !telefono || !motivo) {
            return res.status(400).json({ error: 'Faltan campos requeridos: nombre, edad, telefono, motivo' });
        }

        const newPatient = await prisma.patient.create({
            data: {
                nombre,
                edad: parseInt(edad),
                telefono,
                motivo,
                fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
                ocupacion: ocupacion || '',
                escolaridad: escolaridad || '',
                estadoCivil: estadoCivil || '',
                tutorNombre: tutorNombre || null,
                tutorRelacion: tutorRelacion || null
            }
        });

        logAction(req, 'CREATE_PATIENT', 'Patient', newPatient.id, newPatient.nombre);
        res.status(201).json(newPatient);
    } catch (err) {
        logger.error('POST /api/patients', err);
        next(err);
    }
});

// PUT /api/patients/:id
router.put('/:id', async (req, res, next) => {
    try {
        const updateData = req.body;

        if (updateData.fechaNacimiento) updateData.fechaNacimiento = new Date(updateData.fechaNacimiento);
        if (updateData.fechaAlta) updateData.fechaAlta = new Date(updateData.fechaAlta);
        if (updateData.edad) updateData.edad = parseInt(updateData.edad);

        const updatedPatient = await prisma.patient.update({
            where: { id: parseInt(req.params.id) },
            data: updateData
        });

        logAction(req, 'UPDATE_PATIENT', 'Patient', updatedPatient.id, updatedPatient.nombre);
        res.json(updatedPatient);
    } catch (err) {
        logger.error('PUT /api/patients/:id', err);
        next(err);
    }
});

// POST /api/patients/:id/discharge
router.post('/:id/discharge', async (req, res, next) => {
    try {
        const { motivoAlta } = req.body;

        const discharged = await prisma.patient.update({
            where: { id: parseInt(req.params.id) },
            data: { estado: 'Alta', fechaAlta: new Date(), motivoAlta: motivoAlta || 'Alta médica' }
        });

        res.json(discharged);
    } catch (err) {
        logger.error('POST /api/patients/:id/discharge', err);
        next(err);
    }
});

// POST /api/patients/:id/clinical-record
router.post('/:id/clinical-record', async (req, res, next) => {
    try {
        const { antecedentesMedicos, antecedentesFamiliares, historiaDesarrollo, diagnostico } = req.body;

        const clinicalRecord = await prisma.clinicalRecord.create({
            data: {
                patientId: parseInt(req.params.id),
                antecedentesMedicos: antecedentesMedicos || '',
                antecedentesFamiliares: antecedentesFamiliares || '',
                historiaDesarrollo: historiaDesarrollo || '',
                diagnostico: diagnostico || ''
            }
        });

        res.status(201).json(clinicalRecord);
    } catch (err) {
        logger.error('POST /api/patients/:id/clinical-record', err);
        next(err);
    }
});

// PUT /api/patients/:id/clinical-record
router.put('/:id/clinical-record', async (req, res, next) => {
    try {
        const { antecedentesMedicos, antecedentesFamiliares, historiaDesarrollo, diagnostico } = req.body;
        const patientId = parseInt(req.params.id);

        const existing = await prisma.clinicalRecord.findUnique({ where: { patientId } });
        if (!existing) return res.status(404).json({ error: 'Expediente clínico no encontrado' });

        const updated = await prisma.clinicalRecord.update({
            where: { patientId },
            data: {
                antecedentesMedicos: antecedentesMedicos || existing.antecedentesMedicos,
                antecedentesFamiliares: antecedentesFamiliares || existing.antecedentesFamiliares,
                historiaDesarrollo: historiaDesarrollo || existing.historiaDesarrollo,
                diagnostico: diagnostico || existing.diagnostico
            }
        });

        res.json(updated);
    } catch (err) {
        logger.error('PUT /api/patients/:id/clinical-record', err);
        next(err);
    }
});

// POST /api/patients/:id/goals
router.post('/:id/goals', async (req, res, next) => {
    try {
        const { titulo, descripcion, fechaLimite } = req.body;

        if (!titulo) return res.status(400).json({ error: 'El título es requerido' });

        const newGoal = await prisma.therapeuticGoal.create({
            data: {
                patientId: parseInt(req.params.id),
                titulo,
                descripcion: descripcion || '',
                fechaLimite: fechaLimite ? new Date(fechaLimite) : null
            }
        });

        res.status(201).json(newGoal);
    } catch (err) {
        logger.error('POST /api/patients/:id/goals', err);
        next(err);
    }
});

// GET /api/patients/:id/goals
router.get('/:id/goals', async (req, res, next) => {
    try {
        const goals = await prisma.therapeuticGoal.findMany({
            where: { patientId: parseInt(req.params.id) },
            orderBy: { fechaInicio: 'desc' }
        });
        res.json(goals);
    } catch (err) {
        logger.error('GET /api/patients/:id/goals', err);
        next(err);
    }
});

// GET /api/patients/:id/payment-history
router.get('/:id/payment-history', async (req, res, next) => {
    try {
        const invoices = await prisma.invoice.findMany({
            where: { patientId: parseInt(req.params.id) },
            include: {
                payments: { orderBy: { fechaPago: 'desc' } },
                sessions: { include: { session: true } }
            },
            orderBy: { fechaEmision: 'desc' }
        });
        res.json(invoices);
    } catch (err) {
        logger.error('GET /api/patients/:id/payment-history', err);
        next(err);
    }
});

// GET /api/patients/:id/unbilled-enrollments
router.get('/:id/unbilled-enrollments', async (req, res, next) => {
    try {
        const enrollments = await prisma.workshopEnrollment.findMany({
            where: { patientId: parseInt(req.params.id), invoices: { none: {} } },
            include: { workshop: true }
        });
        res.json(enrollments);
    } catch (err) {
        logger.error('GET /api/patients/:id/unbilled-enrollments', err);
        next(err);
    }
});

export default router;
