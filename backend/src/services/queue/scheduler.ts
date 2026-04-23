import { prisma } from '../../prisma/client';
import { sendQueue, SendJobData } from './queue';

export async function scheduleCampaign(campaignId: string): Promise<void> {
  const campaign = await prisma.campaign.findUniqueOrThrow({
    where: { id: campaignId },
    include: {
      contactList: { include: { contacts: true } },
      instances: { include: { instance: true } },
    },
  });

  const instances = campaign.instances.map((ci) => ci.instance);
  if (instances.length === 0) throw new Error('Nenhuma instância selecionada');

  const contacts = campaign.contactList.contacts;
  if (contacts.length === 0) throw new Error('Nenhum contato na lista');

  const messages = await prisma.$transaction(
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
      },
      opts: { delay },
    });
  }

  await sendQueue.addBulk(jobs);

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'RUNNING', startedAt: new Date() },
  });
}
