import { Worker, Job } from 'bullmq';
import { prisma } from '../../../prisma/client';
import { evolution } from '../../evolution/evolution.client';
import { classifyResponse } from '../../ai/classifier';
import { AnalysisJobData, redisConnection } from '../queue';
import { getIO } from '../../../server';

export function startAnalysisWorker() {
  const worker = new Worker<AnalysisJobData>(
    'analysis-queue',
    async (job: Job<AnalysisJobData>) => {
      const { messageId, campaignId, phone, name, responseText, redirectNumber, instanceName } = job.data;

      const sentiment = await classifyResponse(responseText);

      await prisma.message.update({
        where: { id: messageId },
        data: {
          responseText,
          responseSentiment: sentiment,
          responseAt: new Date(),
          // Don't downgrade status — keep READ/DELIVERED as-is
        },
      });

      const updateData: any = { repliedCount: { increment: 1 } };
      if (sentiment === 'POSITIVE') updateData.positiveCount = { increment: 1 };

      const campaign = await prisma.campaign.update({
        where: { id: campaignId },
        data: updateData,
        select: {
          sentCount: true,
          deliveredCount: true,
          readCount: true,
          repliedCount: true,
          positiveCount: true,
          userId: true,
        },
      });

      if (sentiment === 'POSITIVE' && redirectNumber) {
        const notifyMsg = `🎯 *Lead Interessado!*\n\nNome: ${name || 'Desconhecido'}\nTelefone: ${phone}\n\nMensagem: "${responseText}"`;
        try {
          await evolution.sendText(instanceName, redirectNumber, notifyMsg);
          await prisma.message.update({
            where: { id: messageId },
            data: { notifiedAt: new Date() },
          });
        } catch (err) {
          console.error('[AnalysisWorker] Failed to notify redirect number:', err);
        }
      }

      const io = getIO();
      io.to(`user:${campaign.userId}`).emit('campaign:stats', {
        campaignId,
        ...campaign,
      });
      io.to(`user:${campaign.userId}`).emit('campaign:message', {
        campaignId,
        messageId,
        sentiment,
        phone,
        name,
      });
    },
    {
      connection: redisConnection,
      concurrency: 3,
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`[AnalysisWorker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
