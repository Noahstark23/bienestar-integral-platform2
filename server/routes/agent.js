import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticateToken } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import logger from '../lib/logger.js';

const router = Router();

function getModel() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
}

function formatDate(date) {
    return new Date(date).toLocaleString('es-NI', {
        weekday: 'long', day: 'numeric', month: 'long',
        hour: '2-digit', minute: '2-digit'
    });
}

function formatDateShort(date) {
    return new Date(date).toLocaleDateString('es-NI', {
        day: 'numeric', month: 'long', year: 'numeric'
    });
}

async function buildContext() {
    const ahora = new Date();
    const inicioHoy = new Date(ahora); inicioHoy.setHours(0, 0, 0, 0);
    const finHoy = new Date(ahora); finHoy.setHours(23, 59, 59, 999);
    const inicioSemana = new Date(ahora); inicioSemana.setDate(ahora.getDate() - ahora.getDay());
    inicioSemana.setHours(0, 0, 0, 0);
    const finSemana = new Date(inicioSemana); finSemana.setDate(inicioSemana.getDate() + 7);

    const [
        citasHoy,
        citasPendientes,
        pacientesActivos,
        pacientesPausa,
        sesionesRecientes,
        facturasVencidas,
        sesionesHoy,
        metas
    ] = await Promise.all([
        prisma.appointment.findMany({
            where: { fechaHora: { gte: inicioHoy, lte: finHoy } },
            orderBy: { fechaHora: 'asc' }
        }),
        prisma.appointment.findMany({
            where: { estado: 'Pendiente', fechaHora: { gte: ahora } },
            orderBy: { fechaHora: 'asc' },
            take: 10
        }),
        prisma.patient.count({ where: { estado: 'Activo' } }),
        prisma.patient.count({ where: { estado: 'Pausa' } }),
        prisma.session.findMany({
            take: 5,
            orderBy: { fecha: 'desc' },
            include: { patient: { select: { nombre: true } } }
        }),
        prisma.invoice.findMany({
            where: { estado: 'Vencida' },
            include: { patient: { select: { nombre: true } } },
            take: 5
        }),
        prisma.session.findMany({
            where: { fecha: { gte: inicioHoy, lte: finHoy } },
            include: { patient: { select: { nombre: true } } }
        }),
        prisma.therapeuticGoal.findMany({
            where: { estado: { in: ['Pendiente', 'EnProgreso'] } },
            include: { patient: { select: { nombre: true } } },
            take: 5
        })
    ]);

    let ctx = `=== CONTEXTO CLÍNICO (${formatDateShort(ahora)}) ===\n\n`;

    ctx += `📅 CITAS HOY (${citasHoy.length}):\n`;
    if (citasHoy.length === 0) {
        ctx += '  Sin citas programadas para hoy.\n';
    } else {
        citasHoy.forEach(c => {
            ctx += `  • ${formatDate(c.fechaHora)} — ${c.nombrePaciente} (${c.motivo || 'sin motivo'}) [${c.estado}]\n`;
        });
    }

    ctx += `\n📋 SESIONES HOY (${sesionesHoy.length}):\n`;
    if (sesionesHoy.length === 0) {
        ctx += '  Sin sesiones registradas hoy.\n';
    } else {
        sesionesHoy.forEach(s => {
            ctx += `  • ${s.patient.nombre} — ${s.tipo} — Pago: ${s.estadoPago}\n`;
        });
    }

    ctx += `\n👥 PACIENTES: ${pacientesActivos} activos, ${pacientesPausa} en pausa\n`;

    ctx += `\n⏳ SOLICITUDES PENDIENTES (${citasPendientes.length}):\n`;
    if (citasPendientes.length === 0) {
        ctx += '  Sin solicitudes pendientes.\n';
    } else {
        citasPendientes.slice(0, 5).forEach(c => {
            ctx += `  • ${formatDate(c.fechaHora)} — ${c.nombrePaciente} — Tel: ${c.telefono}\n`;
        });
    }

    ctx += `\n📝 SESIONES RECIENTES:\n`;
    sesionesRecientes.forEach(s => {
        ctx += `  • ${formatDateShort(s.fecha)} — ${s.patient.nombre} (${s.tipo})\n`;
    });

    if (facturasVencidas.length > 0) {
        ctx += `\n⚠️ FACTURAS VENCIDAS (${facturasVencidas.length}):\n`;
        facturasVencidas.forEach(f => {
            ctx += `  • ${f.patient.nombre} — C$ ${f.saldo} pendiente\n`;
        });
    }

    if (metas.length > 0) {
        ctx += `\n🎯 METAS TERAPÉUTICAS EN CURSO:\n`;
        metas.forEach(m => {
            ctx += `  • ${m.patient.nombre}: "${m.titulo}" — ${m.progreso}% — ${m.estado}\n`;
        });
    }

    return ctx;
}

const SYSTEM_PROMPT = `Eres Isabel, la asistente personal inteligente de la Lic. Esmirna García, psicóloga clínica.
Eres su mano derecha digital: eficiente, discreta, empática y profesional.

TUS CAPACIDADES:
- Informas sobre citas del día, semana o próximas
- Resumes el estado de la clínica (pacientes, sesiones, finanzas)
- Recuerdas metas terapéuticas y su progreso
- Das informes sobre solicitudes pendientes
- Alertas sobre facturas vencidas o pagos pendientes
- Eres proactiva: si hay cosas urgentes, las mencionas
- Respondes en español, de forma concisa y clara

LIMITACIONES ACTUALES:
- No puedes crear o modificar registros directamente (eso se hace en el panel)
- Basas tus respuestas en el contexto clínico que se te proporciona

TONO: Profesional pero cálido. Como una asistente de confianza.
Cuando saludas, siempre menciona lo más importante del día.`;

// POST /api/agent/chat
router.post('/chat', authenticateToken, async (req, res) => {
    try {
        const { message, history = [] } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Mensaje inválido' });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(503).json({ error: 'GEMINI_API_KEY no configurada' });
        }

        const context = await buildContext();

        const historyText = Array.isArray(history) && history.length > 0
            ? '\n\nCONVERSACIÓN ANTERIOR:\n' + history
                .map(m => `${m.role === 'user' ? 'Lic. Esmirna' : 'Isabel'}: ${m.text}`)
                .join('\n')
            : '';

        const fullPrompt = `${SYSTEM_PROMPT}\n\n${context}${historyText}\n\nLic. Esmirna: ${message}\nIsabel:`;

        const model = getModel();
        const result = await model.generateContent(fullPrompt);
        const reply = result.response.text();

        res.json({ reply });
    } catch (err) {
        logger.error('POST /api/agent/chat', err);
        res.status(500).json({ error: 'Error al procesar tu mensaje. Intenta de nuevo.' });
    }
});

export default router;
