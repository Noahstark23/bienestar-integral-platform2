import 'dotenv/config';
import prisma from '../server/lib/prisma.js';
import { reindexAll } from '../server/lib/clinicalSearch.js';

// ============================================================
// Backfill de la búsqueda semántica: genera los embeddings de TODO el
// contenido clínico existente (pacientes, expedientes, sesiones, metas,
// evaluaciones) para que Isabel pueda buscar en ellos con buscar_en_notas.
// Uso: npm run notas:reindex   (o: node scripts/reindex-notas.js)
// Es idempotente: si un texto no cambió, no se vuelve a embeddear.
// ============================================================

async function main() {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_api_key_here') {
        console.error('❌ GEMINI_API_KEY no configurada. Añádela a tu .env antes de reindexar.');
        process.exit(1);
    }

    console.log('🔎 Indexando expedientes de pacientes para búsqueda semántica...\n');
    const start = Date.now();
    const stats = await reindexAll({ onProgress: msg => console.log('  • ' + msg) });
    const secs = ((Date.now() - start) / 1000).toFixed(1);

    console.log(`\n✅ Reindexado completo en ${secs}s:`);
    console.table(stats);
}

main()
    .catch(e => { console.error('❌ Error en el reindexado:', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
