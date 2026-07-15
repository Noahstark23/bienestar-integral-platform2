import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../lib/logger.js';

const router = Router();

// ============================================================
// PÚBLICO (sin autenticación) — para mostrar talleres en la landing.
// Debe ir ANTES de router.use(authenticateToken).
// ============================================================
// GET /api/workshops/public — talleres "Abierto" con datos seguros (sin pacientes)
router.get('/public', async (req, res, next) => {
    try {
        const workshops = await prisma.workshop.findMany({
            where: { estado: 'Abierto' },
            include: { _count: { select: { enrollments: true } } },
            orderBy: { fechaInicio: 'asc' }
        });
        const data = workshops.map(w => ({
            id: w.id,
            titulo: w.titulo,
            descripcion: w.descripcion,
            fechaInicio: w.fechaInicio,
            fechaFin: w.fechaFin,
            horario: w.horario,
            ubicacion: w.ubicacion,
            precio: w.precio,
            cupoMaximo: w.cupoMaximo,
            inscritos: w._count.enrollments,
            disponibles: Math.max(0, w.cupoMaximo - w._count.enrollments)
        }));
        res.json(data);
    } catch (err) {
        logger.error('GET /api/workshops/public', err);
        next(err);
    }
});

// A partir de aquí, todo requiere autenticación
router.use(authenticateToken);

// GET /api/workshops
router.get('/', async (req, res, next) => {
    try {
        const workshops = await prisma.workshop.findMany({
            include: {
                enrollments: {
                    include: { patient: { select: { nombre: true, telefono: true } } }
                },
                waitlist: {
                    include: { patient: { select: { nombre: true, telefono: true } } },
                    orderBy: { creadoEn: 'asc' }
                }
            },
            orderBy: { fechaInicio: 'asc' }
        });
        const formatted = workshops.map(w => ({ ...w, inscritos: w.enrollments.length }));
        res.json(formatted);
    } catch (err) {
        logger.error('GET /api/workshops', err);
        next(err);
    }
});

// POST /api/workshops
router.post('/', async (req, res, next) => {
    try {
        const { titulo, descripcion, fechaInicio, precio, cupoMaximo, ubicacion, horario } = req.body;

        const workshop = await prisma.workshop.create({
            data: {
                titulo,
                descripcion,
                fechaInicio: new Date(fechaInicio),
                precio: parseFloat(precio || 0),
                cupoMaximo: parseInt(cupoMaximo || 10),
                ubicacion: ubicacion || 'Consultorio',
                horario: horario || ''
            }
        });
        res.json(workshop);
    } catch (err) {
        logger.error('POST /api/workshops', err);
        next(err);
    }
});

// PUT /api/workshops/:id
router.put('/:id', async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const { titulo, descripcion, fechaInicio, fechaFin, precio, cupoMaximo, ubicacion, horario } = req.body;

        const updated = await prisma.workshop.update({
            where: { id },
            data: {
                ...(titulo !== undefined && { titulo }),
                ...(descripcion !== undefined && { descripcion }),
                ...(fechaInicio && { fechaInicio: new Date(fechaInicio) }),
                ...(fechaFin && { fechaFin: new Date(fechaFin) }),
                ...(precio !== undefined && { precio: parseFloat(precio) }),
                ...(cupoMaximo !== undefined && { cupoMaximo: parseInt(cupoMaximo) }),
                ...(ubicacion !== undefined && { ubicacion }),
                ...(horario !== undefined && { horario })
            }
        });
        res.json(updated);
    } catch (err) {
        logger.error('PUT /api/workshops/:id', err);
        next(err);
    }
});

// PATCH /api/workshops/:id/status
router.patch('/:id/status', async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const { estado } = req.body;
        const validStates = ['Abierto', 'Cerrado', 'Finalizado'];
        if (!validStates.includes(estado)) {
            return res.status(400).json({ error: `Estado inválido. Usar: ${validStates.join(', ')}` });
        }
        const updated = await prisma.workshop.update({ where: { id }, data: { estado } });
        res.json(updated);
    } catch (err) {
        logger.error('PATCH /api/workshops/:id/status', err);
        next(err);
    }
});

