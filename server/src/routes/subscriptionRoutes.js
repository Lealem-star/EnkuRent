import { Router } from 'express';
import {
  getSubscriptions,
  getSubscriptionById,
  assignSubscription,
  updateSubscriptionStatus,
  getMySubscription,
} from '../controllers/subscriptionController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// Owners can check their own subscription status
router.get('/my-subscription', getMySubscription);

// Platform Super Admin routes
router.get('/', authorize('SUPER_ADMIN'), getSubscriptions);
router.get('/:id', authorize('SUPER_ADMIN'), getSubscriptionById);
router.post('/assign', authorize('SUPER_ADMIN'), assignSubscription);
router.patch('/:id/status', authorize('SUPER_ADMIN'), updateSubscriptionStatus);

export default router;
