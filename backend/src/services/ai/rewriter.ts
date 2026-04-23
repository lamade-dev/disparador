import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env';

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Você é um assistente especializado em reescrever mensagens de WhatsApp.
Sua tarefa é reescrever a mensagem fornecida de forma levemente diferente, mantendo 100% da intenção original.

Regras:
- Preserve variáveis entre chaves como {nome}, {telefone} — não altere nem remova
- Varie a estrutura das frases, use sinônimos, ajuste emojis e pontuação
- A mensagem reescrita deve ter no máximo 15% mais caracteres que a original
- Mantenha o mesmo tom (formal/informal) da mensagem original
- Retorne APENAS a mensagem reescrita, sem explicações ou comentários`;

export async function rewriteMessage(template: string, variables: Record<string, string> = {}): Promise<string> {
  let text = template;
  for (const [key, value] of Object.entries(variables)) {
    text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
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
          content: `Reescreva esta mensagem:\n\n${text}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type === 'text') return content.text.trim();
  } catch (error) {
    console.error('[AI Rewriter] Error:', error);
  }

  return text;
}
