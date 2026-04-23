import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import {
  listCampaigns,
  createCampaign,
  getCampaign,
  startCampaign,
  pauseCampaign,
  resumeCampaign,
  cancelCampaign,
} from './campaigns.controller';

const router = Router();

router.use(authenticate);
router.get('/', listCampaigns);
router.post('/', createCampaign);
router.get('/:id', getCampaign);
router.patch('/:id/start', startCampaign);
router.patch('/:id/pause', pauseCampaign);
router.patch('/:id/resume', resumeCampaign);
router.patch('/:id/cancel', cancelCampaign);

export default router;
