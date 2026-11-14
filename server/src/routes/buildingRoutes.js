import { Router } from 'express';
import {
  getBuildings,
  getBuildingById,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  createBuildingSchema,
} from '../controllers/buildingController.js';
import { authenticate, authorize, checkBuildingAccess } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(authenticate);

router.get('/', getBuildings);
router.get('/:id', checkBuildingAccess('id'), getBuildingById);
router.post('/', authorize('OWNER', 'MANAGER'), validate(createBuildingSchema), createBuilding);
router.put('/:id', authorize('OWNER'), checkBuildingAccess('id'), updateBuilding);
router.delete('/:id', authorize('OWNER'), checkBuildingAccess('id'), deleteBuilding);

export default router;

