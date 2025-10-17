import { Telegraf, Scenes, session } from 'telegraf';
import { ENV } from './config/env.js';
import { logger } from './services/logger.js';
import { roleKeyboard } from './flows/keyboards.js';
import { userRateLimit } from './middlewares/rateLimit.js';
import { telegrafErrorBoundary } from './middlewares/errorHandler.js';
import { sessionGuard } from './middlewares/sessionGuard.js';
import { studentScene } from './flows/studentFlow.js';
import { parentScene } from './flows/parentFlow.js';
import { adminScene } from './flows/adminPanel.js';
import { AppCache } from './services/cache.js';

export function createBot() {
  const bot = new Telegraf(ENV.BOT_TOKEN, {
    handlerTimeout: 15000
  });

  const stage = new Scenes.Stage([
    studentScene(AppCache),
    parentScene(AppCache),
    adminScene(AppCache)
  ]);

  bot.catch((err, ctx) => {
    logger.error({
      error: err.message,
      stack: err.stack,
      updateType: ctx.updateType
    }, 'Unhandled bot error');
  });

  bot.use(telegrafErrorBoundary());
  bot.use(session());
  bot.use(userRateLimit());
  bot.use(sessionGuard());
  bot.use(stage.middleware());

  bot.start(async (ctx) => {
    const firstName = ctx.from.first_name || 'مستخدم';
    
    await ctx.reply(
      `مرحبًا ${firstName}! 👋\n\n` +
      '🎓 مرحبًا بك في بوت مدرسة كابو\n\n' +
      'هل أنت:',
      roleKeyboard()
    );
  });

  bot.action('role:student', async (ctx) => {
    await ctx.answerCbQuery('✅ بدء تسجيل الطالب');
    await ctx.editMessageText('👨‍🎓 بدء تسجيل الطالب...');
    await ctx.scene.enter('student');
  });

  bot.action('role:parent', async (ctx) => {
    await ctx.answerCbQuery('✅ بدء تسجيل ولي الأمر');
    await ctx.editMessageText('👨‍👩‍👧 بدء تسجيل ولي الأمر...');
    await ctx.scene.enter('parent');
  });

  bot.command('admin', async (ctx) => {
    await ctx.scene.enter('admin');
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(
      '📖 الأوامر المتاحة:\n\n' +
      '/start - بدء التسجيل\n' +
      '/help - عرض المساعدة\n' +
      '/admin - لوحة المدير (للمديرين فقط)\n\n' +
      '💡 للاستفسارات، تواصل مع إدارة المدرسة.'
    );
  });

  bot.on('callback_query', async (ctx) => {
    try {
      await ctx.answerCbQuery();
    } catch (error) {
      logger.debug({ error: error.message }, 'Callback query already answered');
    }
  });

  bot.on('message', async (ctx) => {
    logger.debug({
      userId: ctx.from.id,
      messageType: ctx.message.text ? 'text' : 'other'
    }, 'Unhandled message');
  });

  return bot;
}
