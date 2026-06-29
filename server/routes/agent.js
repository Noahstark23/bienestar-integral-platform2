import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticateToken } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import logger from '../lib/logger.js';
import rag from '../lib/rag.js';
import { generateDocument, DOCUMENT_TYPES } from '../lib/documents.js';

const router = Router();

const FASES_PROCESO = ['EvaluacionInicial', 'Procesamiento', 'Perfil', 'Plan', 'Devolucion', 'Intervencion', 'Seguimiento', 'Alta'];

// Modelo de Gemini para Isabel. Configurable por entorno para no depender de
// versiones que Google retira (p. ej. gemini-1.5-flash quedó deprecado).
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

// ============================================================
// DEFINICIÓN DE HERRAMIENTAS (lo que Isabel puede hacer)
// ============================================================
const TOOLS = [{
    functionDeclarations: [
        {
            name: 'buscar_paciente',
            description: 'Busca un paciente por nombre para obtener su ID y datos básicos. Usa esto antes de registrar sesiones o metas.',
            parameters: {
                type: 'object',
                properties: {
                    nombre: { type: 'string', description: 'Nombre o apellido del paciente a buscar' }
                },
                required: ['nombre']
            }
        },
        {
            name: 'crear_cita',
            description: 'Crea una nueva solicitud de cita. Úsala cuando la psicóloga quiera agendar una cita con un paciente.',
            parameters: {
                type: 'object',
                properties: {
                    nombrePaciente: { type: 'string', description: 'Nombre completo del paciente' },
                    telefono: { type: 'string', description: 'Número de teléfono del paciente' },
                    fechaHora: { type: 'string', description: 'Fecha y hora en formato ISO 8601, ej: 2025-04-20T10:00:00' },
                    motivo: { type: 'string', description: 'Motivo o razón de la cita' },
                    email: { type: 'string', description: 'Email del paciente (opcional)' }
                },
                required: ['nombrePaciente', 'telefono', 'fechaHora']
            }
        },
        {
            name: 'actualizar_estado_cita',
            description: 'Confirma, cancela o actualiza el estado de una solicitud de cita existente.',
            parameters: {
                type: 'object',
                properties: {
                    nombrePaciente: { type: 'string', description: 'Nombre del paciente de la cita' },
                    estado: { type: 'string', enum: ['Pendiente', 'Confirmada', 'Cancelada', 'Completada'], description: 'Nuevo estado de la cita' }
                },
                required: ['nombrePaciente', 'estado']
            }
        },
        {
            name: 'registrar_sesion',
            description: 'Registra una sesión terapéutica realizada hoy o en una fecha específica. Incluye notas clínicas y pago.',
            parameters: {
                type: 'object',
                properties: {
                    patientId: { type: 'number', description: 'ID del paciente (obtenido con buscar_paciente)' },
                    patientName: { type: 'string', description: 'Nombre del paciente' },
                    tipo: { type: 'string', enum: ['Evaluacion', 'Terapia', 'Consulta'], description: 'Tipo de sesión' },
                    nota: { type: 'string', description: 'Nota clínica o resumen de la sesión' },
                    fecha: { type: 'string', description: 'Fecha de la sesión ISO 8601, si no se indica se usa hoy' },
                    pago: { type: 'number', description: 'Monto pagado por el paciente' },
                    estadoPago: { type: 'string', enum: ['Pagado', 'Pendiente', 'Exonerado'], description: 'Estado del pago, por defecto Pendiente' }
                },
                required: ['patientId', 'patientName', 'tipo', 'nota']
            }
        },
        {
            name: 'crear_paciente',
            description: 'Registra un nuevo paciente en el sistema.',
            parameters: {
                type: 'object',
                properties: {
                    nombre: { type: 'string', description: 'Nombre completo del paciente' },
                    telefono: { type: 'string', description: 'Teléfono de contacto' },
                    edad: { type: 'number', description: 'Edad del paciente' },
                    motivo: { type: 'string', description: 'Motivo de consulta o diagnóstico inicial' },
                    email: { type: 'string', description: 'Correo electrónico (opcional)' }
                },
                required: ['nombre', 'telefono']
            }
        },
        {
            name: 'agregar_meta_terapeutica',
            description: 'Agrega una meta terapéutica o objetivo de tratamiento a un paciente.',
            parameters: {
                type: 'object',
                properties: {
                    patientId: { type: 'number', description: 'ID del paciente' },
                    titulo: { type: 'string', description: 'Título corto de la meta' },
                    descripcion: { type: 'string', description: 'Descripción detallada de la meta' },
                    fechaLimite: { type: 'string', description: 'Fecha límite ISO 8601 (opcional)' }
                },
                required: ['patientId', 'titulo', 'descripcion']
            }
        },
        {
            name: 'ver_paciente',
            description: 'Obtiene el historial completo de un paciente: sesiones, metas, evaluaciones y facturas.',
            parameters: {
                type: 'object',
                properties: {
                    patientId: { type: 'number', description: 'ID del paciente' }
                },
                required: ['patientId']
            }
        },
        {
            name: 'consultar_base_conocimiento',
            description: 'Consulta la base de conocimiento del consultorio: proceso clínico (flujograma de paciente nuevo), estructura del expediente (perfil clínico, plan de intervención, registro de sesiones, sesiones de seguimiento), protocolos (honorarios, duración, cancelaciones) y las plantillas (entrevista, historial clínico, consentimiento infantil, contrato adultos). Úsala SIEMPRE que te pregunten "qué sigue", "cómo es el proceso", "qué documentos", "cuánto cobro", "cómo registro", o por el contenido de cualquier plantilla.',
            parameters: {
                type: 'object',
                properties: {
                    consulta: { type: 'string', description: 'La pregunta o tema a buscar en la base de conocimiento' }
                },
                required: ['consulta']
            }
        },
        {
            name: 'generar_documento',
            description: 'Genera un documento clínico rellenado con los datos del paciente. Tipos válidos: contrato-adultos, consentimiento-infantil, entrevista, historial-clinico, perfil-clinico, plan-intervencion.',
            parameters: {
                type: 'object',
                properties: {
                    patientId: { type: 'number', description: 'ID del paciente' },
                    tipo: { type: 'string', enum: ['contrato-adultos', 'consentimiento-infantil', 'entrevista', 'historial-clinico', 'perfil-clinico', 'plan-intervencion'], description: 'Tipo de documento a generar' }
                },
                required: ['patientId', 'tipo']
            }
        },
        {
            name: 'actualizar_plan_clinico',
            description: 'Guarda o actualiza en el expediente del paciente el análisis de pruebas, el perfil clínico, el plan de intervención y/o la fase del proceso clínico.',
            parameters: {
                type: 'object',
                properties: {
                    patientId: { type: 'number', description: 'ID del paciente' },
                    analisisPruebas: { type: 'string', description: 'Análisis de resultados de pruebas (opcional)' },
                    perfilClinico: { type: 'string', description: 'Perfil clínico (opcional)' },
                    planIntervencion: { type: 'string', description: 'Plan de intervención (opcional)' },
                    faseProceso: { type: 'string', enum: FASES_PROCESO, description: 'Fase actual del proceso clínico (opcional)' }
                },
                required: ['patientId']
            }
        }
    ]
}];

