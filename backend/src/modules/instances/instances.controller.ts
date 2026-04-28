import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma/client';
import { evolution, evolutionStateToStatus } from '../../services/evolution/evolution.client';
import { env } from '../../config/env';
import { getIO } from '../../server';

const createSchema = z.object({
  displayName: z.string().min(2),
});

export async function listInstances(req: Request, res: Response) {
  const where = req.user!.role === 'MASTER' ? {} : { userId: req.user!.sub };
  const instances = await prisma.instance.findMany({
    where,
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(instances);
}

export async function createInstance(req: Request, res: Response) {
  const { displayName } = createSchema.parse(req.body);
  const name = `inst_${req.user!.sub.slice(-6)}_${Date.now()}`;

  await evolution.createInstance(name);
  const backendUrl = process.env.BACKEND_URL ?? `https://disparador-disparador.kj2jgf.easypanel.host`;
  await evolution.setWebhook(name, `${backendUrl}/api/webhooks/evolution`);

  const instance = await prisma.instance.create({
    data: { userId: req.user!.sub, name, displayName, status: 'CONNECTING' },
  });

  res.status(201).json(instance);
}

export async function getQrCode(req: Request, res: Response) {
  const instance = await prisma.instance.findFirst({
    where: { id: req.params.id as string, userId: req.user!.role === 'MASTER' ? undefined : req.user!.sub },
  });
  if (!instance) { res.status(404).json({ error: 'Instância não encontrada' }); return; }

  const qr = await evolution.getQrCode(instance.name);
  res.json(qr);
}

export async function getStatus(req: Request, res: Response) {
  const instance = await prisma.instance.findFirst({
    where: { id: req.params.id as string, userId: req.user!.role === 'MASTER' ? undefined : req.user!.sub },
  });
  if (!instance) { res.status(404).json({ error: 'Instância não encontrada' }); return; }

  const state = await evolution.getStatus(instance.name);
  const status = evolutionStateToStatus(state) as any;

  if (instance.status !== status) {
    await prisma.instance.update({ where: { id: instance.id }, data: { status } });
    getIO().to(`user:${instance.userId}`).emit('instance:status', { instanceId: instance.id, status });
  }

  res.json({ status });
}

export async function disconnectInstance(req: Request, res: Response) {
  const instance = await prisma.instance.findFirst({
    where: { id: req.params.id as string, userId: req.user!.sub },
  });
  if (!instance) { res.status(404).json({ error: 'Instância não encontrada' }); return; }

  await evolution.disconnect(instance.name);
  await prisma.instance.update({ where: { id: instance.id }, data: { status: 'DISCONNECTED' } });
  getIO().to(`user:${instance.userId}`).emit('instance:status', { instanceId: instance.id, status: 'DISCONNECTED' });

  res.status(204).send();
}

export async function deleteInstance(req: Request, res: Response) {
  const instance = await prisma.instance.findFirst({
    where: { id: req.params.id as string, userId: req.user!.sub },
  });
  if (!instance) { res.status(404).json({ error: 'Instância não encontrada' }); return; }

  try { await evolution.deleteInstance(instance.name); } catch {}
  await prisma.instance.delete({ where: { id: instance.id } });

  res.status(204).send();
}
