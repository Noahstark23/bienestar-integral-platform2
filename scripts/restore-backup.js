// ============================================================
// Restauración de un respaldo generado por el sistema
// Uso (con DATABASE_URL apuntando a la base destino):
//   node scripts/restore-backup.js respaldo-bienestar-2026-07-15.json.gz --yes
//
// ⚠️  BORRA los datos actuales de la base y los reemplaza por los del respaldo.
//     Úsalo solo para recuperación de desastres o migración de servidor.
// ============================================================
import fs from 'fs';
import zlib from 'zlib';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Orden padres→hijos (insertar); se borra en orden inverso.
// Cada entrada: [propiedad prisma, nombre de tabla SQL]
const TABLES = [
    ['user', 'User'], ['patient', 'Patient'], ['clinicalRecord', 'ClinicalRecord'],
    ['patientFile', 'PatientFile'], ['therapeuticGoal', 'TherapeuticGoal'],
    ['expense', 'Expense'], ['appointment', 'Appointment'], ['availabilitySlot', 'AvailabilitySlot'],
    ['workshop', 'Workshop'], ['telmedAvailability', 'TelmedAvailability'],
    ['session', 'Session'], ['sessionPackage', 'SessionPackage'], ['assessment', 'Assessment'],
    ['virtualSession', 'VirtualSession'], ['workshopEnrollment', 'WorkshopEnrollment'],
    ['workshopWaitlist', 'WorkshopWaitlist'],
    ['invoice', 'Invoice'], ['invoiceSession', 'InvoiceSession'], ['invoiceItem', 'InvoiceItem'],
    ['invoiceWorkshop', 'InvoiceWorkshop'], ['payment', 'Payment'],
    ['auditLog', 'AuditLog'],
];

async function main() {
    const [file, flag] = process.argv.slice(2);
    if (!file) {
        console.error('Uso: node scripts/restore-backup.js <respaldo.json.gz> --yes');
        process.exit(1);
    }
    if (flag !== '--yes') {
        console.error('⚠️  Esto BORRA los datos actuales y los reemplaza por el respaldo.');
        console.error('    Si estás seguro, vuelve a ejecutar agregando --yes');
        process.exit(1);
    }

    const raw = fs.readFileSync(file);
    const json = file.endsWith('.gz') ? zlib.gunzipSync(raw) : raw;
    const backup = JSON.parse(json.toString('utf8'));

    if (backup.formato !== 'bienestar-backup') {
        console.error('El archivo no parece un respaldo válido del sistema.');
        process.exit(1);
    }
    console.log(`Respaldo del ${backup.generadoEn} (adjuntos: ${backup.incluyeArchivos ? 'sí' : 'no'})`);

    // 1) Vaciar tablas (hijos primero)
    for (const [model] of [...TABLES].reverse()) {
        await prisma[model].deleteMany();
    }
    console.log('Tablas vaciadas.');

    // 2) Insertar datos del respaldo (padres primero)
    for (const [model] of TABLES) {
        let rows = backup.tablas[model] || [];
        if (model === 'patientFile') {
            if (!backup.incluyeArchivos) {
                console.log('  patientFile: el respaldo no incluye los archivos adjuntos, se omiten.');
                continue;
            }
            rows = rows.map(r => ({ ...r, data: Buffer.from(r.data, 'base64') }));
        }
        if (rows.length) await prisma[model].createMany({ data: rows });
        console.log(`  ${model}: ${rows.length} registros`);
    }

    // 3) Re-sincronizar las secuencias de IDs (para que los próximos inserts no choquen)
    for (const [, table] of TABLES) {
        await prisma.$executeRawUnsafe(
            `SELECT setval(pg_get_serial_sequence('"${table}"','id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1))`
        );
    }
    console.log('Secuencias re-sincronizadas.');
    console.log('✅ Restauración completa.');
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
