import { Markup } from 'telegraf';
import { STUDENT_SUBJECTS, TEACHERS, YEARS } from '../config/constants.js';

export function roleKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('👨‍🎓 طالب', 'role:student'),
      Markup.button.callback('👨‍👩‍👧 ولي أمر', 'role:parent')
    ]
  ]);
}

export function yearsKeyboard(selected) {
  const buttons = YEARS.map(year => [
    Markup.button.callback(
      selected === year ? `✅ ${year}` : year,
      `year:${year}`
    )
  ]);
  
  buttons.push([Markup.button.callback('تم ✅', 'year:done')]);
  return Markup.inlineKeyboard(buttons);
}

export function multiSelectKeyboard(options, selected, prefix) {
  const remaining = options.filter(opt => !selected.includes(opt));
  const buttons = [];
  
  for (let i = 0; i < remaining.length; i += 2) {
    const row = remaining.slice(i, i + 2).map(opt =>
      Markup.button.callback(opt, `${prefix}:${opt}`)
    );
    buttons.push(row);
  }
  
  if (selected.length > 0) {
    buttons.push([Markup.button.callback('تم ✅', `${prefix}:done`)]);
  }
  
  return Markup.inlineKeyboard(buttons);
}

export const subjectsKeyboard = (selected) => 
  multiSelectKeyboard(STUDENT_SUBJECTS, selected, 'subj');

export const teachersKeyboard = (selected) => 
  multiSelectKeyboard(TEACHERS, selected, 'tch');
