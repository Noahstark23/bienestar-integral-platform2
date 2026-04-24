import { Router } from 'express';
import { geminiModel } from '../lib/gemini.js';
import { getGeminiSystemPrompt } from '../utils/geminiPrompt.js';
import { getAvailabilityContext } from '../utils/availability.js';
import prisma from '../lib/prisma.js';
import logger from '../lib/logger.js';

const router = Router();

// POST /api/chat (PÚBLICO — chatbot en landing page)
router.post('/', async (req, res) => {
    try {
        const { message, history = [] } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Mensaje inválido' });
        }

        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_api_key_here') {
            return res.json({
                reply: 'Gracias por tu mensaje. Por favor configura GEMINI_API_KEY en el archivo .env para activar la IA. Mientras tanto, puedes llamarnos al 87171412.'
            });
        }

        const systemPrompt = getGeminiSystemPrompt();
        const availabilityContext = await getAvailabilityContext(prisma);

        const historyText = Array.isArray(history) && history.length > 0
            ? '\n\nHistorial de conversación:\n' + history
                .map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.text}`)
                .join('\n')
            : '';

        const fullPrompt = `${systemPrompt}\n\n${availabilityContext}${historyText}\n\nUsuario pregunta: ${message}\n\nTu respuesta:`;

        const result = await geminiModel.generateContent(fullPrompt);
        const response = await result.response;
        const reply = response.text();

        res.json({ reply });
    } catch (err) {
        // Chat tiene su propio manejo para preservar el mensaje de fallback al usuario
        logger.error('POST /api/chat', err);
        res.status(500).json({
            reply: 'Lo siento, tuve un problema técnico. Por favor intenta de nuevo o llámanos al 87171412.'
        });
    }
});

export default router;