// ============================================================
// EJECUCIÓN DE HERRAMIENTAS
// ============================================================
async function executeTool(name, args) {
    try {
        switch (name) {

            case 'buscar_paciente': {
                const pacientes = await prisma.patient.findMany({
                    where: { nombre: { contains: args.nombre, mode: 'insensitive' } },
                    select: { id: true, nombre: true, estado: true, telefono: true, edad: true },
                    take: 5
                });
                if (pacientes.length === 0) return { error: `No se encontró ningún paciente con ese nombre: "${args.nombre}"` };
                return { pacientes };
            }

            case 'crear_cita': {
                const cita = await prisma.appointment.create({
                    data: {
                        nombrePaciente: args.nombrePaciente,
                        telefono: args.telefono,
                        email: args.email || '',
                        fechaHora: new Date(args.fechaHora),
                        motivo: args.motivo || '',
                        estado: 'Pendiente'
                    }
                });
                return { success: true, id: cita.id, mensaje: `Cita creada para ${args.nombrePaciente} el ${new Date(args.fechaHora).toLocaleString('es-NI')}` };
            }

            case 'actualizar_estado_cita': {
                const citas = await prisma.appointment.findMany({
                    where: { nombrePaciente: { contains: args.nombrePaciente, mode: 'insensitive' } },
                    orderBy: { fechaHora: 'asc' },
                    take: 1
                });
                if (citas.length === 0) return { error: `No se encontró cita para "${args.nombrePaciente}"` };
                await prisma.appointment.update({
                    where: { id: citas[0].id },
                    data: { estado: args.estado }
                });
                return { success: true, mensaje: `Cita de ${args.nombrePaciente} actualizada a: ${args.estado}` };
            }

            case 'registrar_sesion': {
                const sesion = await prisma.session.create({
                    data: {
                        patientId: args.patientId,
                        patientName: args.patientName,
                        fecha: args.fecha ? new Date(args.fecha) : new Date(),
                        tipo: args.tipo,
                        notaSubjetiva: args.nota,
                        pago: args.pago || 0,
                        estadoPago: args.estadoPago || 'Pendiente'
                    }
                });
                return { success: true, id: sesion.id, mensaje: `Sesión de ${args.tipo} registrada para ${args.patientName}` };
            }

            case 'crear_paciente': {
                const paciente = await prisma.patient.create({
                    data: {
                        nombre: args.nombre,
                        telefono: args.telefono,
                        edad: args.edad || 0,
                        motivo: args.motivo || '',
                        estado: 'Activo'
                    }
                });
                return { success: true, id: paciente.id, mensaje: `Paciente "${args.nombre}" registrado con ID ${paciente.id}` };
            }

            case 'agregar_meta_terapeutica': {
                const meta = await prisma.therapeuticGoal.create({
                    data: {
                        patientId: args.patientId,
                        titulo: args.titulo,
                        descripcion: args.descripcion,
                        estado: 'Pendiente',
                        progreso: 0,
                        fechaInicio: new Date(),
                        fechaLimite: args.fechaLimite ? new Date(args.fechaLimite) : null
                    }
                });
                return { success: true, id: meta.id, mensaje: `Meta terapéutica "${args.titulo}" agregada correctamente` };
            }

            case 'ver_paciente': {
                const paciente = await prisma.patient.findUnique({
                    where: { id: args.patientId },
                    include: {
                        sessions: { orderBy: { fecha: 'desc' }, take: 10 },
                        therapeuticGoals: { where: { estado: { in: ['Pendiente', 'EnProgreso'] } } },
                        invoices: { where: { estado: { in: ['Pendiente', 'Vencida'] } }, take: 5 },
                        assessments: { orderBy: { id: 'desc' }, take: 3 }
                    }
                });
                if (!paciente) return { error: 'Paciente no encontrado' };
                return {
                    paciente: paciente.nombre,
                    estado: paciente.estado,
                    edad: paciente.edad,
                    totalSesiones: paciente.sessions.length,
                    ultimaSesion: paciente.sessions[0]?.fecha,
                    metasActivas: paciente.therapeuticGoals.length,
                    facturasVencidas: paciente.invoices.filter(i => i.estado === 'Vencida').length,
                    evaluaciones: paciente.assessments.map(a => `${a.tipo}: ${a.puntaje}pts (${a.interpretacion})`)
                };
            }

            case 'consultar_base_conocimiento': {
                const results = await rag.retrieve(args.consulta, 5);
                if (results.length === 0) return { resultados: [], nota: 'No se encontró información relevante en la base de conocimiento.' };
                return {
                    resultados: results.map(r => ({ documento: r.title, seccion: r.section, contenido: r.text }))
                };
            }

            case 'generar_documento': {
                const patient = await prisma.patient.findUnique({
                    where: { id: args.patientId },
                    include: { clinicalRecord: true, therapeuticGoals: { orderBy: { fechaInicio: 'asc' } } }
                });
                if (!patient) return { error: 'Paciente no encontrado' };
                const doc = generateDocument(args.tipo, patient);
                return {
                    success: true,
                    titulo: doc.titulo,
                    paciente: patient.nombre,
                    documento: doc.texto,
                    nota: 'El documento también puede descargarse en PDF desde la pestaña "Documentos" del expediente.'
                };
            }

            case 'actualizar_plan_clinico': {
                const patientId = args.patientId;
                const crData = {};
                if (args.analisisPruebas !== undefined) crData.analisisPruebas = args.analisisPruebas;
                if (args.perfilClinico !== undefined) crData.perfilClinico = args.perfilClinico;
                if (args.planIntervencion !== undefined) crData.planIntervencion = args.planIntervencion;

                if (Object.keys(crData).length > 0) {
                    await prisma.clinicalRecord.upsert({
                        where: { patientId },
                        update: crData,
                        create: { patientId, ...crData }
                    });
                }
                if (args.faseProceso) {
                    if (!FASES_PROCESO.includes(args.faseProceso)) return { error: `Fase inválida. Use una de: ${FASES_PROCESO.join(', ')}` };
                    await prisma.patient.update({ where: { id: patientId }, data: { faseProceso: args.faseProceso } });
                }
                return { success: true, mensaje: 'Expediente clínico actualizado.' };
            }

            default:
                return { error: `Herramienta desconocida: ${name}` };
        }
    } catch (err) {
        logger.error(`Tool execution error [${name}]`, err);
        return { error: `Error al ejecutar ${name}: ${err.message}` };
    }
}

