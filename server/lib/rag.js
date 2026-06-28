// ============================================================
// RAG — Retrieval Augmented Generation
// Base de conocimiento del proceso clínico + plantillas + protocolos.
// Embeddings con Gemini (text-embedding-004), índice JSON en memoria con caché
// en disco y *fallback* por palabras clave cuando no hay API key.
// ============================================================
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KNOWLEDGE_DIR = path.join(__dirname, '..', 'knowledge');
const CACHE_FILE = path.join(KNOWLEDGE_DIR, '.rag-index.json');
const EMBED_MODEL = 'text-embedding-004';

// Estado en memoria
let index = [];          // [{ id, source, title, section, text, embedding }]
let indexHasEmbeddings = false;
let ready = false;
let building = null;      // Promise en curso para evitar builds concurrentes

// ─── Utilidades ──────────────────────────────────────────────

function listKnowledgeFiles() {
    if (!fs.existsSync(KNOWLEDGE_DIR)) return [];
    return fs.readdirSync(KNOWLEDGE_DIR)
        .filter(f => f.toLowerCase().endsWith('.md'))
        .sort()
        .map(f => path.join(KNOWLEDGE_DIR, f));
}

// Trocea un documento markdown por secciones de nivel 2 (## ).
// Las subsecciones (### ) se mantienen dentro de su sección padre.
function chunkMarkdown(filePath) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const source = path.basename(filePath);
    const lines = raw.split(/\r?\n/);

    let docTitle = source.replace(/\.md$/i, '');
    const titleLine = lines.find(l => /^#\s+/.test(l));
    if (titleLine) docTitle = titleLine.replace(/^#\s+/, '').trim();

    const chunks = [];
    let current = null;
    const flush = () => {
        if (current && current.body.trim()) {
            chunks.push({
                source,
                title: docTitle,
                section: current.section,
                text: `${docTitle} — ${current.section}\n${current.body.trim()}`,
            });
        }
    };

    for (const line of lines) {
        if (/^#\s+/.test(line)) continue;            // título del doc, ya capturado
        if (/^##\s+/.test(line)) {                   // nueva sección
            flush();
            current = { section: line.replace(/^##\s+/, '').trim(), body: '' };
        } else {
            if (!current) current = { section: 'General', body: '' };
            current.body += line + '\n';
        }
    }
    flush();

    // Documentos sin secciones ## : un solo chunk con todo el cuerpo
    if (chunks.length === 0 && raw.trim()) {
        chunks.push({ source, title: docTitle, section: 'General', text: raw.trim() });
    }
    return chunks;
}

function loadAllChunks() {
    const files = listKnowledgeFiles();
    const all = [];
    for (const f of files) {
        for (const c of chunkMarkdown(f)) {
            all.push({ id: `${c.source}#${all.length}`, ...c });
        }
    }
    return all;
}

function corpusHash(chunks) {
    const h = crypto.createHash('sha256');
    for (const c of chunks) h.update(c.id + ' ' + c.text + ' ');
    h.update('model:' + EMBED_MODEL);
    return h.digest('hex');
}

function cosine(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    if (na === 0 || nb === 0) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// ─── Embeddings (Gemini) ─────────────────────────────────────

function embedderAvailable() {
    return !!process.env.GEMINI_API_KEY;
}

function getEmbedModel() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    return genAI.getGenerativeModel({ model: EMBED_MODEL });
}

async function embedText(text) {
    const model = getEmbedModel();
    const res = await model.embedContent(text);
    return res?.embedding?.values || null;
}

// Embebe en pequeños lotes para no saturar la API
async function embedChunks(chunks) {
    const model = getEmbedModel();
    const CONCURRENCY = 4;
    let ok = 0;
    for (let i = 0; i < chunks.length; i += CONCURRENCY) {
        const batch = chunks.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map(async (c) => {
            try {
                const res = await model.embedContent(c.text);
                c.embedding = res?.embedding?.values || null;
                if (c.embedding) ok++;
            } catch (err) {
                logger.warn?.(`RAG: error embebiendo chunk ${c.id}: ${err.message}`);
                c.embedding = null;
            }
        }));
    }
    return ok;
}

// ─── Caché en disco ──────────────────────────────────────────

function loadCache(expectedHash) {
    try {
        if (!fs.existsSync(CACHE_FILE)) return null;
        const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
        if (data.hash !== expectedHash) return null;
        return data;
    } catch {
        return null;
    }
}

function saveCache(hash, chunks, hasEmbeddings) {
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify({
            hash,
            model: EMBED_MODEL,
            hasEmbeddings,
            builtAt: new Date().toISOString(),
            chunks,
        }));
    } catch (err) {
        logger.warn?.(`RAG: no se pudo escribir caché: ${err.message}`);
    }
}

// ─── Inicialización / construcción del índice ────────────────

async function build({ force = false } = {}) {
    const chunks = loadAllChunks();
    if (chunks.length === 0) {
        logger.warn?.('RAG: no se encontraron documentos en server/knowledge');
        index = [];
        indexHasEmbeddings = false;
        ready = true;
        return;
    }

    const hash = corpusHash(chunks);

    // 1) Intentar caché
    if (!force) {
        const cached = loadCache(hash);
        if (cached) {
            index = cached.chunks;
            indexHasEmbeddings = !!cached.hasEmbeddings;
            ready = true;
            logger.info(`RAG: índice cargado de caché (${index.length} fragmentos, embeddings=${indexHasEmbeddings})`);
            return;
        }
    }

    // 2) Construir embeddings si hay API key
    if (embedderAvailable()) {
        try {
            const ok = await embedChunks(chunks);
            indexHasEmbeddings = ok > 0;
            logger.info(`RAG: embeddings generados ${ok}/${chunks.length}`);
        } catch (err) {
            logger.error(`RAG: fallo generando embeddings, se usará búsqueda por palabras clave: ${err.message}`);
            indexHasEmbeddings = false;
        }
    } else {
        indexHasEmbeddings = false;
        logger.info('RAG: sin GEMINI_API_KEY — modo búsqueda por palabras clave');
    }

    index = chunks;
    ready = true;
    saveCache(hash, chunks, indexHasEmbeddings);
}

async function ensureReady() {
    if (ready) return;
    if (!building) building = build().finally(() => { building = null; });
    await building;
}

// ─── Búsqueda por palabras clave (fallback) ──────────────────

const STOPWORDS = new Set(['de','la','el','los','las','un','una','y','o','a','en','que','del','con','por','para','se','su','sus','al','lo','es','como','más','sobre','cada','ya','no','si','le','les','este','esta','estos','estas']);

function tokenize(s) {
    return (s || '')
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9ñ\s]/g, ' ')
        .split(/\s+/)
        .filter(t => t.length > 2 && !STOPWORDS.has(t));
}

