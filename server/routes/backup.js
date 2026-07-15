import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../lib/logger.js';
import { logAction } from '../middleware/audit.js';
import { createBackup, backupFilename, getLastBackup, setLastBackup } from '../lib/backup.js';
import { sendBackupEmail, smtpConfigured } from '../lib/mailer.js';

const router = Router();
router.use(authenticateToken);

// GET /api/backup/status — estado del sistema de respaldos
router.get('/status', (req, res) => {
    res.json({
        smtpConfigurado: smtpConfigured(),
        horaAutomatica: '2:30 AM (hora Nicaragua), diario, por correo',
        ultimoRespaldo: getLastBackup(),
    });
});

// GET /api/backup/download — descarga el respaldo completo (incluye adjuntos)
router.get('/download', async (req, res, next) => {
    try {
        const gz = await createBackup({ includeFiles: true });
        setLastBackup({ ok: true, destino: 'descarga manual', tamanoKB: Math.round(gz.length / 1024) });
        logAction(req, 'DOWNLOAD_BACKUP', 'Backup', null, `${Math.round(gz.length / 1024)} KB`);

        res.setHeader('Content-Type', 'application/gzip');
        res.setHeader('Content-Disposition', `attachment; filename="${backupFilename(true)}"`);
        res.send(gz);
    } catch (err) {
        logger.error('GET /api/backup/download', err);
        next(err);
    }
});

// POST /api/backup/send-email — envía el respaldo por correo ahora mismo
router.post('/send-email', async (req, res, next) => {
    try {
        if (!smtpConfigured()) {
            return res.status(400).json({ error: 'SMTP no está configurado. Agrega SMTP_HOST/USER/PASS en las variables de entorno.' });
        }
        const gz = await createBackup({ includeFiles: false });
        const ok = await sendBackupEmail(gz, backupFilename(false));
        if (!ok) return res.status(500).json({ error: 'No se pudo enviar el correo. Revisa la configuración SMTP.' });

        setLastBackup({ ok: true, destino: 'correo (manual)', tamanoKB: Math.round(gz.length / 1024) });
        logAction(req, 'EMAIL_BACKUP', 'Backup', null, `${Math.round(gz.length / 1024)} KB`);
        res.json({ success: true, mensaje: 'Respaldo enviado por correo.' });
    } catch (err) {
        logger.error('POST /api/backup/send-email', err);
        next(err);
    }
});

export default router;