// ============================================================
// CONTEXTO DIARIO
// ============================================================
async function buildDailyContext() {
    const ahora = new Date();
    const inicioHoy = new Date(ahora); inicioHoy.setHours(0, 0, 0, 0);
    const finHoy = new Date(ahora); finHoy.setHours(23, 59, 59, 999);

    const [citasHoy, citasPendientes, pacientesActivos, facturasVencidas, sesionesHoy] = await Promise.all([
        prisma.appointment.findMany({
            where: { fechaHora: { gte: inicioHoy, lte: finHoy } },
            orderBy: { fechaHora: 'asc' }
        }),
        prisma.appointment.findMany({
            where: { estado: 'Pendiente', fechaHora: { gte: ahora } },
            orderBy: { fechaHora: 'asc' }, take: 5
        }),
        prisma.patient.count({ where: { estado: 'Activo' } }),
        prisma.invoice.count({ where: { estado: 'Vencida' } }),
        prisma.session.findMany({
            where: { fecha: { gte: inicioHoy, lte: finHoy } },
            include: { patient: { select: { nombre: true } } }
        })
    ]);

    const fechaStr = ahora.toLocaleDateString('es-NI', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    let ctx = `=== HOY: ${fechaStr} ===\n`;
    ctx += `Pacientes activos: ${pacientesActivos} | Facturas vencidas: ${facturasVencidas}\n\n`;

    ctx += `CITAS HOY (${citasHoy.length}):\n`;
    if (citasHoy.length === 0) ctx += '  Ninguna.\n';
    else citasHoy.forEach(c => {
        const hora = new Date(c.fechaHora).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' });
        ctx += `  ${hora} — ${c.nombrePaciente} [${c.estado}] ${c.motivo ? '(' + c.motivo + ')' : ''}\n`;
    });

    ctx += `\nSESIONES REGISTRADAS HOY (${sesionesHoy.length}):\n`;
    if (sesionesHoy.length === 0) ctx += '  Ninguna registrada.\n';
    else sesionesHoy.forEach(s => ctx += `  • ${s.patient.nombre} — ${s.tipo} — ${s.estadoPago}\n`);

    ctx += `\nSOLICITUDES PENDIENTES (${citasPendientes.length}):\n`;
    if (citasPendientes.length === 0) ctx += '  Ninguna.\n';
    else citasPendientes.forEach(c => {
        const fecha = new Date(c.fechaHora).toLocaleString('es-NI', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        ctx += `  • ${c.nombrePaciente} — ${fecha} — Tel: ${c.telefono}\n`;
    });

    return ctx;
}

const SYSTEM_PROMPT = `Eres Isabel, la secretaria y asistente personal inteligente de la Lic. Esmirna García, psicóloga clínica.
Eres su Jarvis: eficiente, discreta, proactiva y profesional.

CAPACIDADES:
- Leer y reportar: citas, sesiones, pacientes, facturas, metas terapéuticas
- CREAR citas nuevas con pacientes
- REGISTRAR sesiones terapéuticas (incluyendo notas clínicas y pago)
- CREAR nuevos pacientes en el sistema
- ACTUALIZAR estado de citas (confirmar, cancelar)
- AGREGAR metas terapéuticas a pacientes
- VER historial completo de un paciente
- CONOCES el proceso clínico del consultorio, la estructura del expediente y las plantillas (consulta_base_conocimiento)
- GENERAR documentos clínicos por paciente (generar_documento)
- ACTUALIZAR el perfil clínico, plan de intervención y fase del proceso (actualizar_plan_clinico)

PROCESO CLÍNICO DE LA LIC. ESMIRNA (úsalo para orientar "qué sigue"):
1) Paciente nuevo → Primera sesión: entrevista, historia clínica, consentimiento, motivo de consulta, antecedentes; si hay tiempo, pruebas iniciales.
2) Segunda sesión: continuar entrevista y aplicar pruebas.
3) Procesamiento de resultados → 4) Triangulación → 5) Perfil clínico → 6) Plan de intervención (objetivos jerárquicos).
7) Tercera sesión: devolución de resultados, perfil y plan, acuerdos.
8) Intervención por objetivos (cada sesión va en "Registro de sesiones" siguiendo el plan).
9) Alta. Tras el alta, las sesiones de mantenimiento son "Sesiones de seguimiento" (categoría Seguimiento), separadas del registro.

FLUJO CUANDO TE PIDAN HACER ALGO:
1. Si necesitas el ID de un paciente, primero usa buscar_paciente
2. Si te preguntan por el proceso, protocolos o plantillas, usa consultar_base_conocimiento ANTES de responder
3. Luego ejecuta la acción correspondiente
4. Confirma lo que hiciste de forma clara y concisa

REGLAS:
- Cuando respondas sobre el proceso o las plantillas, apóyate en la base de conocimiento; no inventes honorarios, duraciones ni pasos.
- Siempre confirma las acciones importantes antes de ejecutarlas si hay ambigüedad en datos críticos (fecha, nombre exacto)
- Si falta información esencial, pregúntala de forma concisa
- Responde siempre en español
- Sé breve y directa — como una secretaria eficiente
- Cuando saludes, resume el día en máximo 3 puntos clave`;

// ============================================================
// ENDPOINT PRINCIPAL
// ============================================================
router.post('/chat', authenticateToken, async (req, res) => {
    try {
        const { message, history = [] } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Mensaje inválido' });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(503).json({ error: 'GEMINI_API_KEY no configurada' });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: GEMINI_MODEL,
            systemInstruction: SYSTEM_PROMPT,
            tools: TOOLS
        });

        const dailyContext = await buildDailyContext();

        // Convertir historial al formato de Gemini
        const geminiHistory = [];
        // Primer mensaje del sistema con contexto del día
        if (history.length === 0) {
            geminiHistory.push({
                role: 'user',
                parts: [{ text: `Contexto actual:\n${dailyContext}` }]
            });
            geminiHistory.push({
                role: 'model',
                parts: [{ text: 'Contexto recibido. Lista para ayudarte.' }]
            });
        }

        // Historial de conversación
        for (const msg of history) {
            geminiHistory.push({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            });
        }

        const chat = model.startChat({ history: geminiHistory });

        // RAG: recuperar conocimiento relevante (proceso, protocolos, plantillas)
        // y fundamentar la respuesta sin contaminar el historial mostrado al usuario.
        let groundedMessage = message;
        try {
            const contexto = await rag.buildContext(message, 4);
            if (contexto) {
                groundedMessage = `${message}\n\n[CONOCIMIENTO DEL CONSULTORIO — base para tu respuesta cuando sea pertinente; no lo cites textualmente]\n${contexto}`;
            }
        } catch (err) {
            logger.warn?.(`RAG context: ${err.message}`);
        }

        let result = await chat.sendMessage(groundedMessage);

        // Loop de function calling — Gemini puede llamar múltiples herramientas
        let iterations = 0;
        while (iterations < 5) {
            iterations++;
            const functionCalls = result.response.functionCalls();
            if (!functionCalls || functionCalls.length === 0) break;

            // Ejecutar todas las herramientas que pidió
            const toolResponses = [];
            for (const call of functionCalls) {
                logger.info(`Agent tool call: ${call.name}`, call.args);
                const toolResult = await executeTool(call.name, call.args);
                toolResponses.push({
                    functionResponse: {
                        name: call.name,
                        response: toolResult
                    }
                });
            }

            // Devolver resultados a Gemini para que formule la respuesta
            result = await chat.sendMessage(toolResponses);
        }

        const reply = result.response.text();
        res.json({ reply });

    } catch (err) {
        logger.error('POST /api/agent/chat', err);
        // Endpoint solo para admin autenticado: devolvemos el detalle real del
        // error (modelo retirado, cuota, etc.) para poder diagnosticar.
        res.status(500).json({
            error: 'Error al procesar tu mensaje. Intenta de nuevo.',
            detail: err?.message || String(err),
            modelo: GEMINI_MODEL
        });
    }
});

export default router;
