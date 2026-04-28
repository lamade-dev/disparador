import { Worker, Job } from 'bullmq';
import { prisma } from '../../../prisma/client';
import { evolution } from '../../evolution/evolution.client';
import { rewriteMessage } from '../../ai/rewriter';
import { SendJobData, analysisQueue, redisConnection } from '../queue';
import { getIO } from '../../../server';

export function startSendWorker() {
  const worker = new Worker<SendJobData>(
    'send-queue',
    async (job: Job<SendJobData>) => {
      const { messageId, campaignId, instanceName, phone, name, template } = job.data;

      const variables: Record<string, string> = {};
      if (name) variables['nome'] = name;
      variables['telefone'] = phone;

      const rewritten = await rewriteMessage(template, variables);

      let evolutionMsgId = '';
      try {
        evolutionMsgId = await evolution.sendText(instanceName, phone, rewritten);
      } catch (err: any) {
        if (err?.response?.status === 400 || err?.response?.status === 403) {
          await prisma.message.update({
            where: { id: messageId },
            data: { status: 'FAILED', sentAt: new Date(), sentText: rewritten },
          });
          await prisma.campaign.update({
            where: { id: campaignId },
            data: { sentCount: { increment: 1 } },
          });
          return;
        }
        throw err;
      }

      await prisma.message.update({
        where: { id: messageId },
        data: {
          status: 'SENT',
          sentText: rewritten,
          evolutionMsgId,
          sentAt: new Date(),
        },
      });

      const campaign = await prisma.campaign.update({
        where: { id: campaignId },
        data: { sentCount: { increment: 1 } },
        select: { sentCount: true, deliveredCount: true, repliedCount: true, positiveCount: true, userId: true },
      });

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
