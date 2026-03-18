import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../lib/logger.js';

export const invoicesRouter = Router();
export const paymentsRouter = Router();

// ============================================
// INVOICES — /api/invoices
// ============================================

// POST /api/invoices (protegido)
invoicesRouter.post('/', authenticateToken, async (req, res, next) => {
    try {
        const {
            numeroFactura, patientId, sessionIds = [], enrollmentIds = [], customItems = [],
            descuento, notas, fechaVencimiento,
            sessionPriceOverrides = {},
            enrollmentPriceOverrides = {}
        } = req.body;

        if (!patientId || (sessionIds.length === 0 && enrollmentIds.length === 0 && customItems.length === 0)) {
            return res.status(400).json({ error: 'Se requiere paciente y al menos un ítem (sesión, taller o ítem manual)' });
        }

        // Validar sesiones
        let sessions = [];
        if (sessionIds.length > 0) {
            sessions = await prisma.session.findMany({
                where: { id: { in: sessionIds }, patientId: parseInt(patientId), facturada: false }
            });
            if (sessions.length !== sessionIds.length) {
                return res.status(400).json({ error: 'Algunas sesiones no existen o ya están facturadas' });
            }
        }

        // Validar inscripciones
        let enrollments = [];
        if (enrollmentIds.length > 0) {
            enrollments = await prisma.workshopEnrollment.findMany({
                where: { id: { in: enrollmentIds }, patientId: parseInt(patientId), invoices: { none: {} } },
                include: { workshop: true }
            });
            if (enrollments.length !== enrollmentIds.length) {
                return res.status(400).json({ error: 'Algunas inscripciones no existen o ya están facturadas' });
            }
        }

        // Calcular totales
        const sessionsTotal = sessions.reduce((sum, s) => {
            const price = sessionPriceOverrides[s.id] !== undefined ? parseFloat(sessionPriceOverrides[s.id]) : s.pago;
            return sum + price;
        }, 0);

        const workshopsTotal = enrollments.reduce((sum, e) => {
            const price = enrollmentPriceOverrides[e.id] !== undefined ? parseFloat(enrollmentPriceOverrides[e.id]) : e.workshop.precio;
            return sum + price;
        }, 0);

        const customTotal = customItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const subtotal = sessionsTotal + workshopsTotal + customTotal;
        const descuentoMonto = descuento || 0;
        const subtotalConDescuento = subtotal - descuentoMonto;
        const iva = subtotalConDescuento * 0.15;
        const total = subtotalConDescuento + iva;

        // Generar número único
        const year = new Date().getFullYear();
        const count = await prisma.invoice.count({
            where: { numeroFactura: { startsWith: `FAC-${year}-` } }
        });
        const numeroFacturaGenerated = numeroFactura || `FAC-${year}-${String(count + 1).padStart(3, '0')}`;

        const vencimiento = fechaVencimiento
            ? new Date(fechaVencimiento)
            : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

        const invoice = await prisma.$transaction(async (tx) => {
            const newInvoice = await tx.invoice.create({
                data: {
                    numeroFactura: numeroFacturaGenerated,
                    patientId: parseInt(patientId),
                    subtotal,
                    descuento: descuentoMonto,
                    iva,
                    total,
                    saldo: total,
                    fechaVencimiento: vencimiento,
                    notas
                }
            });

            if (sessions.length > 0) {
                await tx.invoiceSession.createMany({
                    data: sessions.map(s => ({
                        invoiceId: newInvoice.id,
                        sessionId: s.id,
                        monto: sessionPriceOverrides[s.id] !== undefined ? parseFloat(sessionPriceOverrides[s.id]) : s.pago
                    }))
                });
                await tx.session.updateMany({
                    where: { id: { in: sessionIds } },
                    data: { facturada: true }
                });
            }

            if (enrollments.length > 0) {
                await tx.invoiceWorkshop.createMany({
                    data: enrollments.map(e => ({
                        invoiceId: newInvoice.id,
                        enrollmentId: e.id,
                        monto: enrollmentPriceOverrides[e.id] !== undefined ? parseFloat(enrollmentPriceOverrides[e.id]) : e.workshop.precio
                    }))
                });
            }

            if (customItems.length > 0) {
                await tx.invoiceItem.createMany({
                    data: customItems.map(item => ({
                        invoiceId: newInvoice.id,
                        description: item.description,
                        quantity: parseInt(item.quantity),
                        unitPrice: parseFloat(item.unitPrice),
                        amount: parseInt(item.quantity) * parseFloat(item.unitPrice)
                    }))
                });
            }

            return newInvoice;
        });

        const fullInvoice = await prisma.invoice.findUnique({
            where: { id: invoice.id },
            include: {
                patient: true,
                sessions: { include: { session: true } },
                workshops: { include: { enrollment: { include: { workshop: true } } } },
                items: true,
                payments: true
            }
        });

        res.json(fullInvoice);
    } catch (err) {
        logger.error('POST /api/invoices', err);
        next(err);
    }
});

// GET /api/invoices (protegido)
invoicesRouter.get('/', authenticateToken, async (req, res, next) => {
    try {
        const { estado, patientId, startDate, endDate } = req.query;
        const where = {};
        if (estado) where.estado = estado;
        if (patientId) where.patientId = parseInt(patientId);
        if (startDate || endDate) {
            where.fechaEmision = {};
            if (startDate) where.fechaEmision.gte = new Date(startDate);
            if (endDate) where.fechaEmision.lte = new Date(endDate);
        }

        const invoices = await prisma.invoice.findMany({
            where,
            include: {
                patient: { select: { id: true, nombre: true, telefono: true } },
                sessions: { include: { session: true } },
                workshops: { include: { enrollment: { include: { workshop: true } } } },
                items: true,
                payments: true
            },
            orderBy: { fechaEmision: 'desc' }
        });

        res.json(invoices);
    } catch (err) {
        logger.error('GET /api/invoices', err);
        next(err);
    }
});

