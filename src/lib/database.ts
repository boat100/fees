import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// 数据库文件路径
const dbPath = path.join(process.cwd(), 'data', 'school_fees.db');

// 确保数据目录存在
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 创建数据库连接
const db = new Database(dbPath);

// 启用外键约束
db.pragma('foreign_keys = ON');

// 初始化数据表
export function initDatabase() {
  // 创建学生费用表
  db.exec(`
    CREATE TABLE IF NOT EXISTS student_fees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_name TEXT NOT NULL,
      student_name TEXT NOT NULL,
      tuition_fee REAL DEFAULT 0,
      lunch_fee REAL DEFAULT 0,
      nap_fee REAL DEFAULT 0,
      after_school_fee REAL DEFAULT 0,
      club_fee REAL DEFAULT 0,
      other_fee REAL DEFAULT 0,
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME
    )
  `);

  // 创建索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_student_fees_class_name ON student_fees(class_name);
    CREATE INDEX IF NOT EXISTS idx_student_fees_student_name ON student_fees(student_name);
  `);

  console.log('Database initialized successfully');
}

// 导出数据库实例
export { db };
