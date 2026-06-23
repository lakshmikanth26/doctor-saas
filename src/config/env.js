import 'dotenv/config';

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3004', 10),
  APP_NAME: process.env.APP_NAME || 'Mednest',

  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,

  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@mednest.app',

  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,

  WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN,
  WHATSAPP_PHONE_ID: process.env.WHATSAPP_PHONE_ID,

  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  SUPABASE_JWKS_URL: process.env.SUPABASE_JWKS_URL,
};

const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL'];

export function getEnvStatus() {
  const missing = required.filter((k) => !process.env[k]);
  return { ok: missing.length === 0, missing };
}

export function validateEnv() {
  const { ok, missing } = getEnvStatus();
  if (!ok) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}
