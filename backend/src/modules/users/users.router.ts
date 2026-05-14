import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { listUsers, createUser, updateUser, updateQuota, deleteUser } from './users.controller';

const router = Router();

router.use(authenticate, requireRole('MASTER'));
router.get('/', listUsers);
router.post('/', createUser);
router.patch('/:id', updateUser);
router.patch('/:id/quota', updateQuota);
router.delete('/:id', deleteUser);

export default router;
