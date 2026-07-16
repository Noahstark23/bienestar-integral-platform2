import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from './prisma.js';
import logger from './logger.js';

// ============================================================
// BÚSQUEDA SEMÁNTICA SOBRE EXPEDIENTES DE PACIENTES (asistente Isabel)
// ------------------------------------------------------------
// Complementa al RAG de base de conocimiento (server/lib/rag.js, que indexa
// los documentos estáticos del consultorio). Aquí indexamos el contenido
// clínico REAL de cada paciente —notas SOAP, expedientes, metas, evaluaciones
// y motivos de consulta— con embeddings de Gemini guardados en la tabla
// NoteEmbedding, y recuperamos por similitud de coseno.
// Para la escala de un consultorio basta calcular la similitud en memoria;
// a mayor volumen se puede migrar a pgvector sin cambiar esta interfaz.
// ============================================================

const EMBEDDING_MODEL = 'text-embedding-004';
const MAX_CONTENT_CHARS = 4000;

let warnedNoKey = false;

function getModel() {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === 'your_api_key_here') {
        if (!warnedNoKey) {
            logger.warn('Búsqueda semántica inactiva: GEMINI_API_KEY no configurada');
            warnedNoKey = true;
        }
        return null;
    }
    const genAI = new GoogleGenerativeAI(key);
    return genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
}

/**
 * Genera el embedding de un texto.
 * @param {string} text
 * @param {'RETRIEVAL_DOCUMENT'|'RETRIEVAL_QUERY'} taskType
 * @returns {Promise<number[]>}
 */
export async function embedText(text, taskType = 'RETRIEVAL_DOCUMENT') {
    const model = getModel();
    if (!model) throw new Error('GEMINI_API_KEY no configurada');
    const result = await model.embedContent({
        content: { role: 'user', parts: [{ text: String(text).slice(0, MAX_CONTENT_CHARS) }] },
        taskType,
    });
    return result.embedding.values;
}

