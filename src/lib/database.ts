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

// 数据库实例（单例）
let dbInstance: Database.Database | null = null;

// 获取数据库连接
function getDb(): Database.Database {
  if (!dbInstance || !dbInstance.open) {
    dbInstance = new Database(dbPath);
    dbInstance.pragma('foreign_keys = ON');
  }
  return dbInstance;
}

// 关闭并重置数据库连接（用于恢复数据库后）
export function resetDatabaseConnection(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // 忽略关闭错误
    }
    dbInstance = null;
  }
}

// 初始化数据表
export function initDatabase() {
  const db = getDb();
  
  // 创建学生费用表（应交费用）
  db.exec(`
    CREATE TABLE IF NOT EXISTS student_fees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_name TEXT NOT NULL,
      student_name TEXT NOT NULL,
      gender TEXT DEFAULT '男',
      nap_status TEXT DEFAULT '走读',
      enrollment_status TEXT DEFAULT '学籍',
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

  // 检查并添加新字段（兼容旧数据库）
  const tableInfo = db.prepare('PRAGMA table_info(student_fees)').all() as Array<{ name: string }>;
  const existingColumns = tableInfo.map(col => col.name);

  if (!existingColumns.includes('gender')) {
    db.exec('ALTER TABLE student_fees ADD COLUMN gender TEXT DEFAULT \'男\'');
    console.log('Added gender column');
  }
  if (!existingColumns.includes('nap_status')) {
    db.exec('ALTER TABLE student_fees ADD COLUMN nap_status TEXT DEFAULT \'走读\'');
    console.log('Added nap_status column');
  }
  if (!existingColumns.includes('enrollment_status')) {
    db.exec('ALTER TABLE student_fees ADD COLUMN enrollment_status TEXT DEFAULT \'学籍\'');
    console.log('Added enrollment_status column');
  }

  console.log('Database initialized successfully');
}

// 导出数据库实例（使用 getter 确保连接有效）
export const db = new Proxy({} as Database.Database, {
  get(_target, prop) {
    const database = getDb();
    const value = (database as unknown as Record<string, unknown>)[prop as string];
    if (typeof value === 'function') {
      return value.bind(database);
    }
    return value;
  }
});

// 费用类型映射（从常量文件重新导出，方便后端使用）
export { FEE_TYPE_MAP, FEE_TYPE_REVERSE_MAP } from './constants';
