import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../lib/logger.js';
import { logAction } from '../middleware/audit.js';
import { indexPatient, indexClinicalRecord, indexGoal } from '../lib/clinicalSearch.js';

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

// Campos de texto ampliados del expediente (auto-relleno de documentos)
const CAMPOS_AMPLIADOS = [
    'email', 'sexo', 'direccion', 'barrio', 'lugarNacimiento', 'remision',
    'situacionLaboral', 'numHijos', 'apodo', 'nombreMadre', 'telefonoMadre',
    'nombrePadre', 'telefonoPadre', 'tutorIdentificacion'
];

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

        const ampliados = {};
        for (const c of CAMPOS_AMPLIADOS) {
            if (typeof req.body[c] === 'string') ampliados[c] = req.body[c];
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
                tutorRelacion: tutorRelacion || null,
                ...ampliados
            }
        });

        logAction(req, 'CREATE_PATIENT', 'Patient', newPatient.id, newPatient.nombre);
        indexPatient(newPatient).catch(() => {}); // Búsqueda semántica: indexar motivo
        res.status(201).json(newPatient);
    } catch (err) {
        logger.error('POST /api/patients', err);
        next(err);
    }
});

// PUT /api/patients/:id
router.put('/:id', async (req, res, next) => {
    try {
        // Lista blanca contra mass-assignment: solo columnas editables del paciente
        const EDITABLES = [
            'nombre', 'edad', 'telefono', 'motivo', 'fechaNacimiento',
            'ocupacion', 'escolaridad', 'estadoCivil', 'tutorNombre', 'tutorRelacion',
            'estado', 'fechaAlta', 'motivoAlta', 'faseProceso',
            ...CAMPOS_AMPLIADOS
        ];
        const updateData = {};
        for (const c of EDITABLES) {
            if (req.body[c] !== undefined) updateData[c] = req.body[c];
        }

        if (updateData.fechaNacimiento) updateData.fechaNacimiento = new Date(updateData.fechaNacimiento);
        if (updateData.fechaAlta) updateData.fechaAlta = new Date(updateData.fechaAlta);
        if (updateData.edad) updateData.edad = parseInt(updateData.edad);

        const updatedPatient = await prisma.patient.update({
            where: { id: parseInt(req.params.id) },
            data: updateData
        });

        logAction(req, 'UPDATE_PATIENT', 'Patient', updatedPatient.id, updatedPatient.nombre);
        indexPatient(updatedPatient).catch(() => {}); // Búsqueda semántica: re-indexar
        res.json(updatedPatient);
    } catch (err) {
        logger.error('PUT /api/patients/:id', err);
        next(err);
    }
});

// ============================================
// ADJUNTOS DEL EXPEDIENTE (PatientFile)
// Contrato firmado escaneado, plan de intervención externo, informes, etc.
// ============================================
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB

// GET /api/patients/:id/files — lista (sin el contenido binario)
router.get('/:id/files', async (req, res, next) => {
    try {
        const files = await prisma.patientFile.findMany({
            where: { patientId: parseInt(req.params.id) },
            select: { id: true, categoria: true, nombre: true, mimeType: true, size: true, creadoEn: true },
            orderBy: { creadoEn: 'desc' }
        });
        res.json(files);
    } catch (err) {
        logger.error('GET /api/patients/:id/files', err);
        next(err);
    }
});

// POST /api/patients/:id/files — subir archivo { nombre, categoria, mimeType, dataBase64 }
router.post('/:id/files', async (req, res, next) => {
    try {
        const patientId = parseInt(req.params.id);
        const { nombre, categoria, mimeType, dataBase64 } = req.body;

        if (!nombre || !dataBase64) {
            return res.status(400).json({ error: 'nombre y dataBase64 son requeridos' });
        }
        const buffer = Buffer.from(dataBase64, 'base64');
        if (buffer.length === 0) return res.status(400).json({ error: 'Archivo vacío o base64 inválido' });
        if (buffer.length > MAX_FILE_BYTES) {
            return res.status(413).json({ error: 'El archivo supera el límite de 8 MB' });
        }

        const file = await prisma.patientFile.create({
            data: {
                patientId,
                nombre: String(nombre).slice(0, 200),
                categoria: categoria || 'General',
                mimeType: mimeType || 'application/octet-stream',
                size: buffer.length,
                data: buffer
            },
            select: { id: true, categoria: true, nombre: true, mimeType: true, size: true, creadoEn: true }
        });

        logAction(req, 'UPLOAD_PATIENT_FILE', 'Patient', patientId, `Archivo: ${file.nombre} (${file.categoria})`);
        res.status(201).json(file);
    } catch (err) {
        logger.error('POST /api/patients/:id/files', err);
        next(err);
    }
});

