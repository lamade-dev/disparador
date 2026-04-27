import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { getDispatchConfig, updateDispatchConfig } from './dispatch-config.controller';

const router = Router();

router.use(authenticate);
router.get('/', getDispatchConfig);
router.put('/', requireRole('MASTER'), updateDispatchConfig);

export default router;
