import { SESSION_LIMITS } from '../config/constants.js';
import { logger } from '../services/logger.js';

export function sessionGuard() {
  return async (ctx, next) => {
    const sessionKey = 'bot_session';
    const now = Date.now();
    
    if (!ctx.session) ctx.session = {};
    
    const session = ctx.session[sessionKey] || {
      inputCount: 0,
      outputCount: 0,
      lastActivity: now
    };
    
    if (now - session.lastActivity > SESSION_LIMITS.inactivityMs) {
      session.inputCount = 0;
      session.outputCount = 0;
    }
    
    session.lastActivity = now;
    session.inputCount += 1;
    ctx.session[sessionKey] = session;
    
    if (session.inputCount > SESSION_LIMITS.maxUserInputs) {
      logger.warn({ userId: ctx.from?.id }, 'Session input limit exceeded');
      await ctx.reply('تم بلوغ الحد الأقصى من التفاعلات. أرسل /start لبدء جلسة جديدة.');
      return;
    }
    
    const originalReply = ctx.reply.bind(ctx);
    ctx.reply = async (...args) => {
      if (session.outputCount >= SESSION_LIMITS.maxBotOutputs) {
        logger.warn({ userId: ctx.from?.id }, 'Session output limit exceeded');
        return;
      }
      
      session.outputCount += 1;
      ctx.session[sessionKey] = session;
      return originalReply(...args);
    };
    
    return next();
  };
}
