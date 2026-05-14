import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma/client';
import { env } from '../../config/env';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function login(req: Request, res: Response) {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) {
    res.status(401).json({ error: 'Credenciais inválidas' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ error: 'Credenciais inválidas' });
    return;
  }

  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: user.name },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}

export async function register(req: Request, res: Response) {
  const { name, email, password } = registerSchema.parse(req.body);

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    res.status(409).json({ error: 'Email já cadastrado' });
    return;
  }

  const hashed = await bcrypt.hash(password, 10);

  // Apply default quota from global settings
  const settings = await prisma.setting.findUnique({ where: { id: 'global' } });
  const defaultQuota = settings?.defaultMessageQuota ?? 0;

  const user = await prisma.user.create({
    data: { name, email, password: hashed, role: 'GESTOR', messageQuota: defaultQuota },
    select: { id: true, name: true, email: true, role: true },
  });

  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: user.name },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(201).json({ token, user });
}

export function me(req: Request, res: Response) {
  res.json({ user: req.user });
}
