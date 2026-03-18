const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🔐 Creando usuario administrador...');

    // Generar hash de la contraseña
    const password = 'bienestar2026'; // Cambiar esta contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // Crear usuario
    const user = await prisma.user.upsert({
        where: { username: 'lic.esmirna' },
        update: {},
        create: {
            username: 'lic.esmirna',
            passwordHash: passwordHash,
            nombre: 'Lic. Esmirna García',
            rol: 'admin'
        }
    });

    console.log('✅ Usuario creado:', user.username);
    console.log('📝 Nombre:', user.nombre);
    console.log('🔑 Password:', password);
    console.log('\n⚠️  IMPORTANTE: Cambia la contraseña en producción!\n');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
