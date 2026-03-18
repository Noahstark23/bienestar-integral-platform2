import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const username = 'lic.esmirna';
    const password = 'SecurePassword2026!'; // Strong password for production
    const nombre = 'Lic. Esmirna García';
    const rol = 'admin';

    console.log(`🔐 Generando credenciales para: ${username}`);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.upsert({
        where: { username },
        update: {
            passwordHash,
            nombre,
            rol
        },
        create: {
            username,
            passwordHash,
            nombre,
            rol
        }
    });

    console.log(`✅ Usuario administrador creado/actualizado: ${user.username}`);
    console.log(`🔑 Contraseña: ${password}`);
    console.log('⚠️  ¡Guarde esta contraseña en un lugar seguro!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
