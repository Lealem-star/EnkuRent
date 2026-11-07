import { Router } from 'express';
import {
  getUsers,
  inviteUser,
  updateUserBuildings,
  inviteUserSchema,
} from '../controllers/userController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(authenticate);
// Users and managers page is strictly OWNER-only
router.use(authorize('OWNER'));

router.get('/', getUsers);
router.post('/', validate(inviteUserSchema), inviteUser);
router.put('/:id', updateUserBuildings);

export default router;

