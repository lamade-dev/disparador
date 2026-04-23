import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import {
  listInstances,
  createInstance,
  getQrCode,
  getStatus,
  disconnectInstance,
  deleteInstance,
} from './instances.controller';

const router = Router();

router.use(authenticate);
router.get('/', listInstances);
router.post('/', createInstance);
router.get('/:id/qrcode', getQrCode);
router.get('/:id/status', getStatus);
router.post('/:id/disconnect', disconnectInstance);
router.delete('/:id', deleteInstance);

export default router;
