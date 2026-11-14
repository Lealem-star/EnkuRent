import dotenv from 'dotenv';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

// Fail-fast startup validator for production security
export const validateEnv = () => {
  const missing = [];
  if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
  if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');

  if (isProduction) {
    if (process.env.JWT_SECRET && (process.env.JWT_SECRET.includes('sample') || process.env.JWT_SECRET.includes('super_secret') || process.env.JWT_SECRET.length < 32)) {
      throw new Error('FATAL SECURITY ERROR: JWT_SECRET in production must be a high-entropy secret of at least 32 characters.');
    }
    if (!process.env.CHAPA_SECRET_KEY || process.env.CHAPA_SECRET_KEY.includes('sample')) {
      throw new Error('FATAL SECURITY ERROR: Valid production CHAPA_SECRET_KEY must be configured.');
    }
  }

  if (missing.length > 0) {
    throw new Error(`FATAL CONFIGURATION ERROR: Missing required environment variable(s): ${missing.join(', ')}`);
  }
};

// Validate on module load
try {
  validateEnv();
} catch (err) {
  if (isProduction) {
    console.error(err.message);
    process.exit(1);
  } else {
    console.warn(`[Config Warning] ${err.message}`);
  }
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || (isProduction ? undefined : 'dev_jwt_secret_key_only_non_prod_2026'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
  chapaSecretKey: process.env.CHAPA_SECRET_KEY,
  chapaWebhookSecret: process.env.CHAPA_WEBHOOK_SECRET,
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
};

export default config;
