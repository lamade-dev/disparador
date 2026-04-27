import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma/client';

const updateSchema = z.object({
  mode: z.enum(['ALL', 'SPECIFIC']),
  specificInstanceId: z.string().nullable().optional(),
});

export async function getDispatchConfig(req: Request, res: Response) {
  let config = await prisma.dispatchConfig.findUnique({ where: { id: 'global' } });
  if (!config) {
    config = await prisma.dispatchConfig.upsert({
      where: { id: 'global' },
      create: { id: 'global', mode: 'ALL' },
      update: {},
    });
  }
  res.json(config);
}

export async function updateDispatchConfig(req: Request, res: Response) {
  const data = updateSchema.parse(req.body);
  const config = await prisma.dispatchConfig.upsert({
    where: { id: 'global' },
    update: data,
    create: { id: 'global', ...data },
  });
  res.json(config);
}
