import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import { config } from './config/env.js';
import apiRoutes from './routes/index.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security HTTP headers with cross-origin resource policy for uploaded files
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration
const configuredClientUrls = (config.clientUrl || '')
  .split(',')
  .map((u) => u.trim().replace(/\/$/, ''))
  .filter(Boolean);

const allowedOrigins = [
  'https://enku-rent.vercel.app',
  ...configuredClientUrls,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:3000',
];

const isOriginAllowed = (origin) => {
  if (!origin) return true; // allow non-browser clients (mobile apps, curl, server-to-server)
  const cleanOrigin = origin.replace(/\/$/, '');
  if (allowedOrigins.includes(cleanOrigin)) return true;
  // Allow all Vercel preview/production deployments for enku-rent
  if (cleanOrigin.endsWith('.vercel.app') && cleanOrigin.includes('enku-rent')) return true;
  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-chapa-signature'],
  })
);

// Logging
if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
});
app.use('/api', limiter);

import { authenticate } from './middleware/auth.js';
import { getSecureDocument } from './controllers/documentController.js';

// Body parsing middleware with raw body preservation for webhook signature verification
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// Protected authenticated document delivery (enforces multi-tenant ownership & safe pathing)
app.get(
  ['/uploads/:filename', '/uploads/*', '/api/documents/:filename', '/api/documents/*'],
  authenticate,
  getSecureDocument
);

// Root welcome route
app.get('/', (req, res) => {
  res.json({
    name: 'Enqopa RentPro API',
    company: 'Enqopa Technologies PLC',
    tagline: 'Smart Rental Management, Made Easy',
    version: '1.0.0',
    status: 'Running',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      buildings: '/api/buildings',
      offices: '/api/offices',
      tenants: '/api/tenants',
      contracts: '/api/contracts',
      payments: '/api/payments',
      gateway: '/api/gateway',
      reports: '/api/reports',
      audit: '/api/audit',
      users: '/api/users',
    },
  });
});

// Mount all API routes under /api
app.use('/api', apiRoutes);

// 404 Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

export default app;
