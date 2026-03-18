import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../lib/logger.js';

const router = Router();
router.use(authenticateToken);

// GET /api/packages?patientId=
router.get('/', async (req, res, next) => {
    try {
        const { patientId } = req.query;
        const where = {};
        if (patientId) where.patientId = parseInt(patientId);

        const packages = await prisma.sessionPackage.findMany({
            where,
            orderBy: { creadoEn: 'desc' }
        });
        res.json(packages);
    } catch (err) {
        logger.error('GET /api/packages', err);
        next(err);
    }
});

// POST /api/packages
router.post('/', async (req, res, next) => {
    try {
        const { patientId, titulo, totalSesiones, precioTotal, notas } = req.body;

        if (!patientId || !titulo || !totalSesiones || !precioTotal) {
            return res.status(400).json({ error: 'patientId, titulo, totalSesiones y precioTotal son requeridos' });
        }

        const pkg = await prisma.sessionPackage.create({
            data: {
                patientId: parseInt(patientId),
                titulo,
                totalSesiones: parseInt(totalSesiones),
                precioTotal: parseFloat(precioTotal),
                notas: notas || ''
            }
        });
        res.status(201).json(pkg);
    } catch (err) {
        logger.error('POST /api/packages', err);
        next(err);
    }
});

// PATCH /api/packages/:id/use — consume 1 sesión del paquete
router.patch('/:id/use', async (req, res, next) => {
    try {
        const pkg = await prisma.sessionPackage.findUnique({ where: { id: parseInt(req.params.id) } });
        if (!pkg) return res.status(404).json({ error: 'Paquete no encontrado' });
        if (pkg.estado !== 'Activo') return res.status(400).json({ error: 'El paquete no está activo' });
        if (pkg.sesionesUsadas >= pkg.totalSesiones) return res.status(400).json({ error: 'El paquete ya está agotado' });

        const nuevasUsadas = pkg.sesionesUsadas + 1;
        const nuevoEstado = nuevasUsadas >= pkg.totalSesiones ? 'Agotado' : 'Activo';

        const updated = await prisma.sessionPackage.update({
            where: { id: pkg.id },
            data: { sesionesUsadas: nuevasUsadas, estado: nuevoEstado }
        });
        res.json(updated);
    } catch (err) {
        logger.error('PATCH /api/packages/:id/use', err);
        next(err);
    }
});

// PATCH /api/packages/:id/cancel
router.patch('/:id/cancel', async (req, res, next) => {
    try {
        const updated = await prisma.sessionPackage.update({
            where: { id: parseInt(req.params.id) },
            data: { estado: 'Cancelado' }
        });
        res.json(updated);
    } catch (err) {
        logger.error('PATCH /api/packages/:id/cancel', err);
        next(err);
    }
});

export default router;
