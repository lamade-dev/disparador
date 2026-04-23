import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../../prisma/client';

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function listUsers(req: Request, res: Response) {
  const users = await prisma.user.findMany({
    where: { role: 'GESTOR', createdById: req.user!.sub },
    select: { id: true, name: true, email: true, active: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(users);
}

export async function createUser(req: Request, res: Response) {
  const data = createSchema.parse(req.body);

  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) {
    res.status(409).json({ error: 'Email já cadastrado' });
    return;
  }

  const hashed = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashed,
      role: 'GESTOR',
      createdById: req.user!.sub,
    },
    select: { id: true, name: true, email: true, active: true, createdAt: true },
  });

  res.status(201).json(user);
}

export async function updateUser(req: Request, res: Response) {
  const { id } = req.params;
  const data = z.object({ name: z.string().optional(), active: z.boolean().optional() }).parse(req.body);

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, active: true },
  });

  res.json(user);
}

export async function deleteUser(req: Request, res: Response) {
  const { id } = req.params;
  await prisma.user.update({ where: { id }, data: { active: false } });
  res.status(204).send();
}
