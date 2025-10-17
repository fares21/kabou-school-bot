# 🎓 Kabou School Bot

بوت تلغرام احترافي لتسجيل الطلاب وأولياء الأمور مع نظام إشعارات تلقائي من Google Sheets.

## المميزات

- ✅ تسجيل الطلاب مع بيانات كاملة
- ✅ ربط أولياء الأمور بالطلاب
- ✅ إشعارات تلقائية من Google Sheets
- ✅ لوحة مدير للبث الجماعي
- ✅ حماية ضد الهجمات والإساءة
- ✅ دعم كامل لـ Render

## التثبيت السريع

### 1. استنساخ المشروع

git clone https://github.com/yourusername/kabou-school-bot.git
cd kabou-school-bot
npm install


### 2. إعداد Google Sheets

- أنشئ Spreadsheet جديد
- أضف ورقتين: `Students` و `Parents`
- أضف الأعمدة المطلوبة (راجع الوثائق)
- شارك الشيت مع Service Account

### 3. إعداد المتغيرات

انسخ `.env.example` إلى `.env` وعدّل القيم.

### 4. النشر على Render

- ارفع الكود على GitHub
- أنشئ Web Service جديد على Render
- اربطه بالـ Repository
- أضف Environment Variables
- انتظر اكتمال البناء

## الاستخدام

### للطلاب
/start → طالب → إدخال البيانات

### للمديرين
/admin → اختيار نوع البث

## الدعم

للمساعدة أو الاستفسارات، افتح Issue على GitHub.

## الترخيص

MIT License

