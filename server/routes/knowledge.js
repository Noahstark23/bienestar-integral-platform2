import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../lib/logger.js';
import rag from '../lib/rag.js';

const router = Router();
router.use(authenticateToken);

// GET /api/knowledge/status — estado del índice RAG
router.get('/status', async (req, res, next) => {
    try {
        res.json(await rag.getStatus());
    } catch (err) {
        logger.error('GET /api/knowledge/status', err);
        next(err);
    }
});

// POST /api/knowledge/search — búsqueda semántica en la base de conocimiento
router.post('/search', async (req, res, next) => {
    try {
        const { query, k } = req.body || {};
        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'query requerido' });
        }
        const results = await rag.retrieve(query, Math.min(Math.max(parseInt(k) || 5, 1), 10));
        res.json({ query, results });
    } catch (err) {
        logger.error('POST /api/knowledge/search', err);
        next(err);
    }
});

// POST /api/knowledge/reindex — reconstruye embeddings de la base de conocimiento
router.post('/reindex', async (req, res, next) => {
    try {
        const status = await rag.reindex();
        logger.info('RAG reindex solicitado', status);
        res.json({ success: true, status });
    } catch (err) {
        logger.error('POST /api/knowledge/reindex', err);
        next(err);
    }
});

export default router;
