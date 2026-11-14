import { Router } from 'express';
import {
  getGlobalUsers,
  toggleUserStatus,
  forcePasswordReset,
} from '../controllers/globalUserController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, authorize('SUPER_ADMIN'));

router.get('/', getGlobalUsers);
router.patch('/:id/toggle-status', toggleUserStatus);
router.post('/:id/reset-password', forcePasswordReset);

export default router;
