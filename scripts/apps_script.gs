/**
 * Google Apps Script للشيت
 * يُرسل إشعارات تلقائية عند تعديل أعمدة محددة
 */

const CONFIG = {
  // حدّث هذا الرابط بعد نشر البوت على Render
  WEBHOOK_URL: 'https://your-app-name.onrender.com/gs-hook',
  
  // يجب أن يطابق GS_INTERNAL_TOKEN في متغيرات البيئة
  INTERNAL_TOKEN: 'your-internal-token-here',
  
  // اسم الورقة المراقبة
  WATCH_SHEET_NAME: 'Students',
  
  // الأعمدة التي تُطلق الإشعارات عند التعديل
  WATCH_COLUMNS: ['الغيابات', 'العلامات', 'التنبيهات', 'الملاحظات']
};

/**
 * يُنفّذ تلقائيًا عند أي تعديل في الشيت
 */
function onEdit(e) {
  try {
    // التحقق من وجود حدث التعديل
    if (!e || !e.range) {
      Logger.log('No edit event');
      return;
    }

    const sheet = e.range.getSheet();
    const sheetName = sheet.getName();

    // التحقق من اسم الورقة
    if (sheetName !== CONFIG.WATCH_SHEET_NAME) {
      Logger.log('Edit in different sheet: ' + sheetName);
      return;
    }

    const row = e.range.getRow();
    const col = e.range.getColumn();

    // تجاهل تعديلات الصف الأول (العناوين)
    if (row === 1) {
      Logger.log('Header row edited');
      return;
    }

    // الحصول على العناوين
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const columnName = headers[col - 1];

    // التحقق من أن العمود في قائمة المراقبة
    if (CONFIG.WATCH_COLUMNS.indexOf(columnName) === -1) {
      Logger.log('Column not watched: ' + columnName);
      return;
    }

    // الحصول على بيانات الصف المُعدّل
    const rowData = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
    const rowObject = {};
    
    headers.forEach((header, index) => {
      rowObject[header] = (rowData[index] || '').toString();
    });

    const studentPhone = rowObject['الهاتف'] || '';
    const studentId = rowObject['StudentID'] || '';
    const studentName = rowObject['الاسم'] || 'الطالب';
    const newValue = (e.value || rowObject[columnName] || '').toString();

    // بناء نص الإشعار حسب نوع العمود
    let message = '';
    
    if (columnName === 'الغيابات') {
      message = `📢 إشعار غياب\n\nتغيّب الطالب ${studentName} اليوم.\nالتفاصيل: ${newValue}`;
    } else if (columnName === 'العلامات') {
      message = `🎓 نتائج جديدة\n\nتم نشر نتائج جديدة للطالب ${studentName}\nالعلامة: ${newValue}`;
    } else if (columnName === 'التنبيهات') {
      message = `⚠️ تنبيه\n\nتنبيه للطالب ${studentName}\nالتفاصيل: ${newValue}`;
    } else if (columnName === 'الملاحظات') {
      message = `📄 ملاحظة جديدة\n\nملاحظة حول الطالب ${studentName}\nالملاحظة: ${newValue}`;
    } else {
      message = `🔔 تحديث\n\nتحديث جديد للطالب ${studentName}\nفي ${columnName}: ${newValue}`;
    }

    // إعداد البيانات للإرسال
    const payload = {
      studentPhone: studentPhone,
      studentId: studentId,
      message: message,
      target: 'both' // إرسال للطالب والأولياء
    };

    // إعداد طلب HTTP
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'X-Internal-Token': CONFIG.INTERNAL_TOKEN
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    // إرسال الطلب
    const response = UrlFetchApp.fetch(CONFIG.WEBHOOK_URL, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      Logger.log('Notification sent successfully for: ' + studentName);
    } else {
      Logger.log('Failed to send notification. Response code: ' + responseCode);
      Logger.log('Response: ' + response.getContentText());
    }

  } catch (error) {
    Logger.log('Error in onEdit: ' + error.toString());
  }
}

/**
 * دالة اختبار يدوية (اختيارية)
 */
function testNotification() {
  const testPayload = {
    studentPhone: '+213555123456',
    studentId: 'STU-1234567890-123456',
    message: '🧪 رسالة تجريبية من Apps Script',
    target: 'both'
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'X-Internal-Token': CONFIG.INTERNAL_TOKEN
    },
    payload: JSON.stringify(testPayload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(CONFIG.WEBHOOK_URL, options);
  Logger.log('Test response: ' + response.getContentText());
}
