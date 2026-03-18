import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAvailability() {
    console.log('🌱 Seeding default availability slots...');

    // Horario por defecto: Lunes-Viernes 8:00-12:00 y 13:00-17:00, Sábado 8:00-12:00
    const defaultSlots = [
        // Lunes
        { dayOfWeek: 1, startTime: '08:00', endTime: '12:00' },
        { dayOfWeek: 1, startTime: '13:00', endTime: '17:00' },
        // Martes
        { dayOfWeek: 2, startTime: '08:00', endTime: '12:00' },
        { dayOfWeek: 2, startTime: '13:00', endTime: '17:00' },
        // Miércoles
        { dayOfWeek: 3, startTime: '08:00', endTime: '12:00' },
        { dayOfWeek: 3, startTime: '13:00', endTime: '17:00' },
        // Jueves
        { dayOfWeek: 4, startTime: '08:00', endTime: '12:00' },
        { dayOfWeek: 4, startTime: '13:00', endTime: '17:00' },
        // Viernes
        { dayOfWeek: 5, startTime: '08:00', endTime: '12:00' },
        { dayOfWeek: 5, startTime: '13:00', endTime: '17:00' },
        // Sábado
        { dayOfWeek: 6, startTime: '08:00', endTime: '12:00' },
    ];

    for (const slot of defaultSlots) {
        await prisma.availabilitySlot.create({
            data: slot
        });
        console.log(`✅ Created slot: Day ${slot.dayOfWeek} (${slot.startTime}-${slot.endTime})`);
    }

    console.log('✨ Seed completed!');
}

seedAvailability()
    .catch((e) => {
        console.error('Error seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
