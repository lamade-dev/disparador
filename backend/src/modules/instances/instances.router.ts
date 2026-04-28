import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import {
  listInstances,
  createInstance,
  getQrCode,
  getStatus,
  disconnectInstance,
  deleteInstance,
  fixWebhook,
} from './instances.controller';

const router = Router();

router.use(authenticate, requireRole('MASTER'));
router.get('/', listInstances);
router.post('/', createInstance);
router.get('/:id/qrcode', getQrCode);
router.get('/:id/status', getStatus);
router.post('/:id/disconnect', disconnectInstance);
router.delete('/:id', deleteInstance);
router.post('/:id/fix-webhook', fixWebhook);

export default router;
