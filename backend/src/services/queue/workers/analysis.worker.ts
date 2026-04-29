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

      console.log(`[AnalysisWorker] processing messageId=${messageId} phone=${phone} text="${responseText.slice(0, 50)}"`);
      const sentiment = await classifyResponse(responseText);
      console.log(`[AnalysisWorker] sentiment=${sentiment} redirectNumber=${redirectNumber}`);

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
        // Normalize redirectNumber: remove +, spaces, dashes
        const normalizedRedirect = redirectNumber.replace(/[\s+\-()]/g, '');
        const notifyMsg = `🎯 *Lead Interessado!*\n\nNome: ${name || 'Desconhecido'}\nTelefone: +${phone}\n\nMensagem: "${responseText}"\n\n_Responda diretamente para esse contato no WhatsApp._`;
        console.log(`[AnalysisWorker] notifying redirect=${normalizedRedirect} via instance=${instanceName}`);
        try {
          await evolution.sendText(instanceName, normalizedRedirect, notifyMsg);
          await prisma.message.update({
            where: { id: messageId },
            data: { notifiedAt: new Date() },
          });
          console.log(`[AnalysisWorker] redirect notified successfully`);
        } catch (err) {
          console.error('[AnalysisWorker] Failed to notify redirect number:', err);
        }
      } else if (sentiment === 'POSITIVE' && !redirectNumber) {
        console.log(`[AnalysisWorker] POSITIVE but no redirectNumber configured for campaign ${campaignId}`);
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
