import { Request, Response } from 'express';
import { prisma } from '../../prisma/client';

export async function getStats(req: Request, res: Response) {
  const where = req.user!.role === 'MASTER' ? {} : { userId: req.user!.sub };

  const [campaigns, instances] = await Promise.all([
    prisma.campaign.findMany({
      where,
      select: {
        id: true,
        name: true,
        status: true,
        sentCount: true,
        deliveredCount: true,
        repliedCount: true,
        positiveCount: true,
        createdAt: true,
        contactList: { select: { validCount: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.instance.findMany({
      where: req.user!.role === 'MASTER' ? {} : { userId: req.user!.sub },
      select: { id: true, displayName: true, status: true, phoneNumber: true },
    }),
  ]);

  const totals = campaigns.reduce(
    (acc, c) => ({
      sent: acc.sent + c.sentCount,
      delivered: acc.delivered + c.deliveredCount,
      replied: acc.replied + c.repliedCount,
      positive: acc.positive + c.positiveCount,
    }),
    { sent: 0, delivered: 0, replied: 0, positive: 0 }
  );

  res.json({ totals, campaigns, instances });
}
