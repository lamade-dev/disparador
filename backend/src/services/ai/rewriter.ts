import OpenAI from 'openai';
import { env } from '../../config/env';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

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

  // Replace {nome} / {telefone} style variables
  for (const [key, value] of Object.entries(variables)) {
    text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }

  // Replace Meta-style {{1}}, {{2}}... variables with actual values
  const varArray = Object.values(variables);
  text = text.replace(/\{\{(\d+)\}\}/g, (_, n) => varArray[parseInt(n) - 1] ?? '');

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Reescreva esta mensagem:\n\n${text}` },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (content) return content.trim();
  } catch (error) {
    console.error('[AI Rewriter] Error:', error);
  }

  return text;
}
