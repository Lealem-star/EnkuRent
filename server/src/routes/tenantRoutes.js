import { Router } from 'express';
import {
  getTenants,
  getTenantById,
  createTenant,
  updateTenant,
  endTenancy,
  createTenantSchema,
  updateTenantSchema,
} from '../controllers/tenantController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(authenticate);

router.get('/', getTenants);
router.get('/:id', getTenantById);
router.post('/', authorize('OWNER', 'MANAGER'), validate(createTenantSchema), createTenant);
router.put('/:id', authorize('OWNER', 'MANAGER'), validate(updateTenantSchema), updateTenant);
router.post('/:id/end', authorize('OWNER'), endTenancy);

export default router;
