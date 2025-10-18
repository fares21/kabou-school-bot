// src/rateLimit.js
// نسخة No-Op لإلغاء أي حدود تفاعل كما طلبت
// يمكنك إبقاء هذه الدوال مستقبلاً لو رغبت بإضافة قيود خفيفة

// للاستخدام مع Telegraf (بوت تيليغرام)
export function userRateLimit() {
  return async (ctx, next) => {
    // لا قيود — تمرير مباشر
    return next();
  };
}

// للاستخدام مع Express (HTTP server)
export function httpRateLimit() {
  return (req, res, next) => {
    // لا قيود — تمرير مباشر
    return next();
  };
}
