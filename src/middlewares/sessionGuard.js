import { SESSION_LIMITS } from '../config/constants.js';
import { logger } from '../services/logger.js';

export function sessionGuard() {
  return async (ctx, next) => {
    // استثناء scenes التسجيل من sessionGuard
    if (ctx.scene && (ctx.scene.current === 'student' || ctx.scene.current === 'parent')) {
      return next();
    }

    const sessionKey = 'bot_session';
    const now = Date.now();
    
    if (!ctx.session) ctx.session = {};
    
    const session = ctx.session[sessionKey] || {
      inputCount: 0,
      outputCount: 0,
      lastActivity: now
    };
    
    // إعادة تعيين العدادات بعد انتهاء مدة الخمول
    if (now - session.lastActivity > SESSION_LIMITS.inactivityMs) {
      session.inputCount = 0;
      session.outputCount = 0;
    }
    
    session.lastActivity = now;
    
    // عد فقط الرسائل النصية، ليس callback_query (ضغطات الأزرار)
    const isTextMessage = ctx.message && ctx.message.text;
    if (isTextMessage) {
      session.inputCount += 1;
    }
    
    ctx.session[sessionKey] = session;
    
    // التحقق من الحد الأقصى
    if (session.inputCount > SESSION_LIMITS.maxUserInputs) {
      logger.warn({ userId: ctx.from?.id }, 'Session input limit exceeded');
      await ctx.reply('⚠️ تم بلوغ الحد الأقصى من التفاعلات.\n\nأرسل /start لبدء جلسة جديدة.');
      return;
    }
    
    // تعديل ctx.reply لعد مخرجات البوت
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
