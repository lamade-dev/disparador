import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma/client';

export async function getSettings(_req: Request, res: Response) {
  const settings = await prisma.setting.upsert({
    where: { id: 'global' },
    update: {},
    create: { id: 'global', defaultMessageQuota: 0 },
  });
  res.json(settings);
}

export async function updateSettings(req: Request, res: Response) {
  const data = z.object({
    defaultMessageQuota: z.number().int().min(0),
  }).parse(req.body);

  const settings = await prisma.setting.upsert({
    where: { id: 'global' },
    update: data,
    create: { id: 'global', ...data },
  });
  res.json(settings);
}
