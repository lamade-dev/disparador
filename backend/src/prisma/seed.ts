import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: 'master@disparador.com' } });
  if (existing) {
    console.log('Master user already exists');
    return;
  }

  const hashed = await bcrypt.hash('master123', 10);
  const master = await prisma.user.create({
    data: {
      name: 'Master Admin',
      email: 'master@disparador.com',
      password: hashed,
      role: Role.MASTER,
    },
  });

  console.log(`✅ Master user created: ${master.email} / master123`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
