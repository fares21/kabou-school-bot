import { ENV } from '../config/env.js';
import { logger } from './logger.js';

export function verifyTelegramSecret(req, res, next) {
  const token = req.get('X-Telegram-Bot-Api-Secret-Token');
  
  if (token !== ENV.WEBHOOK_SECRET_TOKEN) {
    logger.warn({ ip: req.ip }, 'Unauthorized telegram webhook attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  return next();
}

export function verifyGsInternalToken(req, res, next) {
  const token = req.get('X-Internal-Token');
  
  if (token !== ENV.GS_INTERNAL_TOKEN) {
    logger.warn({ ip: req.ip }, 'Unauthorized GS webhook attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  return next();
}

export function sanitizeInput(input, maxLength = 1000) {
  if (!input) return '';
  return String(input)
    .slice(0, maxLength)
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}
