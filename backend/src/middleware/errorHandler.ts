import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Dados inválidos', details: err.flatten().fieldErrors });
    return;
  }

  console.error('[ERROR]', err.message, err.stack);
  res.status(500).json({ error: err.message || 'Erro interno do servidor' });
}
