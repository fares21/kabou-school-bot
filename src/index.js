import { createBot } from './bot.js';
import { createServer } from './web/server.js';
import { ENV } from './config/env.js';
import { logger } from './services/logger.js';
import { AppCache } from './services/cache.js';
import { initDatabase } from './services/database.js';

async function main() {
  try {
    logger.info('Starting Kabou School Bot...');

    // Initialize database first
    await initDatabase();
    logger.info('Database initialized');

    const bot = createBot();
    const app = createServer(bot);

    // Start HTTP server
    const server = app.listen(ENV.PORT, async () => {
      logger.info({
        port: ENV.PORT,
        env: ENV.NODE_ENV
      }, 'HTTP server started');

      // Set webhook
      try {
        const webhookUrl = `${ENV.WEBHOOK_DOMAIN}${ENV.WEBHOOK_PATH}`;
        
        await bot.telegram.setWebhook(webhookUrl, {
          secret_token: ENV.WEBHOOK_SECRET_TOKEN,
          drop_pending_updates: true,
          allowed_updates: ['message', 'callback_query']
        });

        logger.info({ webhookUrl }, 'Telegram webhook configured');

        // Verify webhook
        const webhookInfo = await bot.telegram.getWebhookInfo();
        logger.info({ webhookInfo }, 'Webhook info');

      } catch (error) {
        logger.error({ error: error.message }, 'Failed to set webhook');
        throw error;
      }
    });

    // Cache refresh interval (every 3 hours)
    setInterval(() => {
      logger.info('Refreshing cache...');
      AppCache.del('students_all');
      AppCache.del('parents_all');
    }, 3 * 60 * 60 * 1000);

    // Graceful shutdown
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

    // Unhandled errors
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
