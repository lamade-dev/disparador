import OpenAI from 'openai';
import { env } from '../../config/env';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Você é um classificador de respostas de WhatsApp para campanhas de marketing.
Classifique a mensagem recebida como:
- POSITIVE: interesse em comprar, solicitar mais informações, reação positiva ao produto/serviço
- NEGATIVE: não tem interesse, pediu para parar, resposta negativa
- NEUTRAL: dúvida genérica, mensagem ambígua, resposta que não indica interesse claro

Responda APENAS com JSON no formato: {"sentiment": "POSITIVE" | "NEGATIVE" | "NEUTRAL", "reason": "motivo breve"}`;

export type Sentiment = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';

export async function classifyResponse(text: string): Promise<Sentiment> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 128,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Mensagem recebida: "${text}"` },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      if (['POSITIVE', 'NEGATIVE', 'NEUTRAL'].includes(parsed.sentiment)) {
        return parsed.sentiment as Sentiment;
      }
    }
  } catch (error) {
    console.error('[AI Classifier] Error:', error);
  }

  return 'NEUTRAL';
}
