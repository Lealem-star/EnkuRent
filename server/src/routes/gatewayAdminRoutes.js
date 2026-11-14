import { Router } from 'express';
import {
  getGateways,
  updateGateway,
  testGatewayConnection,
} from '../controllers/gatewayAdminController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, authorize('SUPER_ADMIN'));

router.get('/', getGateways);
router.put('/:provider', updateGateway);
router.post('/:provider/test', testGatewayConnection);

export default router;
