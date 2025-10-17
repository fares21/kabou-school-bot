import pg from 'pg';
import { ENV } from '../config/env.js';
import { logger } from './logger.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: ENV.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export const db = {
  async query(text, params) {
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug({ text, duration, rows: res.rowCount }, 'Query executed');
      return res;
    } catch (error) {
      logger.error({ text, error: error.message }, 'Query failed');
      throw error;
    }
  },

  async getStudent(phone) {
    const result = await this.query(
      'SELECT * FROM students WHERE phone = $1',
      [phone]
    );
    return result.rows[0];
  },

  async getStudentById(studentId) {
    const result = await this.query(
      'SELECT * FROM students WHERE student_id = $1',
      [studentId]
    );
    return result.rows[0];
  },

  async addStudent(data) {
    const result = await this.query(
      `INSERT INTO students (name, phone, year, subjects, teachers, telegram_id, student_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [data.name, data.phone, data.year, data.subjects, data.teachers, data.telegramId, data.studentId]
    );
    return result.rows[0];
  },

  async getParent(phone) {
    const result = await this.query(
      'SELECT * FROM parents WHERE phone = $1',
      [phone]
    );
    return result.rows[0];
  },

  async addParent(data) {
    const result = await this.query(
      `INSERT INTO parents (name, phone, child_phone, status, telegram_id, parent_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [data.name, data.phone, data.childPhone, data.status, data.telegramId, data.parentId]
    );
    return result.rows[0];
  },

  async getAllStudents() {
    const result = await this.query('SELECT * FROM students ORDER BY created_at DESC');
    return result.rows;
  },

  async getAllParents() {
    const result = await this.query('SELECT * FROM parents ORDER BY created_at DESC');
    return result.rows;
  }
};

export async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) UNIQUE NOT NULL,
        year VARCHAR(50),
        subjects TEXT,
        teachers TEXT,
        telegram_id VARCHAR(50),
        student_id VARCHAR(50) UNIQUE,
        absences TEXT,
        grades TEXT,
        warnings TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS parents (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) UNIQUE NOT NULL,
        child_phone VARCHAR(20),
        status VARCHAR(50),
        telegram_id VARCHAR(50),
        parent_id VARCHAR(50) UNIQUE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_students_phone ON students(phone);
      CREATE INDEX IF NOT EXISTS idx_students_id ON students(student_id);
      CREATE INDEX IF NOT EXISTS idx_students_telegram ON students(telegram_id);
      CREATE INDEX IF NOT EXISTS idx_parents_phone ON parents(phone);
      CREATE INDEX IF NOT EXISTS idx_parents_child ON parents(child_phone);
    `);
    
    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error({ error: error.message }, 'Database initialization failed');
    throw error;
  }
}
