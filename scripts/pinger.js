// scripts/pinger.js
// يعمل كـ Cron Job على Render لإيقاظ خدمة الويب
const url = process.env.TARGET_URL;
if (!url) {
  console.error('Missing TARGET_URL env var');
  process.exit(1);
}

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 8000);

(async () => {
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'kabou-keep-alive' } });
    clearTimeout(timeout);
    console.log(`[KEEP-ALIVE] ${new Date().toISOString()} -> ${res.status}`);
    process.exit(0);
  } catch (e) {
    clearTimeout(timeout);
    console.error(`[KEEP-ALIVE-ERROR] ${new Date().toISOString()} -> ${e.message}`);
    // لا نفشل الـ Job حتى لا تتوقف
    process.exit(0);
  }
})();
