import { Router } from 'express';
import {
  login,
  registerOwner,
  getMe,
  requestOtp,
  verifyOtp,
  resolvePortalOffice,
  loginSchema,
  registerOwnerSchema,
  requestOtpSchema,
  verifyOtpSchema,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.post('/login', validate(loginSchema), login);
router.post('/register-owner', validate(registerOwnerSchema), registerOwner);
router.get('/me', authenticate, getMe);
router.post('/otp/request', validate(requestOtpSchema), requestOtp);
router.post('/otp/verify', validate(verifyOtpSchema), verifyOtp);
router.get('/portal/o/:officeId', resolvePortalOffice);

export default router;
