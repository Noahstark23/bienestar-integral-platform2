import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../lib/logger.js';

const router = Router();

/**
 * Genera link de WhatsApp con mensaje de recordatorio pre-llenado.
 */
function buildWhatsAppLink(telefono, nombre, fechaHora) {
    const phone = telefono.replace(/[\s\-()]/g, '');
    const wa = phone.startsWith('505') ? phone : `505${phone}`;
    const fecha = new Date(fechaHora);
    const fechaStr = fecha.toLocaleDateString('es-NI', { weekday: 'long', day: 'numeric', month: 'long' });
    const horaStr  = fecha.toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' });
    const msg = `Hola ${nombre} 👋, te recordamos que tienes una cita mañana *${fechaStr}* a las *${horaStr}*. Por favor llega 5 minutos antes. ¡Te esperamos! — Bienestar Integral`;
    return `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`;
}

// GET /api/reminders/tomorrow (protegido)
// Devuelve citas y sesiones de mañana para que el admin pueda enviar recordatorios por WhatsApp
router.get('/tomorrow', authenticateToken, async (req, res, next) => {
    try {
        const now   = new Date();
        const start = new Date(now);
        start.setDate(start.getDate() + 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setHours(23, 59, 59, 999);

        // Citas de mañana (Appointment — desde el formulario de la landing)
        const appointments = await prisma.appointment.findMany({
            where: {
                fechaHora: { gte: start, lte: end },
                estado: { not: 'Cancelada' },
            },
            orderBy: { fechaHora: 'asc' },
        });

        // Sesiones de mañana (Session — agenda interna)
        const sessions = await prisma.session.findMany({
            where: {
                fecha: { gte: start, lte: end },
            },
            include: {
                patient: { select: { nombre: true, telefono: true, email: true } },
            },
            orderBy: { fecha: 'asc' },
        });

        const appointmentItems = appointments.map(a => ({
            id:          a.id,
            type:        'appointment',
            nombre:      a.nombrePaciente,
            telefono:    a.telefono,
            email:       a.email || '',
            motivo:      a.motivo || '',
            fechaHora:   a.fechaHora,
            estado:      a.estado,
            whatsappLink: buildWhatsAppLink(a.telefono, a.nombrePaciente, a.fechaHora),
        }));

        const sessionItems = sessions.map(s => ({
            id:          s.id,
            type:        'session',
            nombre:      s.patient?.nombre || s.patientName,
            telefono:    s.patient?.telefono || '',
            email:       s.patient?.email || '',
            tipo:        s.tipo,
            fechaHora:   s.fecha,
            whatsappLink: s.patient?.telefono
                ? buildWhatsAppLink(s.patient.telefono, s.patient.nombre || s.patientName, s.fecha)
                : null,
        }));

        res.json({
            date:         start.toISOString().split('T')[0],
            appointments: appointmentItems,
            sessions:     sessionItems,
            total:        appointmentItems.length + sessionItems.length,
        });
    } catch (err) {
        logger.error('GET /api/reminders/tomorrow', err);
        next(err);
    }
});

export default router;