function cosineSim(a, b) {
    if (!a || !b) return 0;
    let dot = 0, na = 0, nb = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    if (na === 0 || nb === 0) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Inserta o actualiza un documento indexado. No-op si el contenido está vacío
 * o si no cambió respecto a lo ya indexado (evita re-embeddear sin necesidad).
 */
export async function indexDocument({ sourceType, sourceId, patientId, patientName = '', fecha = new Date(), content }) {
    try {
        const clean = (content || '').trim();
        if (!clean) {
            await prisma.noteEmbedding.deleteMany({ where: { sourceType, sourceId } });
            return { skipped: 'empty' };
        }
        const contentHash = crypto.createHash('sha256').update(clean).digest('hex');
        const existing = await prisma.noteEmbedding.findUnique({
            where: { sourceType_sourceId: { sourceType, sourceId } },
            select: { contentHash: true },
        });
        if (existing && existing.contentHash === contentHash) return { skipped: 'unchanged' };

        const embedding = await embedText(clean, 'RETRIEVAL_DOCUMENT');
        const data = {
            sourceType,
            sourceId,
            patientId,
            patientName: patientName || '',
            fecha: fecha ? new Date(fecha) : new Date(),
            content: clean.slice(0, MAX_CONTENT_CHARS),
            contentHash,
            embedding,
        };
        await prisma.noteEmbedding.upsert({
            where: { sourceType_sourceId: { sourceType, sourceId } },
            create: data,
            update: data,
        });
        return { indexed: true };
    } catch (err) {
        logger.error(`Búsqueda semántica indexDocument [${sourceType}#${sourceId}]`, err);
        return { error: err.message };
    }
}

export async function removeDocument(sourceType, sourceId) {
    try {
        await prisma.noteEmbedding.deleteMany({ where: { sourceType, sourceId } });
    } catch (err) {
        logger.error(`Búsqueda semántica removeDocument [${sourceType}#${sourceId}]`, err);
    }
}

// ---- Constructores de contenido indexable por tipo ----
function sessionContent(s) {
    return [
        s.tipo ? `Tipo de sesión: ${s.tipo}` : '',
        s.notaSubjetiva ? `Subjetivo (lo que dice el paciente): ${s.notaSubjetiva}` : '',
        s.notaObjetiva ? `Objetivo (observaciones): ${s.notaObjetiva}` : '',
        s.notaAnalisis ? `Análisis clínico: ${s.notaAnalisis}` : '',
        s.notaPlan ? `Plan de tratamiento: ${s.notaPlan}` : '',
        s.resumen ? `Resumen: ${s.resumen}` : '',
    ].filter(Boolean).join('\n');
}
function goalContent(g) {
    return [
        g.titulo ? `Meta terapéutica: ${g.titulo}` : '',
        g.descripcion ? `Descripción: ${g.descripcion}` : '',
        g.notas ? `Notas: ${g.notas}` : '',
    ].filter(Boolean).join('\n');
}
function assessmentContent(a) {
    return [
        a.tipo ? `Evaluación aplicada: ${a.tipo}` : '',
        (a.puntaje != null) ? `Puntaje: ${a.puntaje}` : '',
        a.interpretacion ? `Interpretación: ${a.interpretacion}` : '',
        a.notas ? `Notas: ${a.notas}` : '',
    ].filter(Boolean).join('\n');
}
function patientContent(p) {
    return [
        p.motivo ? `Motivo de consulta: ${p.motivo}` : '',
        p.remision ? `Remisión / referente: ${p.remision}` : '',
        p.ocupacion ? `Ocupación: ${p.ocupacion}` : '',
        p.escolaridad ? `Escolaridad: ${p.escolaridad}` : '',
        p.estadoCivil ? `Estado civil: ${p.estadoCivil}` : '',
        p.motivoAlta ? `Motivo de alta: ${p.motivoAlta}` : '',
    ].filter(Boolean).join('\n');
}
function clinicalRecordContent(cr) {
    return [
        cr.diagnostico ? `Diagnóstico: ${cr.diagnostico}` : '',
        cr.perfilClinico ? `Perfil clínico: ${cr.perfilClinico}` : '',
        cr.planIntervencion ? `Plan de intervención: ${cr.planIntervencion}` : '',
        cr.analisisPruebas ? `Análisis de pruebas: ${cr.analisisPruebas}` : '',
        cr.antecedentesMedicos ? `Antecedentes médicos: ${cr.antecedentesMedicos}` : '',
        cr.antecedentesFamiliares ? `Antecedentes familiares: ${cr.antecedentesFamiliares}` : '',
        cr.historiaDesarrollo ? `Historia del desarrollo: ${cr.historiaDesarrollo}` : '',
    ].filter(Boolean).join('\n');
}

// Resuelve el nombre del paciente cuando la fila de origen no lo trae
// denormalizado (metas, evaluaciones, expedientes), para mostrarlo en los
// resultados de búsqueda en vez de un id.
async function resolvePatientName(patientId, existing = '') {
    if (existing) return existing;
    if (!patientId) return '';
    const p = await prisma.patient.findUnique({ where: { id: patientId }, select: { nombre: true } });
    return p?.nombre || '';
}

// ---- Helpers tipados: reciben la fila de Prisma y la indexan ----
export function indexSession(s) {
    if (!s?.id) return Promise.resolve({ skipped: 'no-id' });
    return indexDocument({
        sourceType: 'session', sourceId: s.id, patientId: s.patientId,
        patientName: s.patientName || '', fecha: s.fecha || s.createdAt,
        content: sessionContent(s),
    });
}
export async function indexGoal(g) {
    if (!g?.id) return { skipped: 'no-id' };
    return indexDocument({
        sourceType: 'goal', sourceId: g.id, patientId: g.patientId,
        patientName: await resolvePatientName(g.patientId, g.patientName),
        fecha: g.fechaInicio || g.createdAt,
        content: goalContent(g),
    });
}
export async function indexAssessment(a) {
    if (!a?.id) return { skipped: 'no-id' };
    return indexDocument({
        sourceType: 'assessment', sourceId: a.id, patientId: a.patientId,
        patientName: await resolvePatientName(a.patientId, a.patientName),
        fecha: a.fecha || a.createdAt,
        content: assessmentContent(a),
    });
}
export function indexPatient(p) {
    if (!p?.id) return Promise.resolve({ skipped: 'no-id' });
    return indexDocument({
        sourceType: 'patient', sourceId: p.id, patientId: p.id,
        patientName: p.nombre || '', fecha: p.createdAt,
        content: patientContent(p),
    });
}
export async function indexClinicalRecord(cr) {
    if (!cr?.id) return { skipped: 'no-id' };
    return indexDocument({
        sourceType: 'clinical_record', sourceId: cr.id, patientId: cr.patientId,
        patientName: await resolvePatientName(cr.patientId, cr.patientName),
        fecha: cr.updatedAt || cr.createdAt,
        content: clinicalRecordContent(cr),
    });
}

/**
 * Búsqueda semántica. Embeddea la consulta y calcula similitud de coseno
 * contra los embeddings guardados (opcionalmente filtrados por paciente).
 * @returns {Promise<Array<{sourceType,sourceId,patientId,patientName,fecha,content,score}>>}
 */
export async function search({ query, patientId = null, limit = 5 }) {
    const clean = (query || '').trim();
    if (!clean) return [];
    const queryVec = await embedText(clean, 'RETRIEVAL_QUERY');
    const rows = await prisma.noteEmbedding.findMany({
        where: patientId ? { patientId } : {},
    });
    const scored = rows.map(r => ({
        sourceType: r.sourceType,
        sourceId: r.sourceId,
        patientId: r.patientId,
        patientName: r.patientName,
        fecha: r.fecha,
        content: r.content,
        score: cosineSim(queryVec, r.embedding),
    }));
    scored.sort((x, y) => y.score - x.score);
    return scored.slice(0, Math.max(1, Math.min(limit, 20)));
}

/**
 * Reindexa TODO el contenido clínico existente (backfill). Secuencial para no
 * saturar la API de embeddings; idempotente gracias al hash de contenido.
 */
export async function reindexAll({ onProgress } = {}) {
    const stats = { patient: 0, clinical_record: 0, session: 0, goal: 0, assessment: 0, errors: 0 };
    const bump = (t, r) => { if (r?.indexed) stats[t]++; if (r?.error) stats.errors++; };

    const patients = await prisma.patient.findMany();
    for (const p of patients) bump('patient', await indexPatient(p));
    onProgress?.(`Pacientes indexados: ${stats.patient}/${patients.length}`);

    const records = await prisma.clinicalRecord.findMany();
    for (const cr of records) bump('clinical_record', await indexClinicalRecord(cr));
    onProgress?.(`Expedientes indexados: ${stats.clinical_record}/${records.length}`);

    const sessions = await prisma.session.findMany();
    for (const s of sessions) bump('session', await indexSession(s));
    onProgress?.(`Sesiones indexadas: ${stats.session}/${sessions.length}`);

    const goals = await prisma.therapeuticGoal.findMany();
    for (const g of goals) bump('goal', await indexGoal(g));
    onProgress?.(`Metas indexadas: ${stats.goal}/${goals.length}`);

    const assessments = await prisma.assessment.findMany();
    for (const a of assessments) bump('assessment', await indexAssessment(a));
    onProgress?.(`Evaluaciones indexadas: ${stats.assessment}/${assessments.length}`);

    return stats;
}
