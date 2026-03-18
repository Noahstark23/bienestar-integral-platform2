import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const username = 'lic.esmirna';
  const password = 'Bienestar2024!';
  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    // Update password in case it was wrong
    await prisma.user.update({
      where: { username },
      data: { passwordHash }
    });
    console.log(`Usuario "${username}" actualizado.`);
  } else {
    await prisma.user.create({
      data: {
        username,
        passwordHash,
        nombre: 'Lic. Esmirna',
        rol: 'admin'
      }
    });
    console.log(`Usuario "${username}" creado.`);
  }

  console.log('\n=== CREDENCIALES DE ADMINISTRADOR ===');
  console.log(`  Usuario:    ${username}`);
  console.log(`  Contraseña: ${password}`);
  console.log('=====================================\n');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
