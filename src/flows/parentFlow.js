import { Scenes } from 'telegraf';
import { phoneSchema, safeText, validateParentData } from '../services/validator.js';
import { db } from '../services/database.js';
import { logger } from '../services/logger.js';

function generateId(prefix) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  return `${prefix}-${timestamp}-${random}`;
}

export function parentScene(cache) {
  const scene = new Scenes.BaseScene('parent');

  scene.enter(async (ctx) => {
    ctx.scene.state.form = {};
    await ctx.reply('📝 ما اسمك الكامل؟');
  });

  scene.on('text', async (ctx) => {
    const form = ctx.scene.state.form;

    if (!form.name) {
      form.name = safeText(ctx.message.text, 100);
      
      if (form.name.length < 3) {
        return ctx.reply('⚠️ الاسم قصير جدًا. أدخل اسمك الكامل (3 أحرف على الأقل).');
      }
      
      await ctx.reply('📱 ما رقم هاتفك الشخصي؟\nمثال: 0555123456');
      return;
    }

    if (!form.phone) {
      const parseResult = phoneSchema.safeParse(ctx.message.text);
      
      if (!parseResult.success) {
        return ctx.reply(
          '❌ رقم غير صالح.\n\n' +
          'أدخل رقم هاتف جزائري صحيح:\n' +
          '• يبدأ بـ 05، 06، أو 07\n' +
          '• مثال: 0555123456'
        );
      }
      
      form.phone = parseResult.data;

      try {
        const existing = await SheetsRepo.findParentByPhone(cache, form.phone);
        
        if (existing) {
          await ctx.reply('✅ تم العثور على سجل ولي أمر سابق.\n\nلن نكرر البيانات.');
          return ctx.scene.leave();
        }
        
        await ctx.reply(
          '👦 أدخل رقم هاتف ابنك أو الرقم التعريفي الخاص به:\n\n' +
          '• رقم الهاتف: مثال 0555123456\n' +
          '• أو الرقم التعريفي: مثال STU-1234567890-123456'
        );
        
      } catch (error) {
        logger.error({ error: error.message }, 'Error checking parent');
        await ctx.reply('❌ حدث خطأ. حاول مجددًا.');
        return ctx.scene.leave();
      }
      
      return;
    }

    if (!form.childKey) {
      const rawInput = ctx.message.text.trim();
      let child = null;

      try {
        const phoneResult = phoneSchema.safeParse(rawInput);
        
        if (phoneResult.success) {
          const phone = phoneResult.data;
          child = await SheetsRepo.findStudentByPhone(cache, phone);
        } else if (rawInput.startsWith('STU-')) {
          child = await SheetsRepo.findStudentById(cache, rawInput);
        }

        const now = new Date().toLocaleString('ar-DZ', {
          timeZone: 'Africa/Algiers'
        });
        
        const parentId = generateId('PAR');

        if (child) {
          await SheetsRepo.appendParent({
            'اسم ولي الأمر': form.name,
            'رقم الهاتف': form.phone,
            'رقم ابن': child['الهاتف'] || '',
            'الحالة': 'تم الربط',
            'تاريخ التسجيل': now,
            'TelegramID': String(ctx.from.id),
            'ParentID': parentId
          });

          cache.del('parents_all');

          await ctx.reply(
            '✅ تم ربط حسابك بابنك بنجاح!\n\n' +
            `👦 الاسم: ${child['الاسم']}\n` +
            `📚 السنة: ${child['السنة الدراسية']}\n` +
            `🆔 رقمك التعريفي: \`${parentId}\`\n\n` +
            '🔔 سيصلك إشعار بأي تحديثات خاصة بابنك.',
            { parse_mode: 'Markdown' }
          );

          logger.info({ 
            userId: ctx.from.id, 
            parentId,
            childName: child['الاسم']
          }, 'Parent linked successfully');

        } else {
          await SheetsRepo.appendParent({
            'اسم ولي الأمر': form.name,
            'رقم الهاتف': form.phone,
            'رقم ابن': rawInput,
            'الحالة': 'غير مسجل',
            'تاريخ التسجيل': now,
            'TelegramID': String(ctx.from.id),
            'ParentID': parentId
          });

          cache.del('parents_all');

          await ctx.reply(
            '⚠️ الرقم غير موجود في النظام.\n\n' +
            'يرجى التوجه إلى المؤسسة لتسجيل ابنك أولاً.\n\n' +
            `🆔 رقمك التعريفي: \`${parentId}\``,
            { parse_mode: 'Markdown' }
          );

          logger.warn({ 
            userId: ctx.from.id, 
            parentId,
            childKey: rawInput
          }, 'Parent registered but child not found');
        }

        return ctx.scene.leave();

      } catch (error) {
        logger.error({ error: error.message }, 'Failed to save parent');
        await ctx.reply('❌ حدث خطأ أثناء التسجيل. حاول مجددًا.');
        return ctx.scene.leave();
      }
    }
  });


  return scene;
}



