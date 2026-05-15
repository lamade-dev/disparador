import { Worker, Job } from 'bullmq';
import { prisma } from '../../../prisma/client';
import { evolution } from '../../evolution/evolution.client';
import { rewriteMessage } from '../../ai/rewriter';
import { SendJobData, analysisQueue, redisConnection } from '../queue';
import { getIO } from '../../../server';

// Prisma error code for "record not found"
const PRISMA_NOT_FOUND = 'P2025';

export function startSendWorker() {
  const worker = new Worker<SendJobData>(
    'send-queue',
    async (job: Job<SendJobData>) => {
      const { messageId, campaignId, instanceName, phone, name, template, mediaBase64, mediaType, mediaFileName } = job.data;
      console.log(`[SendWorker] processing job ${job.id} phone=${phone} messageId=${messageId} hasMedia=${!!mediaBase64}`);

      // Guard: if the message no longer exists in DB (zombie job from old session), skip silently
      const exists = await prisma.message.findUnique({ where: { id: messageId }, select: { id: true, status: true } });
      if (!exists) {
        console.warn(`[SendWorker] job ${job.id} skipped — messageId=${messageId} not found in DB (zombie job)`);
        return;
      }
      if (exists.status !== 'PENDING') {
        console.warn(`[SendWorker] job ${job.id} skipped — messageId=${messageId} already ${exists.status}`);
        return;
      }

      const variables: Record<string, string> = {};
      if (name) variables['nome'] = name;
      variables['telefone'] = phone;

      const rewritten = await rewriteMessage(template, variables);

      let evolutionMsgId = '';
      try {
        if (mediaBase64 && mediaType) {
          evolutionMsgId = await evolution.sendMedia(
            instanceName,
            phone,
            mediaBase64,
            mediaType as 'image' | 'video',
            mediaFileName ?? (mediaType === 'video' ? 'video.mp4' : 'image.jpg'),
            rewritten,
          );
        } else {
          evolutionMsgId = await evolution.sendText(instanceName, phone, rewritten);
        }
      } catch (err: any) {
        const status = err?.response?.status;

        // 400/403: bad number or blocked — mark FAILED, no retry
        if (status === 400 || status === 403) {
          console.warn(`[SendWorker] job ${job.id} phone=${phone} rejected (${status}) — marking FAILED`);
          await prisma.message.update({
            where: { id: messageId },
            data: { status: 'FAILED', sentAt: new Date(), sentText: rewritten },
          }).catch(() => {});
          await prisma.campaign.update({
            where: { id: campaignId },
            data: { sentCount: { increment: 1 } },
          }).catch(() => {});
          return;
        }

        // 500: instance likely disconnected/suspended — mark FAILED, no retry (retrying makes it worse)
        if (status === 500) {
          console.error(`[SendWorker] job ${job.id} Evolution API 500 — instance may be disconnected. Marking FAILED, no retry.`);
          await prisma.message.update({
            where: { id: messageId },
            data: { status: 'FAILED', sentAt: new Date(), sentText: rewritten },
          }).catch(() => {});
          await prisma.campaign.update({
            where: { id: campaignId },
            data: { sentCount: { increment: 1 } },
          }).catch(() => {});
          return;
        }

        throw err;
      }

      console.log(`[SendWorker] saving evolutionMsgId="${evolutionMsgId}" for messageId=${messageId}`);

      try {
        await prisma.message.update({
          where: { id: messageId },
          data: {
            status: 'SENT',
            sentText: rewritten,
            evolutionMsgId: evolutionMsgId || undefined,
            sentAt: new Date(),
          },
        });
      } catch (err: any) {
        if (err?.code === PRISMA_NOT_FOUND) {
          console.warn(`[SendWorker] message ${messageId} disappeared after send — skipping stats update`);
          return;
        }
        throw err;
      }

      const campaign = await prisma.campaign.update({
        where: { id: campaignId },
        data: { sentCount: { increment: 1 } },
        select: { sentCount: true, deliveredCount: true, readCount: true, repliedCount: true, positiveCount: true, userId: true },
      });

      // Increment messagesUsed for the campaign owner
      await prisma.user.update({
        where: { id: campaign.userId },
        data: { messagesUsed: { increment: 1 } },
      }).catch(() => {});

      const io = getIO();
      io.to(`user:${campaign.userId}`).emit('campaign:stats', {
        campaignId,
        ...campaign,
      });
    },
    {
      connection: redisConnection,
      concurrency: 1,
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`[SendWorker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
