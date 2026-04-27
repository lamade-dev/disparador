import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma/client';
import { scheduleCampaign } from '../../services/queue/scheduler';
import { sendQueue } from '../../services/queue/queue';

const createSchema = z.object({
  name: z.string().min(2),
  contactListId: z.string(),
  messageTemplate: z.string().min(5),
  instanceIds: z.array(z.string()).min(1),
  intervalMin: z.number().int().min(5).max(600).default(15),
  intervalMax: z.number().int().min(5).max(600).default(45),
  redirectNumber: z.string().optional(),
});

export async function listCampaigns(req: Request, res: Response) {
  const campaigns = await prisma.campaign.findMany({
    where: { userId: req.user!.sub },
    include: {
      contactList: { select: { fileName: true, validCount: true } },
      instances: { include: { instance: { select: { displayName: true, status: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(campaigns);
}

export async function createCampaign(req: Request, res: Response) {
  const data = createSchema.parse(req.body);

  const contactList = await prisma.contactList.findFirst({
    where: { id: data.contactListId, userId: req.user!.sub },
  });
  if (!contactList) { res.status(404).json({ error: 'Lista de contatos não encontrada' }); return; }

  const campaign = await prisma.campaign.create({
    data: {
      userId: req.user!.sub,
      name: data.name,
      contactListId: data.contactListId,
      messageTemplate: data.messageTemplate,
      intervalMin: data.intervalMin,
      intervalMax: data.intervalMax,
      redirectNumber: data.redirectNumber,
      instances: {
        createMany: { data: data.instanceIds.map((id) => ({ instanceId: id })) },
      },
    },
    include: {
      instances: { include: { instance: { select: { displayName: true } } } },
    },
  });

  res.status(201).json(campaign);
}

export async function getCampaign(req: Request, res: Response) {
  const id = req.params.id as string;
  const page = parseInt(String(req.query.page ?? '1'), 10);
  const limit = 50;

  const [campaign, messages, total] = await Promise.all([
    prisma.campaign.findFirst({
      where: { id, userId: req.user!.sub },
      include: {
        contactList: { select: { fileName: true, validCount: true } },
        instances: { include: { instance: { select: { id: true, displayName: true, status: true } } } },
      },
    }),
    prisma.message.findMany({
      where: { campaignId: id },
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.message.count({ where: { campaignId: id } }),
  ]);

  if (!campaign) { res.status(404).json({ error: 'Campanha não encontrada' }); return; }

  res.json({ ...campaign, messages, total, page, pages: Math.ceil(total / limit) });
}

export async function startCampaign(req: Request, res: Response) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: req.params.id as string, userId: req.user!.sub },
  });
  if (!campaign) { res.status(404).json({ error: 'Campanha não encontrada' }); return; }
  if (!['DRAFT', 'PAUSED'].includes(campaign.status)) {
    res.status(400).json({ error: 'Campanha não pode ser iniciada neste estado' }); return;
  }

  if (campaign.status === 'DRAFT') {
    await scheduleCampaign(campaign.id);
  } else {
    await sendQueue.resume();
    await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'RUNNING' } });
  }

  res.json({ status: 'RUNNING' });
}

export async function pauseCampaign(req: Request, res: Response) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: req.params.id as string, userId: req.user!.sub, status: 'RUNNING' },
  });
  if (!campaign) { res.status(404).json({ error: 'Campanha não encontrada ou não está em execução' }); return; }

  await sendQueue.pause();
  await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'PAUSED' } });

  res.json({ status: 'PAUSED' });
}

export async function resumeCampaign(req: Request, res: Response) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: req.params.id as string, userId: req.user!.sub, status: 'PAUSED' },
  });
  if (!campaign) { res.status(404).json({ error: 'Campanha não encontrada ou não está pausada' }); return; }

  await sendQueue.resume();
  await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'RUNNING' } });

  res.json({ status: 'RUNNING' });
}

export async function cancelCampaign(req: Request, res: Response) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: req.params.id as string, userId: req.user!.sub },
  });
  if (!campaign) { res.status(404).json({ error: 'Campanha não encontrada' }); return; }

  await sendQueue.drain();
  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: 'CANCELLED', completedAt: new Date() },
  });

  res.json({ status: 'CANCELLED' });
}
