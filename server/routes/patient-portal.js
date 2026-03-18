import { Router } from 'express';
import prisma from '../lib/prisma.js';
import logger from '../lib/logger.js';

const router = Router();

/**
 * GET /api/portal/me?code=VS-XXXXXX
 * Acceso público: el paciente usa su código de sesión virtual como token.
 * Solo retorna información de solo lectura.
 */
router.get('/me', async (req, res, next) => {
    try {
        const { code } = req.query;

        if (!code) {
            return res.status(400).json({ error: 'Se requiere un código de acceso' });
        }

        // Buscar la sesión virtual por código
        const virtualSession = await prisma.virtualSession.findUnique({
            where: { codigo: code.toString().toUpperCase().trim() }
        });

        if (!virtualSession) {
            return res.status(404).json({ error: 'Código no válido. Verifica el código recibido.' });
        }

        if (!virtualSession.patientId) {
            // Sesión sin paciente registrado — devolver solo info básica
            return res.json({
                nombre: virtualSession.nombrePaciente,
                sesiones: [],
                facturasPendientes: [],
                talleres: [],
                proximasSesiones: []
            });
        }

        const patientId = virtualSession.patientId;

        // Cargar datos del paciente (solo lectura, campos no sensibles)
        const [patient, invoices, enrollments, upcomingVirtualSessions] = await Promise.all([
            prisma.patient.findUnique({
                where: { id: patientId },
                select: { nombre: true, edad: true, telefono: true, estado: true }
            }),
            prisma.invoice.findMany({
                where: { patientId, estado: { in: ['Pendiente', 'Vencida'] } },
                select: {
                    numeroFactura: true, total: true, saldo: true,
                    estado: true, fechaVencimiento: true, fechaEmision: true
                },
                orderBy: { fechaEmision: 'desc' },
                take: 10
            }),
            prisma.workshopEnrollment.findMany({
                where: { patientId },
                include: { workshop: { select: { titulo: true, fechaInicio: true, estado: true, ubicacion: true, horario: true } } },
                orderBy: { fechaInscripcion: 'desc' },
                take: 5
            }),
            prisma.virtualSession.findMany({
                where: {
                    patientId,
                    estado: { in: ['Aprobada', 'Solicitada'] },
                    fechaHora: { gte: new Date() }
                },
                select: { codigo: true, fechaHora: true, duracion: true, estado: true },
                orderBy: { fechaHora: 'asc' },
                take: 5
            })
        ]);

        if (!patient) {
            return res.status(404).json({ error: 'Paciente no encontrado' });
        }

        res.json({
            nombre: patient.nombre,
            edad: patient.edad,
            estado: patient.estado,
            facturasPendientes: invoices,
            talleres: enrollments.map(e => ({ ...e.workshop, pagado: e.pagado })),
            proximasSesiones: upcomingVirtualSessions
        });
    } catch (err) {
        logger.error('GET /api/portal/me', err);
        next(err);
    }
});

export default router;
