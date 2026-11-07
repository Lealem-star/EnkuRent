import { Router } from 'express';
import {
  getSystemOverview,
  getOwnersList,
  approveOwner,
  rejectOwner,
  toggleOwnerStatus,
} from '../controllers/systemController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// All system routes require authentication and SUPER_ADMIN role
router.use(authenticate, authorize('SUPER_ADMIN'));

router.get('/overview', getSystemOverview);
router.get('/owners', getOwnersList);
router.post('/owners/:id/approve', approveOwner);
router.post('/owners/:id/reject', rejectOwner);
router.patch('/owners/:id/toggle-status', toggleOwnerStatus);

export default router;

