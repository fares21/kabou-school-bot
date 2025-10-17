#!/usr/bin/env python3
"""
سكربت استيراد بيانات CSV إلى Google Sheets
للاستخدام مع Kabou School Bot
"""

import csv
import json
import base64
from google.oauth2 import service_account
from googleapiclient.discovery import build
import os

# إعدادات الاتصال
SPREADSHEET_ID = 'ضع_SPREADSHEET_ID_هنا'
SERVICE_ACCOUNT_BASE64 = 'ضع_GOOGLE_SA_BASE64_هنا'

# فك تشفير Service Account
credentials_json = base64.b64decode(SERVICE_ACCOUNT_BASE64).decode('utf-8')
credentials_dict = json.loads(credentials_json)

credentials = service_account.Credentials.from_service_account_info(
    credentials_dict,
    scopes=['https://www.googleapis.com/auth/spreadsheets']
)

service = build('sheets', 'v4', credentials=credentials)

def clear_sheet(sheet_name):
    """مسح محتوى الورقة"""
    service.spreadsheets().values().clear(
        spreadsheetId=SPREADSHEET_ID,
        range=f'{sheet_name}!A2:Z'
    ).execute()
    print(f'✅ تم مسح {sheet_name}')

def import_students():
    """استيراد الطلاب"""
    with open('students.csv', 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        rows = []
        
        for row in reader:
            rows.append([
                row['full_name'],                    # الاسم
                row['phone_number'],                 # الهاتف
                row['grade_year'],                   # السنة الدراسية
                row['subjects'],                     # المواد
                row['teachers'],                     # الأساتذة
                'طالب',                              # نوع المستخدم
                row['registered_at'],                # تاريخ التسجيل
                '',                                   # TelegramID (فارغ)
                row['student_id'],                   # StudentID
                '',                                   # الغيابات
                '',                                   # العلامات
                '',                                   # التنبيهات
                ''                                    # الملاحظات
            ])
    
    if rows:
        service.spreadsheets().values().append(
            spreadsheetId=SPREADSHEET_ID,
            range='Students!A2',
            valueInputOption='USER_ENTERED',
            body={'values': rows}
        ).execute()
        print(f'✅ تم استيراد {len(rows)} طالب')

def import_parents():
    """استيراد أولياء الأمور"""
    with open('parents.csv', 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        rows = []
        
        for row in reader:
            # الحصول على رقم هاتف الابن من students.csv
            child_phone = get_student_phone(row['linked_students'])
            
            rows.append([
                row['full_name'],                    # اسم ولي الأمر
                row['phone_number'],                 # رقم الهاتف
                child_phone,                         # رقم ابن
                'تم الربط' if row['verified'] == 'True' else 'غير مسجل',  # الحالة
                row['registered_at'],                # تاريخ التسجيل
                '',                                   # TelegramID (فارغ)
                row['parent_id']                     # ParentID
            ])
    
    if rows:
        service.spreadsheets().values().append(
            spreadsheetId=SPREADSHEET_ID,
            range='Parents!A2',
            valueInputOption='USER_ENTERED',
            body={'values': rows}
        ).execute()
        print(f'✅ تم استيراد {len(rows)} ولي أمر')

def import_teachers():
    """استيراد الأساتذة"""
    with open('teachers.csv', 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        rows = []
        
        for row in reader:
            rows.append([
                row['full_name'],                    # الاسم الكامل
                row['subjects'],                     # المواد
                row['phone_number'],                 # رقم الهاتف
                'نشط' if row['status'] == 'active' else 'غير نشط',  # الحالة
                row['teacher_id']                    # TeacherID
            ])
    
    if rows:
        service.spreadsheets().values().append(
            spreadsheetId=SPREADSHEET_ID,
            range='Teachers!A2',
            valueInputOption='USER_ENTERED',
            body={'values': rows}
        ).execute()
        print(f'✅ تم استيراد {len(rows)} أستاذ')

def import_broadcasts():
    """استيراد الإشعارات"""
    with open('broadcasts.csv', 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        rows = []
        
        for row in reader:
            target_ar = {
                'all': 'الجميع',
                'students': 'الطلاب',
                'parents': 'الأولياء'
            }.get(row['target'], row['target'])
            
            status_ar = {
                'sent': 'تم الإرسال',
                'pending': 'قيد الانتظار',
                'failed': 'فشل'
            }.get(row['status'], row['status'])
            
            rows.append([
                row['title'],                        # العنوان
                row['message'],                      # الرسالة
                target_ar,                           # الهدف
                status_ar,                           # الحالة
                row['created_at'],                   # تاريخ الإرسال
                row['broadcast_id']                  # BroadcastID
            ])
    
    if rows:
        service.spreadsheets().values().append(
            spreadsheetId=SPREADSHEET_ID,
            range='Broadcasts!A2',
            valueInputOption='USER_ENTERED',
            body={'values': rows}
        ).execute()
        print(f'✅ تم استيراد {len(rows)} إشعار')

def import_logs():
    """استيراد السجلات"""
    with open('logs.csv', 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        rows = []
        
        for row in reader:
            user_type_ar = {
                'student': 'طالب',
                'parent': 'ولي أمر',
                'teacher': 'أستاذ',
                'admin': 'مدير'
            }.get(row['user_type'], row['user_type'])
            
            rows.append([
                user_type_ar,                        # نوع المستخدم
                row['user_id'],                      # معرف المستخدم
                row['action'],                       # الإجراء
                row['timestamp'],                    # التاريخ
                row['log_id']                        # LogID
            ])
    
    if rows:
        service.spreadsheets().values().append(
            spreadsheetId=SPREADSHEET_ID,
            range='Logs!A2',
            valueInputOption='USER_ENTERED',
            body={'values': rows}
        ).execute()
        print(f'✅ تم استيراد {len(rows)} سجل')

def get_student_phone(student_id):
    """الحصول على رقم هاتف الطالب من معرفه"""
    with open('students.csv', 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['student_id'] == student_id:
                return row['phone_number']
    return ''

def main():
    print('🚀 بدء استيراد البيانات إلى Google Sheets...\n')
    
    try:
        # مسح البيانات القديمة (اختياري)
        # clear_sheet('Students')
        # clear_sheet('Parents')
        # clear_sheet('Teachers')
        # clear_sheet('Broadcasts')
        # clear_sheet('Logs')
        
        # استيراد البيانات
        import_students()
        import_parents()
        import_teachers()
        import_broadcasts()
        import_logs()
        
        print('\n✅ تم استيراد جميع البيانات بنجاح!')
        print(f'📊 رابط الشيت: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}')
        
    except Exception as e:
        print(f'❌ خطأ: {str(e)}')

if __name__ == '__main__':
    main()
