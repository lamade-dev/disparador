import { prisma } from '../../prisma/client';
import { sendQueue, SendJobData } from './queue';

export async function scheduleCampaign(campaignId: string): Promise<void> {
  const campaign = await prisma.campaign.findUniqueOrThrow({
    where: { id: campaignId },
    include: {
      contactList: { include: { contacts: true } },
    },
  });
  // Fetch media separately to avoid huge base64 in the main query result
  const campaignMedia = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { mediaBase64: true, mediaType: true, mediaFileName: true },
  });

  const config = await prisma.dispatchConfig.findUnique({ where: { id: 'global' } });

  let instances: Array<{ id: string; name: string }>;

  if (!config || config.mode === 'ALL') {
    instances = await prisma.instance.findMany({
      where: { status: 'CONNECTED' },
      select: { id: true, name: true },
    });
  } else {
    if (!config.specificInstanceId) throw new Error('Nenhuma instância específica configurada');
    const inst = await prisma.instance.findUnique({
      where: { id: config.specificInstanceId },
      select: { id: true, name: true },
    });
    if (!inst) throw new Error('Instância específica não encontrada');
    instances = [inst];
  }

  if (instances.length === 0) throw new Error('Nenhuma instância conectada disponível. Conecte uma instância primeiro.');

  // Reuse existing PENDING messages if they already exist (retry scenario)
  let messages = await prisma.message.findMany({
    where: { campaignId, status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
  });

  if (messages.length === 0) {
    const contacts = campaign.contactList.contacts;
    if (contacts.length === 0) throw new Error('Nenhum contato na lista');

    messages = await prisma.$transaction(
      contacts.map((contact, i) =>
        prisma.message.create({
          data: {
            campaignId,
            contactId: contact.id,
            instanceId: instances[i % instances.length].id,
            phone: contact.phone,
            name: contact.name,
            status: 'PENDING',
          },
        })
      )
    );
  }

  const jobs: Array<{ name: string; data: SendJobData; opts: { delay: number } }> = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const instance = instances[i % instances.length];
    const intervalMs =
      (campaign.intervalMin + Math.random() * (campaign.intervalMax - campaign.intervalMin)) * 1000;
    const delay = Math.floor(i * intervalMs);

    jobs.push({
      name: `send:${msg.id}`,
      data: {
        messageId: msg.id,
        campaignId,
        instanceName: instance.name,
        phone: msg.phone,
        name: msg.name,
        template: campaign.messageTemplate,
        redirectNumber: campaign.redirectNumber,
        mediaBase64: campaignMedia?.mediaBase64,
        mediaType: campaignMedia?.mediaType,
        mediaFileName: campaignMedia?.mediaFileName,
      },
      opts: { delay },
    });
  }

  console.log(`[Scheduler] adding ${jobs.length} jobs to queue for campaign ${campaignId}`);
  await sendQueue.addBulk(jobs);

  // Always resume the queue — it may be paused from a previous session
  const isPaused = await sendQueue.isPaused();
  if (isPaused) {
    console.log('[Scheduler] queue was paused, resuming...');
    await sendQueue.resume();
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'RUNNING', startedAt: new Date() },
  });

  console.log(`[Scheduler] campaign ${campaignId} scheduled and RUNNING`);
}
