import prisma from '../lib/prisma.js';
import logger from '../lib/logger.js';

/**
 * Registra una acción en el log de auditoría.
 * Se llama de forma fire-and-forget para no bloquear la respuesta.
 *
 * @param {Object} req - Express request (para extraer usuario e IP)
 * @param {string} accion - Código de acción: CREATE_PATIENT, UPDATE_INVOICE, etc.
 * @param {string} entidad - Nombre del modelo: Patient, Invoice, Session, etc.
 * @param {number|null} entidadId - ID del registro afectado
 * @param {string} detalle - Detalle opcional legible por humanos
 */
export async function logAction(req, accion, entidad, entidadId = null, detalle = '') {
    try {
        const usuario = req.user?.username || req.user?.nombre || 'sistema';
        const ip = req.ip || req.connection?.remoteAddress || '';
        await prisma.auditLog.create({
            data: { usuario, accion, entidad, entidadId, detalle, ip }
        });
    } catch (err) {
        // El fallo de auditoría nunca debe romper la operación principal
        logger.error('AuditLog write failed', err);
    }
}
