import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Iniciando seed de la base de datos...');

    // Limpiar datos existentes (opcional, descomentar si necesitas resetear)
    // await prisma.session.deleteMany();
    // await prisma.patient.deleteMany();
    // await prisma.expense.deleteMany();

    // Crear pacientes
    const patient1 = await prisma.patient.create({
        data: {
            nombre: 'Juan Pérez',
            edad: 25,
            telefono: '8888-8888',
            motivo: 'Ansiedad Generalizada',
            createdAt: new Date('2023-10-15')
        }
    });

    const patient2 = await prisma.patient.create({
        data: {
            nombre: 'María González',
            edad: 32,
            telefono: '8899-7766',
            motivo: 'Terapia de Pareja',
            createdAt: new Date('2023-11-01')
        }
    });

    const patient3 = await prisma.patient.create({
        data: {
            nombre: 'Carlitos Ruiz',
            edad: 8,
            telefono: 'Madre: 8877-6655',
            motivo: 'Dificultad de Aprendizaje',
            createdAt: new Date('2024-01-10')
        }
    });

    console.log('✅ Pacientes creados');

    // Crear sesiones
    await prisma.session.createMany({
        data: [
            {
                patientId: patient1.id,
                fecha: new Date('2024-05-01'),
                notas: 'Paciente reporta mejoría en el sueño.',
                pago: 40,
                estadoPago: 'Pagado'
            },
            {
                patientId: patient2.id,
                fecha: new Date('2024-05-02'),
                notas: 'Sesión focalizada en comunicación asertiva.',
                pago: 50,
                estadoPago: 'Pagado'
            },
            {
                patientId: patient3.id,
                fecha: new Date('2024-05-03'),
                notas: 'Evaluación neuropsicológica inicial completa.',
                pago: 60,
                estadoPago: 'Pendiente'
            },
            {
                patientId: patient1.id,
                fecha: new Date('2024-05-10'),
                notas: 'Recaída leve por estrés laboral.',
                pago: 40,
                estadoPago: 'Pagado'
            },
            {
                patientId: patient2.id,
                fecha: new Date('2024-05-12'),
                notas: 'Cancelada por el paciente.',
                pago: 0,
                estadoPago: 'Pendiente'
            }
        ]
    });

    console.log('✅ Sesiones creadas');

    // Crear gastos
    await prisma.expense.createMany({
        data: [
            {
                concepto: 'Renta Consultorio Estelí',
                monto: 200,
                fecha: new Date('2024-05-01'),
                categoria: 'Fijo'
            },
            {
                concepto: 'Internet & Servicios',
                monto: 40,
                fecha: new Date('2024-05-05'),
                categoria: 'Fijo'
            },
            {
                concepto: 'Material Didáctico Niños',
                monto: 35,
                fecha: new Date('2024-05-10'),
                categoria: 'Variable'
            },
            {
                concepto: 'Publicidad Facebook',
                monto: 20,
                fecha: new Date('2024-05-15'),
                categoria: 'Variable'
            }
        ]
    });

    console.log('✅ Gastos creados');
    console.log('🎉 Seed completado exitosamente!');
}

main()
    .catch((e) => {
        console.error('❌ Error en seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
