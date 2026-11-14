import { Router } from 'express';
import rateLimit from 'express-rate-limit';
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

// Strict rate limiter for authentication endpoints (prevents brute-force & credential stuffing)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // allow up to 60 auth requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  },
});

router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/register-owner', authLimiter, validate(registerOwnerSchema), registerOwner);
router.get('/me', authenticate, getMe);
router.post('/otp/request', authLimiter, validate(requestOtpSchema), requestOtp);
router.post('/otp/verify', authLimiter, validate(verifyOtpSchema), verifyOtp);
router.get('/portal/o/:officeId', resolvePortalOffice);

export default router;
