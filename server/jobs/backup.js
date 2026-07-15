import cron from 'node-cron';
import logger from '../lib/logger.js';
import { createBackup, backupFilename, setLastBackup } from '../lib/backup.js';
import { sendBackupEmail, smtpConfigured } from '../lib/mailer.js';

/**
 * Respaldo automático diario: genera el dump (sin adjuntos, para que el correo
 * sea liviano) y lo envía al correo de la profesional. Si SMTP no está
 * configurado, solo lo registra en el log.
 */
async function runDailyBackup() {
    try {
        if (!smtpConfigured()) {
            logger.warn('Backup diario: SMTP no configurado — no se puede enviar el respaldo por correo. Usa el botón "Descargar respaldo" del panel.');
            setLastBackup({ ok: false, destino: 'correo (automático)', error: 'SMTP no configurado' });
            return;
        }
        const gz = await createBackup({ includeFiles: false });
        const ok = await sendBackupEmail(gz, backupFilename(false));
        setLastBackup({
            ok,
            destino: 'correo (automático)',
            tamanoKB: Math.round(gz.length / 1024),
            ...(ok ? {} : { error: 'Fallo el envío SMTP' }),
        });
    } catch (err) {
        logger.error('Backup diario: error generando/enviando respaldo', err);
        setLastBackup({ ok: false, destino: 'correo (automático)', error: err.message });
    }
}

/**
 * Registra el cron: todos los días a las 2:30 AM (hora Nicaragua).
 */
export function startBackupJob() {
    cron.schedule('30 2 * * *', () => {
        logger.info('Cron: ejecutando respaldo automático diario');
        runDailyBackup();
    }, { timezone: 'America/Managua' });

    logger.info('Cron: respaldo automático registrado (02:30 AM diario, hora Nicaragua)');
}
