import { Scenes, Markup } from 'telegraf';
import { ENV } from '../config/env.js';
import { YEARS } from '../config/constants.js';
import { escapeMd } from '../services/validator.js';
import { logger } from '../services/logger.js';
import { db } from '../services/database.js';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getRecipients(target, selectedYear = null) {
  if (target === 'students') {
    const r = await db.query(
      "SELECT DISTINCT telegram_id FROM students WHERE telegram_id IS NOT NULL AND telegram_id <> ''"
    );
    return r.rows.map(x => String(x.telegram_id));
  }
  if (target === 'parents') {
    const r = await db.query(
      "SELECT DISTINCT telegram_id FROM parents WHERE telegram_id IS NOT NULL AND telegram_id <> ''"
    );
    return r.rows.map(x => String(x.telegram_id));
  }
  if (target === 'year' && selectedYear) {
    const r = await db.query(
      "SELECT DISTINCT telegram_id FROM students WHERE year = $1 AND telegram_id IS NOT NULL AND telegram_id <> ''",
      [selectedYear]
    );
    return r.rows.map(x => String(x.telegram_id));
  }
  return [];
}

async function sendInBatches(telegram, ids, message, options = {}) {
  let ok = 0, fail = 0;
  const unique = Array.from(new Set(ids));
  const baseDelay = options.baseDelayMs ?? 60;
  const penaltyDelay = options.penaltyDelayMs ?? 1500;

  for (const id of unique) {
    try {
      await telegram.sendMessage(id, message, { disable_web_page_preview: true, parse_mode: 'Markdown' });
      ok++;
      await sleep(baseDelay);
    } catch (e) {
      fail++;
      const msg = String(e?.message || e);
      logger.warn({ recipient: id, err: msg }, 'broadcast_send_failed');
      if (msg.includes('429') || msg.includes('Too Many Requests')) {
        await sleep(penaltyDelay);
      }
    }
  }
  return { ok, fail, total: unique.length };
}

