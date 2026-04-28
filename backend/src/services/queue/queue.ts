import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../../config/env';

export const redisConnection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: false,
});

const connection = redisConnection;

export const sendQueue = new Queue('send-queue', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 500 },
  },
});

export const analysisQueue = new Queue('analysis-queue', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 2000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 200 },
  },
});

export type SendJobData = {
  messageId: string;
  campaignId: string;
  instanceName: string;
  phone: string;
  name: string | null;
  template: string;
  redirectNumber: string | null;
};

export type AnalysisJobData = {
  messageId: string;
  campaignId: string;
  phone: string;
  name: string | null;
  responseText: string;
  redirectNumber: string | null;
  instanceName: string;
};
