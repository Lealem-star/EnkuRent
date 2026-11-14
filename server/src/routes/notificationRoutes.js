import { Router } from 'express';
import {
  getNotifications,
  createNotification,
  deleteNotification,
} from '../controllers/notificationController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getNotifications);
router.post('/', authorize('SUPER_ADMIN'), createNotification);
router.delete('/:id', authorize('SUPER_ADMIN'), deleteNotification);

export default router;
