import cron from 'node-cron';
import prisma from '../lib/prisma.js';
import { sendAppointmentReminder, sendSessionReminder } from '../lib/mailer.js';
import logger from '../lib/logger.js';

/**
 * Envía recordatorios de email para citas y sesiones en las próximas 23–25h.
 */
async function sendDailyReminders() {
    try {
        const now = new Date();
        const from = new Date(now.getTime() + 23 * 60 * 60 * 1000);
        const to   = new Date(now.getTime() + 25 * 60 * 60 * 1000);

        // ── 1. Recordatorios de citas (Appointment) ─────────────────────────
        const appointments = await prisma.appointment.findMany({
            where: {
                estado: 'Confirmada',        // Capital C — era el bug original
                fechaHora: { gte: from, lte: to },
            },
        });

        const aptsWithEmail = appointments.filter(a => a.email);
        logger.info(`Recordatorios citas: ${appointments.length} encontradas, ${aptsWithEmail.length} con email`);

        for (const apt of aptsWithEmail) {
            await sendAppointmentReminder(apt);
        }

        // ── 2. Recordatorios de sesiones (Session → Patient.email) ──────────
        const sessions = await prisma.session.findMany({
            where: {
                fecha: { gte: from, lte: to },
            },
            include: { patient: { select: { email: true, nombre: true, telefono: true } } },
        });

        const sessionsWithEmail = sessions.filter(s => s.patient?.email);
        logger.info(`Recordatorios sesiones: ${sessions.length} encontradas, ${sessionsWithEmail.length} con email`);

        for (const session of sessionsWithEmail) {
            await sendSessionReminder(session);
        }

    } catch (err) {
        logger.error('Error en job de recordatorios', err);
    }
}

/**
 * Registra el cron job — se ejecuta todos los días a las 9:00 AM (Nicaragua).
 */
export function startReminderJob() {
    cron.schedule('0 9 * * *', () => {
        logger.info('Cron: ejecutando job de recordatorios de citas y sesiones');
        sendDailyReminders();
    }, { timezone: 'America/Managua' });

    logger.info('Cron: job de recordatorios registrado (09:00 AM diario, hora Nicaragua)');
}
