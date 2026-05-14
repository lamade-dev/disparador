import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { getSettings, updateSettings } from './settings.controller';

const router = Router();

router.get('/', authenticate, requireRole('MASTER'), getSettings);
router.put('/', authenticate, requireRole('MASTER'), updateSettings);

export default router;
