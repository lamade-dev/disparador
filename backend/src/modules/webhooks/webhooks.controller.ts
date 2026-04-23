import { Request, Response } from 'express';
import { prisma } from '../../prisma/client';
import { analysisQueue } from '../../services/queue/queue';
import { evolution, evolutionStateToStatus } from '../../services/evolution/evolution.client';
import { getIO } from '../../server';

export async function handleEvolutionWebhook(req: Request, res: Response) {
  res.status(200).send();

  const { event, instance: instanceName, data } = req.body;

  if (!event || !instanceName) return;

  try {
    if (event === 'connection.update') {
      await handleConnectionUpdate(instanceName, data);
    } else if (event === 'messages.upsert') {
      await handleMessagesUpsert(instanceName, data);
    } else if (event === 'messages.update') {
      await handleMessagesUpdate(instanceName, data);
    }
  } catch (err) {
    console.error('[Webhook] Error processing event:', event, err);
  }
}

async function handleConnectionUpdate(instanceName: string, data: any) {
  const instance = await prisma.instance.findUnique({ where: { name: instanceName } });
  if (!instance) return;

  const state = data?.state ?? 'close';
  const status = evolutionStateToStatus(state) as any;

  if (data?.statusReason === 401) {
    await prisma.instance.update({ where: { id: instance.id }, data: { status: 'BLOCKED' } });
    getIO().to(`user:${instance.userId}`).emit('instance:status', { instanceId: instance.id, status: 'BLOCKED' });
    return;
  }

  if (state === 'open' && data?.instance?.wuid) {
    const phoneNumber = data.instance.wuid.replace('@s.whatsapp.net', '');
    await prisma.instance.update({ where: { id: instance.id }, data: { status: 'CONNECTED', phoneNumber } });
  } else {
    await prisma.instance.update({ where: { id: instance.id }, data: { status } });
  }

  getIO().to(`user:${instance.userId}`).emit('instance:status', { instanceId: instance.id, status });
}

async function handleMessagesUpsert(instanceName: string, data: any) {
  const messages = Array.isArray(data) ? data : [data];

  for (const msg of messages) {
    if (msg.key?.fromMe) continue;

    const phone = (msg.key?.remoteJid ?? '').replace('@s.whatsapp.net', '').replace('@g.us', '');
    if (!phone || msg.key?.remoteJid?.includes('@g.us')) continue;

    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    if (!text) continue;

    const existingMsg = await prisma.message.findFirst({
      where: { phone, status: { in: ['SENT', 'DELIVERED'] } },
      include: { campaign: { select: { redirectNumber: true, userId: true } } },
      orderBy: { sentAt: 'desc' },
    });

    if (!existingMsg) continue;

    const instance = await prisma.instance.findUnique({ where: { name: instanceName } });

    await analysisQueue.add(`analysis:${existingMsg.id}`, {
      messageId: existingMsg.id,
      campaignId: existingMsg.campaignId,
      phone,
      name: existingMsg.name,
      responseText: text,
      redirectNumber: existingMsg.campaign.redirectNumber,
      instanceName,
    });
  }
}

async function handleMessagesUpdate(instanceName: string, data: any) {
  const updates = Array.isArray(data) ? data : [data];

  for (const update of updates) {
    const evolutionMsgId = update.key?.id;
    if (!evolutionMsgId) continue;

    const status = update.update?.status;
    if (status !== 'DELIVERY_ACK' && status !== 3) continue;

    const msg = await prisma.message.findFirst({ where: { evolutionMsgId } });
    if (!msg || msg.status === 'DELIVERED') continue;

    const updated = await prisma.message.update({
      where: { id: msg.id },
      data: { status: 'DELIVERED', deliveredAt: new Date() },
    });

    const campaign = await prisma.campaign.update({
      where: { id: msg.campaignId },
      data: { deliveredCount: { increment: 1 } },
      select: { sentCount: true, deliveredCount: true, repliedCount: true, positiveCount: true, userId: true },
    });

    getIO().to(`user:${campaign.userId}`).emit('campaign:stats', {
      campaignId: msg.campaignId,
      ...campaign,
    });
  }
}
