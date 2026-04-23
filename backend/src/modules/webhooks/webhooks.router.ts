import { Router } from 'express';
import { handleEvolutionWebhook } from './webhooks.controller';

const router = Router();

router.post('/evolution', handleEvolutionWebhook);

export default router;