export function adminScene(cache) {
  const scene = new Scenes.BaseScene('admin');

  scene.enter(async (ctx) => {
    try {
      const userId = String(ctx.from?.id);
      if (!ENV.ADMIN_IDS.includes(userId)) {
        await ctx.reply('⛔ ليس لديك صلاحية الوصول إلى لوحة الإدارة.');
        return ctx.scene.leave();
      }

      ctx.scene.state.target = null;
      ctx.scene.state.selectedYear = null;
      ctx.scene.state.awaitingText = false;
      ctx.scene.state.awaitingConfirm = false;
      ctx.scene.state.previewText = null;

      await ctx.reply(
        '⚙️ لوحة المدير

اختر نوع البث:',
        Markup.inlineKeyboard([
          [
            Markup.button.callback('👨‍🎓 للطلاب', 'adm:students'),
            Markup.button.callback('👨‍👩‍👧 للأولياء', 'adm:parents')
          ],
          [Markup.button.callback('🎓 حسب السنة', 'adm:year')],
          [Markup.button.callback('❌ إلغاء', 'adm:cancel')]
        ])
      );
    } catch (error) {
      logger.error({ error: error.message }, 'admin_enter_error');
      await ctx.reply('❌ حدث خطأ غير متوقع أثناء فتح لوحة الإدارة.');
      return ctx.scene.leave();
    }
  });

  scene.action('adm:students', async (ctx) => {
    try {
      ctx.scene.state.target = 'students';
      ctx.scene.state.awaitingText = true;
      ctx.scene.state.awaitingConfirm = false;
      ctx.scene.state.previewText = null;
      await ctx.editMessageText('📝 أرسل نص الرسالة للبث إلى جميع الطلاب:');
      await ctx.answerCbQuery('✅ جاهز لاستقبال الرسالة');
    } catch {
      await ctx.answerCbQuery('❌ فشل التحضير');
    }
  });

  scene.action('adm:parents', async (ctx) => {
    try {
      ctx.scene.state.target = 'parents';
      ctx.scene.state.awaitingText = true;
      ctx.scene.state.awaitingConfirm = false;
      ctx.scene.state.previewText = null;
      await ctx.editMessageText('📝 أرسل نص الرسالة للبث إلى جميع أولياء الأمور:');
      await ctx.answerCbQuery('✅ جاهز لاستقبال الرسالة');
    } catch {
      await ctx.answerCbQuery('❌ فشل التحضير');
    }
  });

  scene.action('adm:year', async (ctx) => {
    try {
      ctx.scene.state.target = 'year';
      ctx.scene.state.selectedYear = null;
      ctx.scene.state.awaitingText = false;
      ctx.scene.state.awaitingConfirm = false;
      ctx.scene.state.previewText = null;

      const buttons = YEARS.map(year => [Markup.button.callback(year, `year:${year}`)]);
      buttons.push([Markup.button.callback('❌ إلغاء', 'adm:cancel')]);

      await ctx.editMessageText('🎓 اختر السنة الدراسية:', Markup.inlineKeyboard(buttons));
      await ctx.answerCbQuery();
    } catch {
      await ctx.answerCbQuery('❌ فشل التحضير');
    }
  });

  scene.action(/year:(.+)/, async (ctx) => {
    try {
      const year = ctx.match[1];
      ctx.scene.state.selectedYear = year;
      ctx.scene.state.awaitingText = true;
      ctx.scene.state.awaitingConfirm = false;
      ctx.scene.state.previewText = null;
      await ctx.editMessageText(`📝 السنة المختارة: ${year}

أرسل نص الرسالة:`);
      await ctx.answerCbQuery(`✅ تم اختيار: ${year}`);
    } catch {
      await ctx.answerCbQuery('❌ فشل الاختيار');
    }
  });

  scene.action('adm:cancel', async (ctx) => {
    try {
      await ctx.editMessageText('❌ تم الإلغاء');
      await ctx.answerCbQuery();
    } finally {
      return ctx.scene.leave();
    }
  });

  scene.on('text', async (ctx) => {
    try {
      if (!ctx.scene.state.awaitingText || !ctx.scene.state.target) {
        return ctx.reply('⚠️ استخدم الأزرار لاختيار الفئة أولاً، ثم أرسل النص.');
      }

      const raw = ctx.message.text;
      const message = typeof escapeMd === 'function' ? escapeMd(raw) : raw;

      ctx.scene.state.previewText = message;
      ctx.scene.state.awaitingText = false;
      ctx.scene.state.awaitingConfirm = true;

      const targetLabel = ctx.scene.state.target === 'students'
        ? 'جميع الطلاب'
        : ctx.scene.state.target === 'parents'
          ? 'جميع أولياء الأمور'
          : `سنة: ${ctx.scene.state.selectedYear || 'غير محددة'}`;

      await ctx.reply(
        `📋 المعاينة:

${message}

📤 سيتم الإرسال إلى: ${targetLabel}

هل تريد المتابعة؟`,
        Markup.inlineKeyboard([
          [Markup.button.callback('✅ تأكيد الإرسال', 'bc:confirm')],
          [Markup.button.callback('❌ إلغاء', 'adm:cancel')]
        ])
      );
    } catch (error) {
      logger.error({ error: error.message }, 'admin_preview_error');
      await ctx.reply(`❌ حدث خطأ أثناء تجهيز المعاينة: ${error.message}`);
      return ctx.scene.leave();
    }
  });

  scene.action('bc:confirm', async (ctx) => {
    try {
      if (!ctx.scene.state.awaitingConfirm || !ctx.scene.state.previewText || !ctx.scene.state.target) {
        await ctx.answerCbQuery('⚠️ لا توجد رسالة مؤكدة للإرسال.');
        return;
      }

      const target = ctx.scene.state.target;
      const selectedYear = ctx.scene.state.selectedYear;
      const message = ctx.scene.state.previewText;

      const ids = await getRecipients(target, selectedYear);
      if (!ids.length) {
        await ctx.editMessageText('ℹ️ لا يوجد مستلمون لهذا البث حالياً.');
        ctx.scene.state.awaitingConfirm = false;
        return ctx.scene.leave();
      }

      await ctx.editMessageText(`🚀 جاري الإرسال إلى ${ids.length} مستلم...`);

      const res = await sendInBatches(ctx.telegram, ids, message, {
        baseDelayMs: 60,
        penaltyDelayMs: 1500
      });

      await ctx.reply(
        `✅ اكتمل البث

الإجمالي: ${res.total}
نجح: ${res.ok}
فشل: ${res.fail}`
      );

      logger.info({ target, selectedYear, ...res }, 'broadcast_completed');
    } catch (error) {
      logger.error({ error: error.message }, 'broadcast_confirm_error');
      await ctx.reply(`❌ حدث خطأ أثناء الإرسال: ${error.message}`);
    } finally {
      ctx.scene.state.awaitingConfirm = false;
      ctx.scene.state.previewText = null;
      ctx.scene.state.target = null;
      ctx.scene.state.selectedYear = null;
      return ctx.scene.leave();
    }
  });

  scene.on('callback_query', async (ctx) => {
    try { await ctx.answerCbQuery(); } catch {}
  });

  return scene;
}
