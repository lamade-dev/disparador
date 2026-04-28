import { Request, Response } from 'express';
import { prisma } from '../../prisma/client';

export async function getStats(req: Request, res: Response) {
  const isMaster = req.user!.role === 'MASTER';
  const where = isMaster ? {} : { userId: req.user!.sub };

  const [campaigns, instances] = await Promise.all([
    prisma.campaign.findMany({
      where,
      select: {
        id: true,
        name: true,
        status: true,
        sentCount: true,
        deliveredCount: true,
        readCount: true,
        repliedCount: true,
        positiveCount: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
        contactList: { select: { validCount: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.instance.findMany({
      select: { id: true, displayName: true, status: true, phoneNumber: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const totals = campaigns.reduce(
    (acc, c) => ({
      sent: acc.sent + c.sentCount,
      delivered: acc.delivered + c.deliveredCount,
      read: acc.read + c.readCount,
      replied: acc.replied + c.repliedCount,
      positive: acc.positive + c.positiveCount,
    }),
    { sent: 0, delivered: 0, read: 0, replied: 0, positive: 0 }
  );

  // For master: build per-gestor breakdown
  let gestorStats: Array<{ id: string; name: string; email: string; sent: number; delivered: number; read: number; replied: number; positive: number; sessions: number }> = [];
  if (isMaster) {
    const byGestor = new Map<string, typeof gestorStats[0]>();
    for (const c of campaigns) {
      const u = c.user;
      if (!byGestor.has(u.id)) {
        byGestor.set(u.id, { id: u.id, name: u.name, email: u.email, sent: 0, delivered: 0, read: 0, replied: 0, positive: 0, sessions: 0 });
      }
      const g = byGestor.get(u.id)!;
      g.sent += c.sentCount;
      g.delivered += c.deliveredCount;
      g.read += (c as any).readCount ?? 0;
      g.replied += c.repliedCount;
      g.positive += c.positiveCount;
      g.sessions += 1;
    }
    gestorStats = Array.from(byGestor.values());
  }

  res.json({ totals, campaigns, instances, gestorStats });
}
