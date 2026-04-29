import { Request, Response } from 'express';
import { prisma } from '../../prisma/client';
import { analysisQueue } from '../../services/queue/queue';
import { evolution, evolutionStateToStatus } from '../../services/evolution/evolution.client';
import { getIO } from '../../server';

export async function handleEvolutionWebhook(req: Request, res: Response) {
  res.status(200).send();

  const { event, instance: instanceName, data } = req.body;
  const evt = (event ?? '').toLowerCase().replace(/_/g, '.');

  console.log(`[Webhook] raw=${event} normalized=${evt} instance=${instanceName}`);

  if (!evt || !instanceName) return;

  try {
    if (evt === 'connection.update') {
      await handleConnectionUpdate(instanceName, data);
    } else if (evt === 'messages.upsert') {
      await handleMessagesUpsert(instanceName, data);
    } else if (evt === 'messages.update') {
      console.log('[Webhook] messages.update data:', JSON.stringify(data).slice(0, 500));
      await handleMessagesUpdate(instanceName, data);
    } else {
      console.log(`[Webhook] unhandled event: ${evt}`);
    }
  } catch (err) {
    console.error('[Webhook] Error processing event:', evt, err);
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
    // Evolution API v2 sends flat structure: { keyId, messageId, status, ... }
    // Older format: { key: { id }, update: { status } }
    const evolutionMsgId = update.keyId ?? update.key?.id;
    const dbMessageId = update.messageId; // direct DB ID when available
    const ackStatus = update.status ?? update.update?.status;

    const isDelivered = ackStatus === 'DELIVERY_ACK' || ackStatus === 2;
    const isRead = ackStatus === 'READ' || ackStatus === 'READ_ACK' || ackStatus === 3;

    if (!isDelivered && !isRead) continue;

    // Prefer direct DB ID lookup, fallback to evolutionMsgId
    const msg = dbMessageId
      ? await prisma.message.findUnique({ where: { id: dbMessageId } })
      : evolutionMsgId
        ? await prisma.message.findFirst({ where: { evolutionMsgId } })
        : null;

    if (!msg) continue;

    if (isRead && msg.status !== 'READ') {
      const wasDelivered = msg.status === 'DELIVERED';
      await prisma.message.update({
        where: { id: msg.id },
        data: {
          status: 'READ',
          readAt: new Date(),
          deliveredAt: msg.deliveredAt ?? new Date(),
        },
      });

      const campaign = await prisma.campaign.update({
        where: { id: msg.campaignId },
        data: {
          readCount: { increment: 1 },
          deliveredCount: wasDelivered ? undefined : { increment: 1 },
        },
        select: { sentCount: true, deliveredCount: true, readCount: true, repliedCount: true, positiveCount: true, userId: true },
      });

      getIO().to(`user:${campaign.userId}`).emit('campaign:stats', { campaignId: msg.campaignId, ...campaign });

    } else if (isDelivered && msg.status === 'SENT') {
      await prisma.message.update({
        where: { id: msg.id },
        data: { status: 'DELIVERED', deliveredAt: new Date() },
      });

      const campaign = await prisma.campaign.update({
        where: { id: msg.campaignId },
        data: { deliveredCount: { increment: 1 } },
        select: { sentCount: true, deliveredCount: true, readCount: true, repliedCount: true, positiveCount: true, userId: true },
      });

      getIO().to(`user:${campaign.userId}`).emit('campaign:stats', { campaignId: msg.campaignId, ...campaign });
    }
  }
}
