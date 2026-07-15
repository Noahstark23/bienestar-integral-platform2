// ============================================================
// Respaldo de la base de datos
// Exporta TODAS las tablas a un JSON comprimido (gzip). No requiere pg_dump:
// usa Prisma, así funciona igual en cualquier entorno. El respaldo se puede
// descargar desde el panel o enviarse por correo (automático diario).
// ============================================================
import zlib from 'zlib';
import prisma from './prisma.js';
import logger from './logger.js';

// Orden de dependencias (padres primero) — el mismo que usa el script de restauración.
export const BACKUP_TABLES = [
    'user', 'patient', 'clinicalRecord', 'patientFile', 'therapeuticGoal',
    'expense', 'appointment', 'availabilitySlot', 'workshop', 'telmedAvailability',
    'session', 'sessionPackage', 'assessment', 'virtualSession',
    'workshopEnrollment', 'workshopWaitlist',
    'invoice', 'invoiceSession', 'invoiceItem', 'invoiceWorkshop', 'payment',
    'auditLog',
];

// Estado del último respaldo (en memoria; visible en /api/backup/status)
let lastBackup = null;

export function getLastBackup() {
    return lastBackup;
}

export function setLastBackup(info) {
    lastBackup = { ...info, fecha: new Date().toISOString() };
}

/**
 * Crea un respaldo completo de la base de datos.
 * @param {{includeFiles?: boolean}} opts  includeFiles=false omite el contenido
 *   binario de los adjuntos (PatientFile.data) para respaldos ligeros por correo.
 * @returns {Promise<Buffer>} JSON gzip
 */
export async function createBackup({ includeFiles = true } = {}) {
    const tablas = {};

    for (const model of BACKUP_TABLES) {
        if (model === 'patientFile' && !includeFiles) {
            tablas[model] = await prisma.patientFile.findMany({
                select: { id: true, patientId: true, categoria: true, nombre: true, mimeType: true, size: true, creadoEn: true },
            });
            continue;
        }
        const rows = await prisma[model].findMany();
        if (model === 'patientFile') {
            // Bytes → base64 para que quepa en JSON
            tablas[model] = rows.map(r => ({ ...r, data: Buffer.from(r.data).toString('base64') }));
        } else {
            tablas[model] = rows;
        }
    }

    const payload = {
        formato: 'bienestar-backup',
        version: 1,
        generadoEn: new Date().toISOString(),
        incluyeArchivos: includeFiles,
        tablas,
    };

    const gz = zlib.gzipSync(Buffer.from(JSON.stringify(payload), 'utf8'));
    logger.info(`Backup generado: ${(gz.length / 1024).toFixed(1)} KB (archivos adjuntos: ${includeFiles ? 'sí' : 'no'})`);
    return gz;
}

export function backupFilename(includeFiles = true) {
    const d = new Date().toISOString().slice(0, 10);
    return `respaldo-bienestar-${d}${includeFiles ? '' : '-sin-adjuntos'}.json.gz`;
}

export default { createBackup, backupFilename, getLastBackup, setLastBackup, BACKUP_TABLES };