function keywordScore(queryTokens, text) {
    const textTokens = tokenize(text);
    if (textTokens.length === 0) return 0;
    const set = new Set(textTokens);
    let hits = 0;
    for (const q of queryTokens) if (set.has(q)) hits++;
    return hits / Math.sqrt(queryTokens.length || 1);
}

// ─── API pública ─────────────────────────────────────────────

/**
 * Recupera los fragmentos más relevantes de la base de conocimiento.
 * @param {string} query
 * @param {number} k
 * @returns {Promise<Array<{source,title,section,text,score}>>}
 */
export async function retrieve(query, k = 4) {
    await ensureReady();
    if (!query || index.length === 0) return [];

    // Vía embeddings
    if (indexHasEmbeddings && embedderAvailable()) {
        try {
            const qv = await embedText(query);
            if (qv) {
                return index
                    .filter(c => Array.isArray(c.embedding))
                    .map(c => ({ ...c, score: cosine(qv, c.embedding) }))
                    .sort((a, b) => b.score - a.score)
                    .slice(0, k)
                    .map(({ embedding, ...rest }) => rest);
            }
        } catch (err) {
            logger.warn?.(`RAG: error en búsqueda semántica, uso palabras clave: ${err.message}`);
        }
    }

    // Fallback: palabras clave
    const qTokens = tokenize(query);
    return index
        .map(c => ({ ...c, score: keywordScore(qTokens, c.text) }))
        .filter(c => c.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, k)
        .map(({ embedding, ...rest }) => rest);
}

/**
 * Construye un bloque de contexto listo para inyectar en el prompt del LLM.
 */
export async function buildContext(query, k = 4) {
    const hits = await retrieve(query, k);
    if (hits.length === 0) return '';
    return hits
        .map((h, i) => `[Fuente ${i + 1}: ${h.title} › ${h.section}]\n${h.text}`)
        .join('\n\n---\n\n');
}

export async function reindex() {
    ready = false;
    await build({ force: true });
    return getStatus();
}

export async function getStatus() {
    await ensureReady();
    const bySource = {};
    for (const c of index) bySource[c.source] = (bySource[c.source] || 0) + 1;
    return {
        ready,
        chunks: index.length,
        hasEmbeddings: indexHasEmbeddings,
        mode: indexHasEmbeddings ? 'semantic' : 'keyword',
        model: EMBED_MODEL,
        sources: bySource,
    };
}

// Pre-calienta el índice al arrancar (sin bloquear el arranque del servidor)
export function warmup() {
    ensureReady().catch(err => logger.error(`RAG warmup: ${err.message}`));
}

export default { retrieve, buildContext, reindex, getStatus, warmup };
