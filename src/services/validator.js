import { z } from 'zod';

export function normalizePhone(input) {
  if (!input) return '';
  let s = String(input).replace(/\s+/g, '').replace(/[^+\d]/g, '');
  
  if (s.startsWith('00213')) return `+${s.slice(2)}`;
  if (s.startsWith('0213')) return `+${s.slice(1)}`;
  if (s.startsWith('+213')) return s;
  if (s.startsWith('213')) return `+${s}`;
  if (s.startsWith('0')) return `+213${s.slice(1)}`;
  if (/^\d{9}$/.test(s)) return `+213${s}`;
  
  return s;
}

export const phoneSchema = z.string()
  .transform(normalizePhone)
  .refine((v) => /^\+213[567]\d{8}$/.test(v), {
    message: 'رقم هاتف جزائري غير صالح. يجب أن يبدأ بـ 05، 06، أو 07'
  });

export function safeText(input, maxLength = 512) {
  if (!input) return '';
  return String(input).slice(0, maxLength).trim();
}

export function escapeMd(text) {
  if (!text) return '';
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

export function validateStudentData(data) {
  const schema = z.object({
    name: z.string().min(3).max(100),
    phone: phoneSchema,
    year: z.string(),
    subjects: z.array(z.string()).min(1),
    teachers: z.array(z.string()).min(1)
  });
  
  return schema.parse(data);
}

export function validateParentData(data) {
  const schema = z.object({
    name: z.string().min(3).max(100),
    phone: phoneSchema,
    childKey: z.string().min(1)
  });
  
  return schema.parse(data);
}
