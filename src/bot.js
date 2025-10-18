// src/bot.js
import { Telegraf, Scenes, session } from 'telegraf';
import { ENV } from './config/env.js';
import { logger } from './services/logger.js';

// مشاهد التسجيل (تأكد من وجود هذه الملفات)
import { studentScene } from './flows/studentFlow.js';
import { parentScene } from './flows/parentFlow.js';

// مشهد الإدارة للبث (نسختُه الأحدث تعمل مع PostgreSQL فقط)
import { adminScene } from './flows/adminScene.js';

// لا نستخدم أي قيود لكي تكون التفاعلات غير محدودة كما طلبت
// import { userRateLimit } from './rateLimit.js';
// import { sessionGuard } from './middlewares/sessionGuard.js';

export function createBot() {
  const bot = new Telegraf(ENV.BOT_TOKEN);

  // 1) تفعيل الجلسات — ضروري للمشاهد ولوحة الإدارة
  bot.use(session());

  // 2) تسجيل المشاهد
  const stage = new Scenes.Stage([
    studentScene(/* cache إن لزم */),
    parentScene(/* cache إن لزم */),
    adminScene(/* cache إن لزم */)
  ]);
  bot.use(stage.middleware());

  // 3) لا قيود: عطّل أي Rate Limit أو Session Guard
  // bot.use(userRateLimit());
  // bot.use(sessionGuard());

  // 4) أمر البدء برسالة سليمة خالية من أخطاء السلاسل المتعددة الأسطر
  bot.start(async (ctx) => {
    try {
      const text = `مرحبًا! 👋
🎓 مرحبًا بك في بوت مدرسة كابو

اختر هويتك:`;

      const keyboard = {
        inline_keyboard: [
          [{ text: '👨‍🎓 طالب', callback_data: 'role:student' }],
          [{ text: '👨‍👩‍👧 ولي أمر', callback_data: 'role:parent' }]
        ]
      };

      if (ENV.ADMIN_IDS.includes(String(ctx.from?.id))) {
        keyboard.inline_keyboard.push([{ text: '⚙️ لوحة المدير', callback_data: 'role:admin' }]);
      }

      await ctx.reply(text, { reply_markup: keyboard });
    } catch (e) {
      logger.error({ err: e.message }, 'start_command_error');
    }
  });

  // 5) الانتقال إلى مشهد الطالب
  bot.action('role:student', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('student');
  });

  // 6) الانتقال إلى مشهد ولي الأمر
  bot.action('role:parent', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('parent');
  });

  // 7) الانتقال إلى لوحة الإدارة (للإداريين فقط)
  bot.action('role:admin', async (ctx) => {
    await ctx.answerCbQuery();
    if (!ENV.ADMIN_IDS.includes(String(ctx.from?.id))) {
      return ctx.reply('⛔ ليس لديك صلاحية الوصول إلى لوحة الإدارة.');
    }
    return ctx.scene.enter('admin');
  });

  // 8) أمر مباشر للوصول للوحة الإدارة
  bot.command('admin', async (ctx) => {
    if (!ENV.ADMIN_IDS.includes(String(ctx.from?.id))) {
      return ctx.reply('⛔ ليس لديك صلاحية الوصول إلى لوحة الإدارة.');
    }
    return ctx.scene.enter('admin');
  });

  // 9) توجيه النصوص إلى المشاهد أولاً
  bot.on('text', async (ctx, next) => {
    return next();
  });

  // 10) معالجة أخطاء عامة للبوت
  bot.catch((err, ctx) => {
    logger.error({ err: err.message }, 'bot_global_error');
  });

  return bot;
}
