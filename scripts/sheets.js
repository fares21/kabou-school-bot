export const SHEETS = {
  STUDENTS: 'Students',
  PARENTS: 'Parents',
  TEACHERS: 'Teachers',
  BROADCASTS: 'Broadcasts',
  LOGS: 'Logs'
};

// إضافة دالة لاسترجاع الأساتذة
export const SheetsRepo = {
  // ... الدوال الموجودة
  
  async listTeachersCached(cache) {
    const key = 'teachers_all';
    const cached = cache.get(key);
    if (cached) return cached;
    
    const rows = await readAll(SHEETS.TEACHERS);
    cache.set(key, rows);
    return rows;
  },
  
  async logAction(userType, userId, action) {
    const now = new Date().toLocaleString('ar-DZ', {
      timeZone: 'Africa/Algiers'
    });
    
    const logId = `LOG-${Date.now()}-${Math.floor(Math.random()*1e6)}`;
    
    await appendRow(SHEETS.LOGS, {
      'نوع المستخدم': userType,
      'معرف المستخدم': userId,
      'الإجراء': action,
      'التاريخ': now,
      'LogID': logId
    });
  }
};