// GET /api/invoices/:id (protegido)
invoicesRouter.get('/:id', authenticateToken, async (req, res, next) => {
    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                patient: true,
                sessions: { include: { session: true } },
                workshops: { include: { enrollment: { include: { workshop: true } } } },
                items: true,
                payments: { orderBy: { fechaPago: 'desc' } }
            }
        });

        if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
        res.json(invoice);
    } catch (err) {
        logger.error('GET /api/invoices/:id', err);
        next(err);
    }
});

// PUT /api/invoices/:id — SECURITY FIX: era público, ahora protegido
invoicesRouter.put('/:id', authenticateToken, async (req, res, next) => {
    try {
        const { descuento, notas, estado } = req.body;

        const invoice = await prisma.invoice.findUnique({ where: { id: parseInt(req.params.id) } });
        if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });

        const updateData = {};
        if (notas !== undefined) updateData.notas = notas;
        if (estado !== undefined) updateData.estado = estado;

        if (descuento !== undefined && descuento !== invoice.descuento) {
            const subtotalConDescuento = invoice.subtotal - descuento;
            const iva = subtotalConDescuento * 0.15;
            const total = subtotalConDescuento + iva;
            const saldo = total - invoice.pagado;
            updateData.descuento = descuento;
            updateData.iva = iva;
            updateData.total = total;
            updateData.saldo = saldo;
        }

        const updated = await prisma.invoice.update({
            where: { id: parseInt(req.params.id) },
            data: updateData,
            include: { patient: true, sessions: { include: { session: true } }, payments: true }
        });

        res.json(updated);
    } catch (err) {
        logger.error('PUT /api/invoices/:id', err);
        next(err);
    }
});

// DELETE /api/invoices/:id (protegido)
invoicesRouter.delete('/:id', authenticateToken, async (req, res, next) => {
    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id: parseInt(req.params.id) },
            include: { payments: true, sessions: true }
        });

        if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });

        if (invoice.payments.length > 0) {
            return res.status(400).json({ error: 'No se puede eliminar factura con pagos registrados' });
        }

        await prisma.$transaction(async (tx) => {
            const sessionIds = invoice.sessions.map(is => is.sessionId);
            await tx.session.updateMany({
                where: { id: { in: sessionIds } },
                data: { facturada: false }
            });
            await tx.invoice.delete({ where: { id: parseInt(req.params.id) } });
        });

        res.json({ message: 'Factura eliminada correctamente' });
    } catch (err) {
        logger.error('DELETE /api/invoices/:id', err);
        next(err);
    }
});

// POST /api/invoices/:id/payments (protegido)
invoicesRouter.post('/:id/payments', authenticateToken, async (req, res, next) => {
    try {
        const { monto, metodoPago, referencia = '', notas = '' } = req.body;

        if (!monto || !metodoPago) {
            return res.status(400).json({ error: 'monto y metodoPago son requeridos' });
        }

        const invoice = await prisma.invoice.findUnique({ where: { id: parseInt(req.params.id) } });
        if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });

        if (monto > invoice.saldo) {
            return res.status(400).json({ error: 'El monto excede el saldo pendiente' });
        }

        const result = await prisma.$transaction(async (tx) => {
            const payment = await tx.payment.create({
                data: { invoiceId: parseInt(req.params.id), monto, metodoPago, referencia, notas }
            });

            const newPagado = invoice.pagado + monto;
            const newSaldo = invoice.total - newPagado;
            const newEstado = newSaldo === 0 ? 'Pagada' : 'Pendiente';

            const updatedInvoice = await tx.invoice.update({
                where: { id: parseInt(req.params.id) },
                data: { pagado: newPagado, saldo: newSaldo, estado: newEstado },
                include: { patient: true, payments: { orderBy: { fechaPago: 'desc' } } }
            });

            return { payment, invoice: updatedInvoice };
        });

        res.json(result);
    } catch (err) {
        logger.error('POST /api/invoices/:id/payments', err);
        next(err);
    }
});

// GET /api/invoices/:id/payments — SECURITY FIX: era público, ahora protegido
invoicesRouter.get('/:id/payments', authenticateToken, async (req, res, next) => {
    try {
        const payments = await prisma.payment.findMany({
            where: { invoiceId: parseInt(req.params.id) },
            orderBy: { fechaPago: 'desc' }
        });
        res.json(payments);
    } catch (err) {
        logger.error('GET /api/invoices/:id/payments', err);
        next(err);
    }
});

// ============================================
// PAYMENTS — /api/payments
// ============================================

// DELETE /api/payments/:id (protegido)
paymentsRouter.delete('/:id', authenticateToken, async (req, res, next) => {
    try {
        const payment = await prisma.payment.findUnique({
            where: { id: parseInt(req.params.id) },
            include: { invoice: true }
        });

        if (!payment) return res.status(404).json({ error: 'Pago no encontrado' });

        await prisma.$transaction(async (tx) => {
            const newPagado = payment.invoice.pagado - payment.monto;
            const newSaldo = payment.invoice.total - newPagado;

            await tx.invoice.update({
                where: { id: payment.invoiceId },
                data: { pagado: newPagado, saldo: newSaldo, estado: newSaldo > 0 ? 'Pendiente' : 'Pagada' }
            });

            await tx.payment.delete({ where: { id: parseInt(req.params.id) } });
        });

        res.json({ message: 'Pago eliminado correctamente' });
    } catch (err) {
        logger.error('DELETE /api/payments/:id', err);
        next(err);
    }
});
