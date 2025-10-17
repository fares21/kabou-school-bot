import dotenv from 'dotenv';
dotenv.config();

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`❌ Missing required env var: ${name}`);
  return v;
}

function optional(name, defaultVal = '') {
  return process.env[name] || defaultVal;
}

export const ENV = {
  BOT_TOKEN: required('BOT_TOKEN'),
  WEBHOOK_DOMAIN: required('WEBHOOK_DOMAIN'),
  WEBHOOK_PATH: optional('WEBHOOK_PATH', '/telegram/webhook'),
  WEBHOOK_SECRET_TOKEN: required('WEBHOOK_SECRET_TOKEN'),
  ADMIN_IDS: required('ADMIN_IDS').split(',').map(s => s.trim()),
  SPREADSHEET_ID: required('SPREADSHEET_ID'),
  GOOGLE_SA_BASE64: required('GOOGLE_SA_BASE64'),
  GS_INTERNAL_TOKEN: required('GS_INTERNAL_TOKEN'),
  PORT: parseInt(optional('PORT', '10000'), 10),
  NODE_ENV: optional('NODE_ENV', 'development'),
  IS_PRODUCTION: optional('NODE_ENV', 'development') === 'production'
};
