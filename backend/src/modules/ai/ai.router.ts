import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { generateTemplate } from './ai.controller';

const router = Router();

router.use(authenticate);
router.post('/generate-template', generateTemplate);

export default router;