// GET /api/patients/:id/files/:fileId/download — descarga el binario
router.get('/:id/files/:fileId/download', async (req, res, next) => {
    try {
        const file = await prisma.patientFile.findFirst({
            where: { id: parseInt(req.params.fileId), patientId: parseInt(req.params.id) }
        });
        if (!file) return res.status(404).json({ error: 'Archivo no encontrado' });

        res.setHeader('Content-Type', file.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.nombre)}"`);
        res.send(Buffer.from(file.data));
    } catch (err) {
        logger.error('GET /api/patients/:id/files/:fileId/download', err);
        next(err);
    }
});

// DELETE /api/patients/:id/files/:fileId
router.delete('/:id/files/:fileId', async (req, res, next) => {
    try {
        const fileId = parseInt(req.params.fileId);
        await prisma.patientFile.deleteMany({
            where: { id: fileId, patientId: parseInt(req.params.id) }
        });
        logAction(req, 'DELETE_PATIENT_FILE', 'Patient', parseInt(req.params.id), `Archivo #${fileId}`);
        res.json({ success: true });
    } catch (err) {
        logger.error('DELETE /api/patients/:id/files/:fileId', err);
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

        indexPatient(discharged).catch(() => {}); // Búsqueda semántica: re-indexar (motivo de alta)
        res.json(discharged);
    } catch (err) {
        logger.error('POST /api/patients/:id/discharge', err);
        next(err);
    }
});

// POST /api/patients/:id/clinical-record
router.post('/:id/clinical-record', async (req, res, next) => {
    try {
        const {
            antecedentesMedicos, antecedentesFamiliares, historiaDesarrollo, diagnostico,
            analisisPruebas, perfilClinico, planIntervencion
        } = req.body;

        const clinicalRecord = await prisma.clinicalRecord.create({
            data: {
                patientId: parseInt(req.params.id),
                antecedentesMedicos: antecedentesMedicos || '',
                antecedentesFamiliares: antecedentesFamiliares || '',
                historiaDesarrollo: historiaDesarrollo || '',
                diagnostico: diagnostico || '',
                analisisPruebas: analisisPruebas || '',
                perfilClinico: perfilClinico || '',
                planIntervencion: planIntervencion || ''
            }
        });

        indexClinicalRecord(clinicalRecord).catch(() => {}); // Búsqueda semántica: indexar expediente
        res.status(201).json(clinicalRecord);
    } catch (err) {
        logger.error('POST /api/patients/:id/clinical-record', err);
        next(err);
    }
});

// PUT /api/patients/:id/clinical-record
router.put('/:id/clinical-record', async (req, res, next) => {
    try {
        const patientId = parseInt(req.params.id);
        const existing = await prisma.clinicalRecord.findUnique({ where: { patientId } });
        if (!existing) return res.status(404).json({ error: 'Expediente clínico no encontrado' });

        // Solo se actualizan los campos enviados (permite limpiar con cadena vacía)
        const CAMPOS = ['antecedentesMedicos', 'antecedentesFamiliares', 'historiaDesarrollo', 'diagnostico', 'analisisPruebas', 'perfilClinico', 'planIntervencion'];
        const data = {};
        for (const c of CAMPOS) if (req.body[c] !== undefined) data[c] = req.body[c];

        const updated = await prisma.clinicalRecord.update({ where: { patientId }, data });
        indexClinicalRecord(updated).catch(() => {}); // Búsqueda semántica: re-indexar expediente
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

        indexGoal(newGoal).catch(() => {}); // Búsqueda semántica: indexar meta
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
