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
  // 创建学生费用表（应交费用）
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

  // 创建交费记录表（支持多次交费）
  db.exec(`
    CREATE TABLE IF NOT EXISTS payment_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      fee_type TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES student_fees(id) ON DELETE CASCADE
    )
  `);

  // 创建索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_student_fees_class_name ON student_fees(class_name);
    CREATE INDEX IF NOT EXISTS idx_student_fees_student_name ON student_fees(student_name);
    CREATE INDEX IF NOT EXISTS idx_payment_records_student_id ON payment_records(student_id);
    CREATE INDEX IF NOT EXISTS idx_payment_records_fee_type ON payment_records(fee_type);
  `);

  console.log('Database initialized successfully');
}

// 导出数据库实例
export { db };

// 费用类型映射
export const FEE_TYPE_MAP: Record<string, string> = {
  tuition: '学费',
  lunch: '午餐费',
  nap: '午托费',
  after_school: '课后服务费',
  club: '社团费',
  other: '其他费用',
};

export const FEE_TYPE_REVERSE_MAP: Record<string, string> = {
  '学费': 'tuition',
  '午餐费': 'lunch',
  '午托费': 'nap',
  '课后服务费': 'after_school',
  '社团费': 'club',
  '其他费用': 'other',
};
