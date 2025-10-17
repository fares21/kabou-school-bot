import { Scenes } from 'telegraf';
import { phoneSchema, safeText, validateStudentData } from '../services/validator.js';
import { subjectsKeyboard, teachersKeyboard, yearsKeyboard } from './keyboards.js';
import { db } from '../services/database.js';
import { YEARS } from '../config/constants.js';
import { logger } from '../services/logger.js';

function generateId(prefix) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  return `${prefix}-${timestamp}-${random}`;
}

export function studentScene(cache) {
  const scene = new Scenes.BaseScene('student');

  scene.enter(async (ctx) => {
    ctx.scene.state.form = { 
      subjects: [], 
      teachers: [] 
    };
    await ctx.reply('📝 ما اسمك الكامل؟');
  });

  scene.on('text', async (ctx) => {
    const form = ctx.scene.state.form;

    if (!form.name) {
      form.name = safeText(ctx.message.text, 100);
      
      if (form.name.length < 3) {
        return ctx.reply('⚠️ الاسم قصير جدًا. أدخل اسمك الكامل (3 أحرف على الأقل).');
      }
      
      await ctx.reply('📱 ما رقم هاتفك؟\nمثال: 0555123456 أو 0666123456');
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
        const existing = await db.getStudent(form.phone);
        
        if (existing) {
          await ctx.reply('✅ أنت مسجّل مسبقًا في النظام.\n\nلن نكرر البيانات.');
          return ctx.scene.leave();
        }
        
        await ctx.reply(
          '🎓 في أي سنة تدرس؟',
          yearsKeyboard(form.year)
        );
      } catch (error) {
        logger.error({ error: error.message }, 'Error checking student');
        await ctx.reply('❌ حدث خطأ. حاول مجددًا.');
        return ctx.scene.leave();
      }
      
      return;
    }

    await ctx.reply('⚠️ استخدم الأزرار للاختيار.');
  });

  scene.action(/year:(.+)/, async (ctx) => {
    const value = ctx.match[1];
    const form = ctx.scene.state.form;

    if (value === 'done') {
      if (!form.year) {
        return ctx.answerCbQuery('⚠️ اختر سنة دراسية أولاً');
      }
      
      await ctx.editMessageText(
        `✅ السنة الدراسية: ${form.year}\n\n📚 اختر المواد الدراسية التي تتابعها:`,
        subjectsKeyboard([])
      );
      return ctx.answerCbQuery();
    }

    if (!YEARS.includes(value)) {
      return ctx.answerCbQuery('❌ خيار غير صحيح');
    }

    form.year = value;
    await ctx.editMessageReplyMarkup(yearsKeyboard(value).reply_markup);
    await ctx.answerCbQuery(`✅ تم اختيار: ${value}`);
  });

  scene.action(/subj:(.+)/, async (ctx) => {
    const value = ctx.match[1];
    const form = ctx.scene.state.form;

    if (value === 'done') {
      if (form.subjects.length === 0) {
        return ctx.answerCbQuery('⚠️ اختر مادة واحدة على الأقل');
      }
      
      await ctx.editMessageText(
        `✅ المواد المختارة: ${form.subjects.join(', ')}\n\n👨‍🏫 اختر الأساتذة الذين تتابع عندهم:`,
        teachersKeyboard([])
      );
      return ctx.answerCbQuery();
    }

    if (!form.subjects.includes(value)) {
      form.subjects.push(value);
    }

    await ctx.editMessageReplyMarkup(subjectsKeyboard(form.subjects).reply_markup);
    await ctx.answerCbQuery(`✅ أُضيفت: ${value}`);
  });

  scene.action(/tch:(.+)/, async (ctx) => {
    const value = ctx.match[1];
    const form = ctx.scene.state.form;

    if (value === 'done') {
      if (form.teachers.length === 0) {
        return ctx.answerCbQuery('⚠️ اختر أستاذًا واحدًا على الأقل');
      }

      try {
        validateStudentData({
          name: form.name,
          phone: form.phone,
          year: form.year,
          subjects: form.subjects,
          teachers: form.teachers
        });

        const studentId = generateId('STU');

        await db.addStudent({
          name: form.name,
          phone: form.phone,
          year: form.year,
          subjects: form.subjects.join(', '),
          teachers: form.teachers.join(', '),
          telegramId: String(ctx.from.id),
          studentId: studentId
        });

        cache.del('students_all');

        await ctx.editMessageText(
          '✅ تم تسجيلك بنجاح!\n\n' +
          `🆔 رقمك التعريفي: \`${studentId}\`\n\n` +
          '🔔 فعّل الإشعارات لتصلك تحديثات موادك وحضورك.',
          { parse_mode: 'Markdown' }
        );

        logger.info({ 
          userId: ctx.from.id, 
          studentId,
          name: form.name 
        }, 'Student registered successfully');

        return ctx.scene.leave();

      } catch (error) {
        logger.error({ error: error.message }, 'Failed to save student');
        await ctx.reply('❌ حدث خطأ أثناء التسجيل. حاول مجددًا.');
        return ctx.scene.leave();
      }
    }

    if (!form.teachers.includes(value)) {
      form.teachers.push(value);
    }

    await ctx.editMessageReplyMarkup(teachersKeyboard(form.teachers).reply_markup);
    await ctx.answerCbQuery(`✅ أُضيف: ${value}`);
  });

  scene.on('callback_query', async (ctx) => {
    await ctx.answerCbQuery();
  });

  return scene;
}
