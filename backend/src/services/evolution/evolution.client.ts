import axios from 'axios';
import { env } from '../../config/env';

const client = axios.create({
  baseURL: env.EVOLUTION_URL,
  headers: { apikey: env.EVOLUTION_API_KEY },
  timeout: 30000,
});

export interface EvolutionInstance {
  instanceName: string;
  status: string;
}

export const evolution = {
  async createInstance(name: string): Promise<void> {
    await client.post('/instance/create', {
      instanceName: name,
      integration: 'WHATSAPP-BAILEYS',
      qrcode: true,
    });
  },

  async getQrCode(name: string): Promise<{ base64: string }> {
    const res = await client.get(`/instance/connect/${name}`);
    return { base64: res.data.base64 };
  },

  async getStatus(name: string): Promise<string> {
    const res = await client.get(`/instance/fetchInstances`, {
      params: { instanceName: name },
    });
    const inst = Array.isArray(res.data) ? res.data[0] : res.data;
    return inst?.instance?.state ?? 'close';
  },

  async setWebhook(name: string, webhookUrl: string): Promise<void> {
    await client.post(`/webhook/set/${name}`, {
      webhook: {
        enabled: true,
        url: webhookUrl,
        webhookByEvents: false,
        webhookBase64: false,
        events: [
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'CONNECTION_UPDATE',
          'SEND_MESSAGE',
        ],
      },
    });
  },

  async sendText(instanceName: string, phone: string, text: string): Promise<string> {
    const res = await client.post(`/message/sendText/${instanceName}`, {
      number: phone,
      text,
    });
    // Evolution API v2 may return key.id or just id at root level
    const msgId = res.data?.key?.id ?? res.data?.id ?? '';
    console.log(`[Evolution] sendText phone=${phone} msgId=${msgId} rawKeys=${Object.keys(res.data ?? {}).join(',')}`);
    return msgId;
  },

  async sendMedia(
    instanceName: string,
    phone: string,
    mediaBase64: string,
    mediaType: 'image' | 'video',
    fileName: string,
    caption: string,
  ): Promise<string> {
    const mimetype = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
    const res = await client.post(`/message/sendMedia/${instanceName}`, {
      number: phone,
      mediatype: mediaType,
      mimetype,
      caption,
      media: mediaBase64,
      fileName,
    });
    const msgId = res.data?.key?.id ?? res.data?.id ?? '';
    console.log(`[Evolution] sendMedia phone=${phone} type=${mediaType} msgId=${msgId}`);
    return msgId;
  },

  async disconnect(name: string): Promise<void> {
    await client.delete(`/instance/logout/${name}`);
  },

  async deleteInstance(name: string): Promise<void> {
    await client.delete(`/instance/delete/${name}`);
  },
};

export function evolutionStateToStatus(state: string): string {
  const map: Record<string, string> = {
    open: 'CONNECTED',
    connecting: 'CONNECTING',
    close: 'DISCONNECTED',
  };
  return map[state] ?? 'DISCONNECTED';
}
