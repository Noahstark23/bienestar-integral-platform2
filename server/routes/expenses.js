import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../lib/logger.js';

const router = Router();
router.use(authenticateToken);

// GET /api/expenses
router.get('/', async (req, res, next) => {
    try {
        const expenses = await prisma.expense.findMany({
            orderBy: { fecha: 'desc' }
        });
        res.json(expenses);
    } catch (err) {
        logger.error('GET /api/expenses', err);
        next(err);
    }
});

// POST /api/expenses
router.post('/', async (req, res, next) => {
    try {
        const { concepto, monto, fecha, categoria } = req.body;

        if (!concepto || !monto || !fecha) {
            return res.status(400).json({ error: 'concepto, monto y fecha son requeridos' });
        }

        const montoParsed = parseFloat(monto);
        if (isNaN(montoParsed) || montoParsed <= 0) {
            return res.status(400).json({ error: 'El monto debe ser un número positivo' });
        }

        const newExpense = await prisma.expense.create({
            data: {
                concepto,
                monto: montoParsed,
                fecha: new Date(fecha),
                categoria: categoria || 'Operativo'
            }
        });

        res.status(201).json(newExpense);
    } catch (err) {
        logger.error('POST /api/expenses', err);
        next(err);
    }
});

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res, next) => {
    try {
        await prisma.expense.delete({
            where: { id: parseInt(req.params.id) }
        });
        res.json({ success: true, message: 'Gasto eliminado' });
    } catch (err) {
        logger.error('DELETE /api/expenses/:id', err);
        next(err);
    }
});

export default router;
