// src/bot.js
import { Telegraf, Scenes, session } from 'telegraf';
import { ENV } from './config/env.js';
import { logger } from './services/logger.js';

// مشاهد التسجيل (تأكد من وجود هذه الملفات)
import { studentScene } from './flows/studentFlow.js';
import { parentScene } from './flows/parentFlow.js';

// مشهد الإدارة للبث (تأكد من وجوده كما أرسلته لك سابقاً)
import { adminScene } from './flows/adminScene.js';

// يمكنك إبقاء هذه الاستيرادات للمستقبل إن رغبت بقيود اختيارية
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

  // 3) لا قيود: تعطيل أي معدلات (حسب طلبك)
  // bot.use(userRateLimit());
  // bot.use(sessionGuard()); // لا تستخدمه طالما تريد تفاعلات غير محدودة

  // 4) الأوامر الأساسية
  bot.start(async (ctx) => {
    try {
      await ctx.reply(
        'مرحبًا! 👋
🎓 مرحبًا بك في بوت مدرسة كابو

اختر هويتك:',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '👨‍🎓 طالب', callback_data: 'role:student' }],
              [{ text: '👨‍👩‍👧 ولي أمر', callback_data: 'role:parent' }],
              ...(ENV.ADMIN_IDS.includes(String(ctx.from?.id))
                ? [[{ text: '⚙️ لوحة المدير', callback_data: 'role:admin' }]]
                : [])
            ]
          }
        }
      );
    } catch (e) {
      logger.error({ err: e.message }, 'start_command_error');
    }
  });

  // 5) انتقال إلى المشاهد حسب الاختيار
  bot.action('role:student', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('student');
  });

  bot.action('role:parent', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.scene.enter('parent');
  });

  bot.action('role:admin', async (ctx) => {
    await ctx.answerCbQuery();
    // التحقق من الصلاحية
    if (!ENV.ADMIN_IDS.includes(String(ctx.from?.id))) {
      return ctx.reply('⛔ ليس لديك صلاحية الوصول إلى لوحة الإدارة.');
    }
    return ctx.scene.enter('admin');
  });

  // 6) أمر مباشر للوصول للوحة الإدارة
  bot.command('admin', async (ctx) => {
    if (!ENV.ADMIN_IDS.includes(String(ctx.from?.id))) {
      return ctx.reply('⛔ ليس لديك صلاحية الوصول إلى لوحة الإدارة.');
    }
    return ctx.scene.enter('admin');
  });

  // 7) رد افتراضي عند النصوص خارج المشاهد
  bot.on('text', async (ctx, next) => {
    // اسمح للمشاهد بالتعامل أولًا
    return next();
  });

  // 8) معالجة أخطاء عامة للبوت
  bot.catch((err, ctx) => {
    logger.error({ err: err.message }, 'bot_global_error');
    // عدم إسكات، لكن بدون إسقاط العملية
  });

  return bot;
}
