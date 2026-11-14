import { Router } from 'express';
import {
  getPlatformSettings,
  updatePlatformSettings,
} from '../controllers/platformSettingsController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// Publicly read settings or authenticated
router.get('/', getPlatformSettings);
router.put('/', authorize('SUPER_ADMIN'), updatePlatformSettings);

export default router;
