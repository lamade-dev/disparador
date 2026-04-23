import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { getStats } from './dashboard.controller';

const router = Router();

router.use(authenticate);
router.get('/stats', getStats);

export default router;
