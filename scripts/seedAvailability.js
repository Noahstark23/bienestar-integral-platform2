
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Verificando configuración de horarios...');

    const count = await prisma.availabilitySlot.count();

    if (count > 0) {
        console.log(`✅ Ya existen ${count} bloques de horario configurados. No se realizaron cambios.`);
        return;
    }

    console.log('⚠️ No se encontraron horarios. Creando horarios por defecto (Lunes a Viernes, 8:00 AM - 5:00 PM)...');

    // Create slots for Mon(1) to Fri(5)
    const defaultSlots = [];
    for (let day = 1; day <= 5; day++) {
        defaultSlots.push({
            dayOfWeek: day,
            startTime: '08:00',
            endTime: '12:00',
            isActive: true
        });
        defaultSlots.push({
            dayOfWeek: day,
            startTime: '13:00',
            endTime: '17:00',
            isActive: true
        });
    }

    // Add Saturday morning
    defaultSlots.push({
        dayOfWeek: 6,
        startTime: '08:00',
        endTime: '12:00',
        isActive: true
    });

    for (const slot of defaultSlots) {
        await prisma.availabilitySlot.create({ data: slot });
    }

    console.log('✅ Horarios por defecto creados exitosamente.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
