import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env';

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Você é um classificador de respostas de WhatsApp para campanhas de marketing.
Classifique a mensagem recebida como:
- POSITIVE: interesse em comprar, solicitar mais informações, reação positiva ao produto/serviço
- NEGATIVE: não tem interesse, pediu para parar, resposta negativa
- NEUTRAL: dúvida genérica, mensagem ambígua, resposta que não indica interesse claro

Responda APENAS com JSON no formato: {"sentiment": "POSITIVE" | "NEGATIVE" | "NEUTRAL", "reason": "motivo breve"}`;

export type Sentiment = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';

export async function classifyResponse(text: string): Promise<Sentiment> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 128,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Mensagem recebida: "${text}"`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      const parsed = JSON.parse(content.text.trim());
      if (['POSITIVE', 'NEGATIVE', 'NEUTRAL'].includes(parsed.sentiment)) {
        return parsed.sentiment as Sentiment;
      }
    }
  } catch (error) {
    console.error('[AI Classifier] Error:', error);
  }

  return 'NEUTRAL';
}
