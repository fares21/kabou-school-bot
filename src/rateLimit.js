import { logger } from '../services/logger.js';

export function userRateLimit(windowMs = 3000, maxRequests = 3) {
  const userHits = new Map();
  
  // تنظيف دوري للذاكرة
  setInterval(() => {
    const now = Date.now();
    for (const [userId, data] of userHits.entries()) {
      if (now > data.resetAt + windowMs) {
        userHits.delete(userId);
      }
    }
  }, 60000);
  
  return async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) return next();
    
    const now = Date.now();
    const userData = userHits.get(userId) || { count: 0, resetAt: now + windowMs };
    
    if (now > userData.resetAt) {
      userData.count = 0;
      userData.resetAt = now + windowMs;
    }
    
    userData.count += 1;
    userHits.set(userId, userData);
    
    if (userData.count > maxRequests) {
      logger.warn({ userId }, 'Rate limit exceeded');
      return;
    }
    
    return next();
  };
}
