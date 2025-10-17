import { Scenes, Markup } from 'telegraf';
import { ENV } from '../config/env.js';
import { YEARS } from '../config/constants.js';
import { escapeMd } from '../services/validator.js';
import { logger } from '../services/logger.js';

export function adminScene(cache) {
  const scene = new Scenes.BaseScene('admin');

  scene.enter(async (ctx) => {
    const userId = String(ctx.from?.id);
    
    if (!ENV.ADMIN_IDS.includes(userId)) {
      await ctx.reply('⛔ ليس لديك صلاحية الوصول إلى لوحة الإدارة.');
      return ctx.scene.leave();
    }

    await ctx.reply(
      '⚙️ لوحة المدير\n\nاختر نوع البث:',
      Markup.inlineKeyboard([
        [
          Markup.button.callback('👨‍🎓 للطلاب', 'adm:students'),
          Markup.button.callback('👨‍👩‍👧 للأولياء', 'adm:parents')
        ],
        [Markup.button.callback('🎓 حسب السنة', 'adm:year')],
        [Markup.button.callback('❌ إلغاء', 'adm:cancel')]
      ])
    );
  });

  scene.action('adm:students', async (ctx) => {
    ctx.scene.state.target = 'students';
    await ctx.editMessageText('📝 أرسل نص الرسالة للبث إلى جميع الطلاب:');
    ctx.scene.state.awaitingText = true;
    await ctx.answerCbQuery('✅ جاهز لاستقبال الرسالة');
  });

  scene.action('adm:parents', async (ctx) => {
    ctx.scene.state.target = 'parents';
    await ctx.editMessageText('📝 أرسل نص الرسالة للبث إلى جميع أولياء الأمور:');
    ctx.scene.state.awaitingText = true;
    await ctx.answerCbQuery('✅ جاهز لاستقبال الرسالة');
  });

  scene.action('adm:year', async (ctx) => {
    ctx.scene.state.target = 'year';
    
    const buttons = YEARS.map(year => [
      Markup.button.callback(year, `year:${year}`)
    ]);
    buttons.push([Markup.button.callback('❌ إلغاء', 'adm:cancel')]);
    
    await ctx.editMessageText(
      '🎓 اختر السنة الدراسية:',
      Markup.inlineKeyboard(buttons)
    );
    await ctx.answerCbQuery();
  });

  scene.action(/year:(.+)/, async (ctx) => {
    const year = ctx.match[1];
    ctx.scene.state.selectedYear = year;
    
    await ctx.editMessageText(
      `📝 السنة المختارة: ${year}\n\nأرسل نص الرسالة:`
    );
    ctx.scene.state.awaitingText = true;
    await ctx.answerCbQuery(`✅ تم اختيار: ${year}`);
  });

  scene.action('adm:cancel', async (ctx) => {
    await ctx.editMessageText('❌ تم الإلغاء');
    await ctx.answerCbQuery();
    return ctx.scene.leave();
  });

  scene.on('text', async (ctx) => {
    if (!ctx.scene.state.awaitingText) {
      return ctx.reply('⚠️ استخدم الأزرار للاختيار.');
    }

    const text = ctx.message.text;
    const md = escapeMd(text);
    const target = ctx.scene.state.target;

    try {
      let recipients = [];
      let description = '';

      if (target === 'students') {
        const students = await SheetsRepo.listStudentsCached(cache);
        recipients = students
          .map(s => s['TelegramID'])
          .filter(Boolean);
        description = 'جميع الطلاب';

      } else if (target === 'parents') {
        const parents = await SheetsRepo.listParentsCached(cache);
        recipients = parents
          .map(p => p['TelegramID'])
          .filter(Boolean);
        description = 'جميع أولياء الأمور';

      } else if (target === 'year') {
        const year = ctx.scene.state.selectedYear;
        const students = await SheetsRepo.listStudentsCached(cache);
        recipients = students
          .filter(s => s['السنة الدراسية'] === year)
          .map(s => s['TelegramID'])
          .filter(Boolean);
        description = `طلاب سنة ${year}`;
      }

      const uniqueRecipients = [...new Set(recipients)];
      
      if (uniqueRecipients.length === 0) {
        await ctx.reply('⚠️ لا يوجد مستلمون لهذه الفئة.');
        return ctx.scene.leave();
      }

      await ctx.reply(
        `📤 جاري إرسال الرسالة إلى ${uniqueRecipients.length} مستخدم من ${description}...`
      );

      let successCount = 0;
      let failCount = 0;

      for (const chatId of uniqueRecipients) {
        try {
          await ctx.telegram.sendMessage(chatId, md, {
            parse_mode: 'MarkdownV2'
          });
          successCount++;
          
          // تأخير بسيط لتجنب حدود Telegram
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          failCount++;
          logger.error({ chatId, error: error.message }, 'Broadcast failed');
        }
      }

      await ctx.reply(
        `✅ اكتمل البث!\n\n` +
        `📊 الإحصائيات:\n` +
        `• نجح: ${successCount}\n` +
        `• فشل: ${failCount}\n` +
        `• الإجمالي: ${uniqueRecipients.length}`
      );

      logger.info({
        adminId: ctx.from.id,
        target: description,
        successCount,
        failCount
      }, 'Broadcast completed');

    } catch (error) {
      logger.error({ error: error.message }, 'Broadcast error');
      await ctx.reply('❌ حدث خطأ أثناء البث. حاول مجددًا.');
    }

    return ctx.scene.leave();
  });

  return scene;
}

