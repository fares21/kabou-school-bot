import { logger } from '../services/logger.js';

export function telegrafErrorBoundary() {
  return async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      logger.error({
        error: error.message,
        stack: error.stack,
        userId: ctx.from?.id,
        updateType: ctx.updateType
      }, 'Bot error caught');
      
      try {
        await ctx.reply('حدث خطأ غير متوقع. حاول مجددًا لاحقًا.');
      } catch (replyError) {
        logger.error({ error: replyError.message }, 'Failed to send error message');
      }
    }
  };
}
