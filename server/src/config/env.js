import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'super_secret_jwt_key_enkurent_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
  chapaSecretKey: process.env.CHAPA_SECRET_KEY || 'CHASECK_TEST-sample_chapa_key',
  chapaWebhookSecret: process.env.CHAPA_WEBHOOK_SECRET || 'chapa_webhook_secret',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
};

export default config;
