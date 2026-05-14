import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import OpenAI from 'openai';
import { env } from '../../config/env';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const schema = z.object({
  baseMessage: z.string().min(10).max(2000),
});

function wrap(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);
}

export const generateTemplate = wrap(async (req, res) => {
  const { baseMessage } = schema.parse(req.body);

  const systemPrompt = `Você é um especialista em copywriting para WhatsApp Business.
Sua tarefa é criar uma mensagem de MARKETING via WhatsApp que:
- Converte leads qualificados em clientes pagantes
- Usa tom de urgência real (estoque limitado ou prazo curto), sem exageros
- Estimula o lead a responder diretamente na conversa com uma palavra simples

REGRAS OBRIGATÓRIAS:
1. Máximo de 1024 caracteres no body
2. Variáveis OBRIGATORIAMENTE no formato {{1}}, {{2}} — NUNCA [nome] ou {nome} ou %nome%
3. {{1}} reservado para o nome do cliente no início do body
4. NÃO incluir links, URLs ou botões clicáveis
5. Sem linguagem enganosa, promessas falsas ou spam
6. Sem conteúdo proibido: drogas, armas, apostas, serviços adultos, retorno financeiro garantido
7. Evitar excesso de maiúsculas e pontos de exclamação repetidos
8. Footer obrigatório: "Para não receber mais mensagens, responda SAIR"
9. O campo "button" NÃO é um link — é uma instrução de resposta que vai ao final da mensagem
   Exemplo: "Responda essa mensagem com SIM que um dos nossos corretores vai entrar em contato com você 😊"
   Adapte ao segmento do negócio, mas mantenha sempre a palavra SIM como gatilho de resposta

Responda SOMENTE com um JSON válido no formato:
{
  "template_name": "snake_case_descritivo",
  "category": "Marketing",
  "body": "texto completo com variáveis {{1}}, {{2}}...",
  "footer": "Para não receber mais mensagens, responda SAIR",
  "button": "instrução de resposta com SIM (1-2 linhas)",
  "justification": "2-3 linhas explicando as escolhas"
}`;

  const userPrompt = `Transforme esta mensagem base em um template Meta-aprovável:\n\n"${baseMessage}"`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  const raw = completion.choices[0].message.content ?? '{}';
  const result = JSON.parse(raw);

  res.json(result);
});
