import { google } from 'googleapis';
import { ENV } from '../config/env.js';
import { SHEETS } from '../config/constants.js';
import { logger } from './logger.js';

let sheetsClient = null;
let authClient = null;

function getCredentials() {
  try {
    const json = Buffer.from(ENV.GOOGLE_SA_BASE64, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to parse service account credentials');
    throw new Error('Invalid GOOGLE_SA_BASE64 format');
  }
}

async function getAuthClient() {
  if (authClient) return authClient;
  
  try {
    const credentials = getCredentials();
    authClient = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    
    return authClient;
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to create auth client');
    throw error;
  }
}

export async function getSheets() {
  if (sheetsClient) return sheetsClient;
  
  try {
    const auth = await getAuthClient();
    sheetsClient = google.sheets({ version: 'v4', auth });
    logger.info('Google Sheets client initialized');
    return sheetsClient;
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to initialize sheets client');
    throw error;
  }
}

async function readAll(sheetName) {
  try {
    const sheets = await getSheets();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: ENV.SPREADSHEET_ID,
      range: `${sheetName}!A:Z`
    });
    
    const rows = response.data.values || [];
    if (rows.length === 0) return [];
    
    const [header, ...data] = rows;
    return data.map(row => 
      Object.fromEntries(header.map((h, i) => [h, row[i] || '']))
    );
  } catch (error) {
    logger.error({ sheetName, error: error.message }, 'Failed to read sheet');
    throw error;
  }
}

async function appendRow(sheetName, rowObj) {
  try {
    const sheets = await getSheets();
    const headers = await getHeaders(sheetName);
    const values = headers.map(h => rowObj[h] ?? '');
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: ENV.SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [values] }
    });
    
    logger.info({ sheetName, row: rowObj }, 'Row appended successfully');
  } catch (error) {
    logger.error({ sheetName, error: error.message }, 'Failed to append row');
    throw error;
  }
}

async function getHeaders(sheetName) {
  try {
    const sheets = await getSheets();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: ENV.SPREADSHEET_ID,
      range: `${sheetName}!1:1`
    });
    
    return (response.data.values && response.data.values[0]) || [];
  } catch (error) {
    logger.error({ sheetName, error: error.message }, 'Failed to get headers');
    throw error;
  }
}

function columnLetter(n) {
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - m) / 26);
  }
  return s;
}

export const SheetsRepo = {
  async listStudentsCached(cache) {
    const key = 'students_all';
    const cached = cache.get(key);
    if (cached) return cached;
    
    const rows = await readAll(SHEETS.STUDENTS);
    cache.set(key, rows);
    return rows;
  },
  
  async listParentsCached(cache) {
    const key = 'parents_all';
    const cached = cache.get(key);
    if (cached) return cached;
    
    const rows = await readAll(SHEETS.PARENTS);
    cache.set(key, rows);
    return rows;
  },
  
  async findStudentByPhone(cache, phone) {
    const list = await this.listStudentsCached(cache);
    return list.find(s => s['الهاتف'] === phone);
  },
  
  async findStudentById(cache, studentId) {
    const list = await this.listStudentsCached(cache);
    return list.find(s => s['StudentID'] === studentId);
  },
  
  async findParentByPhone(cache, phone) {
    const list = await this.listParentsCached(cache);
    return list.find(p => p['رقم الهاتف'] === phone);
  },
  
  async appendStudent(row) {
    await appendRow(SHEETS.STUDENTS, row);
  },
  
  async appendParent(row) {
    await appendRow(SHEETS.PARENTS, row);
  }
};
