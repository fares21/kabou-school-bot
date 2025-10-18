// src/index.js
import { createBot } from './bot.js';
import { createServer } from './web/server.js';
import { ENV } from './config/env.js';
import { logger } from './services/logger.js';
import { AppCache } from './services/cache.js';
import { initDatabase } from './services/database.js';

async function main() {
  try {
    logger.info('Starting Kabou School Bot...');

    // 1) تهيئة قاعدة البيانات أولاً
    await initDatabase();
    logger.info('Database initialized');

    // 2) إنشاء البوت والسيرفر
    const bot = createBot();
    const app = createServer(bot);

    // 3) تشغيل خادم HTTP
    const server = app.listen(ENV.PORT, async () => {
      logger.info({ port: ENV.PORT, env: ENV.NODE_ENV }, 'HTTP server started');

      // 4) ضبط الويبهوك والتحقق منه
      try {
        const webhookUrl = `${ENV.WEBHOOK_DOMAIN}${ENV.WEBHOOK_PATH}`;

        await bot.telegram.setWebhook(webhookUrl, {
          secret_token: ENV.WEBHOOK_SECRET_TOKEN,
          drop_pending_updates: true,
          allowed_updates: ['message', 'callback_query']
        });

        logger.info({ webhookUrl }, 'Telegram webhook configured');

        const webhookInfo = await bot.telegram.getWebhookInfo();
        logger.info({ webhookInfo }, 'Webhook info');
      } catch (error) {
        logger.error({ error: error.message }, 'Failed to set webhook');
        throw error;
      }
    });

    // 5) تحديث الكاش كل 3 ساعات (اختياري)
    setInterval(() => {
      logger.info('Refreshing cache...');
      AppCache.del('students_all');
      AppCache.del('parents_all');
    }, 3 * 60 * 60 * 1000);

    // 6) إيقاف آمن
    const shutdown = async (signal) => {
      logger.info({ signal }, 'Shutdown signal received');

      server.close(async () => {
        try {
          await bot.telegram.deleteWebhook();
          logger.info('Webhook deleted');
        } catch (error) {
          logger.error({ error: error.message }, 'Error deleting webhook');
        }
        process.exit(0);
      });

      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // 7) أخطاء غير معالَجة
    process.on('unhandledRejection', (reason, promise) => {
      logger.error({ reason, promise }, 'Unhandled rejection');
    });

    process.on('uncaughtException', (error) => {
      logger.error({ error: error.message, stack: error.stack }, 'Uncaught exception');
      process.exit(1);
    });

  } catch (error) {
    logger.error({ error: error.message }, 'Failed to start bot');
    process.exit(1);
  }
}

main();
