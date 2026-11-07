import { Router } from 'express';
import {
  getContracts,
  renewContract,
  changeRent,
} from '../controllers/contractController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getContracts);
router.post('/:id/renew', authorize('OWNER', 'MANAGER'), renewContract);
router.post('/:id/change-rent', authorize('OWNER', 'MANAGER'), changeRent);

export default router;

