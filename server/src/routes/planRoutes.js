import { Router } from 'express';
import {
  getPlans,
  getPlanById,
  createPlan,
  updatePlan,
  togglePlanStatus,
} from '../controllers/planController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Allow authenticated users to view active plans; only SUPER_ADMIN can modify
router.use(authenticate);

router.get('/', getPlans);
router.get('/:id', getPlanById);

// Admin only mutations
router.post('/', authorize('SUPER_ADMIN'), createPlan);
router.put('/:id', authorize('SUPER_ADMIN'), updatePlan);
router.patch('/:id/toggle-status', authorize('SUPER_ADMIN'), togglePlanStatus);

export default router;
