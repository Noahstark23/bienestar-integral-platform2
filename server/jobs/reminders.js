import cron from 'node-cron';
import prisma from '../lib/prisma.js';
import { sendAppointmentReminder } from '../lib/mailer.js';
import logger from '../lib/logger.js';

/**
 * Ejecuta el job de recordatorios de citas 24h antes.
 * Busca citas confirmadas que ocurran entre 23h y 25h desde ahora.
 */
async function sendDailyReminders() {
    try {
        const now = new Date();
        const from = new Date(now.getTime() + 23 * 60 * 60 * 1000);
        const to = new Date(now.getTime() + 25 * 60 * 60 * 1000);

        const appointments = await prisma.appointment.findMany({
            where: {
                estado: 'confirmada',
                fechaHora: { gte: from, lte: to },
            },
        });

        const withEmail = appointments.filter(a => a.email);
        logger.info(`Recordatorios 24h: ${appointments.length} citas encontradas, ${withEmail.length} con email`);

        for (const appointment of withEmail) {
            await sendAppointmentReminder(appointment);
        }
    } catch (err) {
        logger.error('Error en job de recordatorios', err);
    }
}

/**
 * Registra el cron job: se ejecuta todos los días a las 9:00 AM.
 */
export function startReminderJob() {
    cron.schedule('0 9 * * *', () => {
        logger.info('Cron: ejecutando job de recordatorios de citas');
        sendDailyReminders();
    }, { timezone: 'America/Managua' });

    logger.info('Cron: job de recordatorios de citas registrado (09:00 AM diario)');
}