// POST /api/workshops/:id/waitlist
router.post('/:id/waitlist', async (req, res, next) => {
    try {
        const workshopId = parseInt(req.params.id);
        const { patientId } = req.body;

        if (!patientId) return res.status(400).json({ error: 'patientId es requerido' });

        const existing = await prisma.workshopWaitlist.findUnique({
            where: { workshopId_patientId: { workshopId, patientId: parseInt(patientId) } }
        });
        if (existing) return res.status(400).json({ error: 'Paciente ya está en lista de espera' });

        const entry = await prisma.workshopWaitlist.create({
            data: { workshopId, patientId: parseInt(patientId) },
            include: { patient: { select: { nombre: true, telefono: true } } }
        });
        res.status(201).json(entry);
    } catch (err) {
        logger.error('POST /api/workshops/:id/waitlist', err);
        next(err);
    }
});

// DELETE /api/workshops/:id/waitlist/:entryId
router.delete('/:id/waitlist/:entryId', async (req, res, next) => {
    try {
        await prisma.workshopWaitlist.delete({ where: { id: parseInt(req.params.entryId) } });
        res.json({ message: 'Entrada eliminada de lista de espera' });
    } catch (err) {
        logger.error('DELETE /api/workshops/:id/waitlist/:entryId', err);
        next(err);
    }
});

// POST /api/workshops/:id/enroll
// Acepta paciente registrado ({ patientId }) O participante externo
// ({ nombreExterno, telefonoExterno }) que no está en el sistema.
router.post('/:id/enroll', async (req, res, next) => {
    try {
        const workshopId = parseInt(req.params.id);
        const { patientId, nombreExterno, telefonoExterno } = req.body;

        if (!patientId && !nombreExterno) {
            return res.status(400).json({ error: 'Indica un paciente registrado o el nombre del participante externo' });
        }

        const workshop = await prisma.workshop.findUnique({
            where: { id: workshopId },
            include: { enrollments: true }
        });
        if (!workshop) return res.status(404).json({ error: 'Taller no encontrado' });

        if (workshop.enrollments.length >= workshop.cupoMaximo) {
            return res.status(400).json({ error: 'Cupo lleno' });
        }

        let data;
        if (patientId) {
            const existing = await prisma.workshopEnrollment.findFirst({
                where: { workshopId, patientId: parseInt(patientId) }
            });
            if (existing) return res.status(400).json({ error: 'Paciente ya inscrito' });
            data = { workshopId, patientId: parseInt(patientId) };
        } else {
            // Externo: evita duplicado por nombre en el mismo taller
            const dup = await prisma.workshopEnrollment.findFirst({
                where: { workshopId, nombreExterno: String(nombreExterno).trim() }
            });
            if (dup) return res.status(400).json({ error: 'Ese participante ya está inscrito' });
            data = {
                workshopId,
                nombreExterno: String(nombreExterno).trim(),
                telefonoExterno: telefonoExterno ? String(telefonoExterno).trim() : ''
            };
        }

        const enrollment = await prisma.workshopEnrollment.create({ data });
        res.json(enrollment);
    } catch (err) {
        logger.error('POST /api/workshops/:id/enroll', err);
        next(err);
    }
});

// PATCH /api/workshops/:id/enrollments/:enrollmentId/payment
router.patch('/:id/enrollments/:enrollmentId/payment', async (req, res, next) => {
    try {
        const enrollmentId = parseInt(req.params.enrollmentId);
        const { pagado } = req.body;

        if (typeof pagado !== 'boolean') {
            return res.status(400).json({ error: 'El campo pagado debe ser un booleano' });
        }

        const enrollment = await prisma.workshopEnrollment.update({
            where: { id: enrollmentId },
            data: { pagado },
            include: { patient: { select: { nombre: true, telefono: true } } }
        });
        res.json(enrollment);
    } catch (err) {
        logger.error('PATCH /api/workshops/:id/enrollments/:enrollmentId/payment', err);
        next(err);
    }
});

// DELETE /api/workshops/:id/enrollments/:enrollmentId
router.delete('/:id/enrollments/:enrollmentId', async (req, res, next) => {
    try {
        const enrollmentId = parseInt(req.params.enrollmentId);
        await prisma.workshopEnrollment.delete({ where: { id: enrollmentId } });
        res.json({ message: 'Inscripción eliminada correctamente' });
    } catch (err) {
        logger.error('DELETE /api/workshops/:id/enrollments/:enrollmentId', err);
        next(err);
    }
});

export default router;
