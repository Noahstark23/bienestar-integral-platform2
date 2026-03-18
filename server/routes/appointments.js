import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../lib/logger.js';
import { sendAppointmentConfirmation } from '../lib/mailer.js';

const router = Router();

/**
 * Genera un enlace de WhatsApp con mensaje pre-llenado
 */
function generateWhatsAppLink(appointment, action) {
    const phone = appointment.telefono.replace(/[\s-]/g, '');
    const whatsappPhone = phone.startsWith('505') ? phone : `505${phone}`;

    const fecha = new Date(appointment.fechaHora);
    const fechaStr = fecha.toLocaleDateString('es-ES', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const horaStr = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    const templates = {
        confirm: `Hola ${appointment.nombrePaciente}! ✅ Tu cita ha sido confirmada para el *${fechaStr}* a las *${horaStr}*. Nos vemos pronto en Bienestar Integral! 🌟`,
        cancel: `Hola ${appointment.nombrePaciente}, lamentamos informarte que no pudimos confirmar tu cita solicitada. Por favor contáctanos para reagendar. 📞`,
        reminder: `Hola ${appointment.nombrePaciente}! 🔔 Recordatorio: Tienes cita mañana *${fechaStr}* a las *${horaStr}*. Te esperamos!`
    };

    const message = templates[action] || templates.confirm;
    return `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;
}

// GET /api/appointments/slots?date=YYYY-MM-DD — público, devuelve horas tomadas
router.get('/slots', async (req, res, next) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ error: 'date requerido (YYYY-MM-DD)' });

        const from = new Date(date + 'T00:00:00');
        const to = new Date(date + 'T23:59:59');

        const taken = await prisma.appointment.findMany({
            where: {
                fechaHora: { gte: from, lte: to },
                estado: { not: 'Cancelada' }
            },
            select: { fechaHora: true }
        });

        const takenHours = taken.map(a => {
            const d = new Date(a.fechaHora);
            return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        });

        res.json({ takenSlots: takenHours });
    } catch (err) {
        logger.error('GET /api/appointments/slots', err);
        next(err);
    }
});

// GET /api/appointments (protegido)
router.get('/', authenticateToken, async (req, res, next) => {
    try {
        const appointments = await prisma.appointment.findMany({
            orderBy: { fechaHora: 'asc' }
        });
        res.json(appointments);
    } catch (err) {
        logger.error('GET /api/appointments', err);
        next(err);
    }
});

// POST /api/appointments (PÚBLICO — desde landing page)
router.post('/', async (req, res, next) => {
    try {
        const { nombre, telefono, fechaHora } = req.body;

        if (!nombre || !telefono || !fechaHora) {
            return res.status(400).json({
                error: 'Todos los campos son requeridos: nombre, telefono, fechaHora'
            });
        }

        const fecha = new Date(fechaHora);
        if (isNaN(fecha.getTime())) {
            return res.status(400).json({ error: 'Fecha y hora inválida' });
        }

        const conflicto = await prisma.appointment.findFirst({
            where: { fechaHora: fecha, estado: { not: 'Cancelada' } }
        });

        if (conflicto) {
            return res.status(400).json({
                error: 'Horario no disponible',
                message: 'Ya existe una cita agendada para este horario. Por favor elige otro.'
            });
        }

        const newAppointment = await prisma.appointment.create({
            data: { nombrePaciente: nombre, telefono, fechaHora: fecha }
        });

        res.status(201).json(newAppointment);
    } catch (err) {
        if (err.code === 'P2002') {
            return res.status(400).json({
                error: 'Horario no disponible',
                message: 'Ya existe una cita agendada para este horario.'
            });
        }
        logger.error('POST /api/appointments', err);
        next(err);
    }
});

// PUT /api/appointments/:id/confirm (protegido)
router.put('/:id/confirm', authenticateToken, async (req, res, next) => {
    try {
        const appointment = await prisma.appointment.update({
            where: { id: parseInt(req.params.id) },
            data: { estado: 'Confirmada' }
        });
        const whatsappLink = generateWhatsAppLink(appointment, 'confirm');
        // Fire-and-forget: enviar email de confirmación si el paciente tiene email
        sendAppointmentConfirmation(appointment).catch(err => logger.error('Email confirmation failed', err));
        res.json({ appointment, whatsappLink });
    } catch (err) {
        logger.error('PUT /api/appointments/:id/confirm', err);
        next(err);
    }
});

// PUT /api/appointments/:id/cancel (protegido)
router.put('/:id/cancel', authenticateToken, async (req, res, next) => {
    try {
        const appointment = await prisma.appointment.update({
            where: { id: parseInt(req.params.id) },
            data: { estado: 'Cancelada' }
        });
        const whatsappLink = generateWhatsAppLink(appointment, 'cancel');
        res.json({ appointment, whatsappLink });
    } catch (err) {
        logger.error('PUT /api/appointments/:id/cancel', err);
        next(err);
    }
});

// POST /api/appointments/:id/convert-to-session (protegido)
router.post('/:id/convert-to-session', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { pago, tipo = 'Terapia', estadoPago = 'Pendiente' } = req.body;

        if (!pago || pago <= 0) {
            return res.status(400).json({ error: 'El monto es requerido' });
        }

        const appointment = await prisma.appointment.findUnique({
            where: { id: parseInt(id) }
        });

        if (!appointment) {
            return res.status(404).json({ error: 'Cita no encontrada' });
        }

        const patient = await prisma.patient.findFirst({
            where: { nombre: { contains: appointment.nombrePaciente } }
        });

        if (!patient) {
            return res.status(400).json({
                error: `Paciente "${appointment.nombrePaciente}" no encontrado en expedientes. Créalo primero en el módulo de Expedientes.`
            });
        }

        const result = await prisma.$transaction(async (tx) => {
            const session = await tx.session.create({
                data: {
                    patientId: patient.id,
                    patientName: patient.nombre,
                    fecha: appointment.fechaHora,
                    pago: parseFloat(pago),
                    estadoPago,
                    tipo,
                    resumen: `Sesión creada desde cita #${id}`
                }
            });
            await tx.appointment.update({
                where: { id: parseInt(id) },
                data: { estado: 'Confirmada' }
            });
            return { session };
        });

        res.json(result);
    } catch (err) {
        logger.error('POST /api/appointments/:id/convert-to-session', err);
        next(err);
    }
});

export default router;
