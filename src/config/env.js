import dotenv from 'dotenv';
dotenv.config();

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`❌ Missing required env var: ${name}`);
  return v;
}

export const ENV = {
  BOT_TOKEN: required('BOT_TOKEN'),
  WEBHOOK_DOMAIN: required('WEBHOOK_DOMAIN'),
  WEBHOOK_PATH: process.env.WEBHOOK_PATH || '/telegram/webhook',
  WEBHOOK_SECRET_TOKEN: required('WEBHOOK_SECRET_TOKEN'),
  ADMIN_IDS: required('ADMIN_IDS').split(',').map(s => s.trim()),
  DATABASE_URL: required('DATABASE_URL'),
  PORT: parseInt(process.env.PORT || '10000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production'
};
