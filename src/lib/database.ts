import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// 支出类别常量
export const EXPENSE_CATEGORIES = {
  DAILY: 'daily',      // 日常公用支出
  PERSONNEL: 'personnel' // 人员支出
} as const;

export const EXPENSE_CATEGORY_NAMES: Record<string, string> = {
  [EXPENSE_CATEGORIES.DAILY]: '日常公用支出',
  [EXPENSE_CATEGORIES.PERSONNEL]: '人员支出'
};

// 日常公用支出子项目
export const DAILY_EXPENSE_ITEMS = [
  '办公费用',
  '财务费',
  '通讯费',
  '交通费',
  '交际费',
  '学生用药（防控物资）',
  '垃圾处理费',
  '日常费用',
  '水电费',
  '固定资产',
  '安保经费',
  '装修费或工程',
  '学生退费：包括膳食费',
  '学生餐费',
  '活动基金',
  '教学业务费',
  '代办费',
  '社团',
  '维修材料及维修费',
  '校服、书包',
  '租金'
] as const;

// 人员支出子项目
export const PERSONNEL_EXPENSE_ITEMS = [
  '教职工工资',
  '课后服务、社团劳务费',
  '福利费',
  '医社保费',
  '住房公积金',
  '工作餐',
  '工会经费',
  '老师培训费',
  '外聘老师工资',
  '外教工资',
  '晚托补贴及餐费',
  '代理记账工资'
] as const;

// 所有支出子项目
export const ALL_EXPENSE_ITEMS = [
  ...DAILY_EXPENSE_ITEMS,
  ...PERSONNEL_EXPENSE_ITEMS
];

// 根据子项目获取类别
export function getExpenseCategory(item: string): string {
  if (DAILY_EXPENSE_ITEMS.includes(item as typeof DAILY_EXPENSE_ITEMS[number])) {
    return EXPENSE_CATEGORIES.DAILY;
  }
  return EXPENSE_CATEGORIES.PERSONNEL;
}

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
      tuition_fee REAL DEFAULT 0,
      lunch_fee REAL DEFAULT 0,
      nap_fee REAL DEFAULT 0,
      after_school_fee REAL DEFAULT 0,
      club_fee REAL DEFAULT 0,
      agency_fee REAL DEFAULT 600,
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

  // 创建代办费扣除项目表
  db.exec(`
    CREATE TABLE IF NOT EXISTS agency_fee_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      item_type TEXT NOT NULL,
      amount REAL NOT NULL,
      item_date TEXT NOT NULL,
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
    CREATE INDEX IF NOT EXISTS idx_agency_fee_items_student_id ON agency_fee_items(student_id);
  `);

  // 创建支出记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS expense_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      item TEXT NOT NULL,
      report_date TEXT NOT NULL,
      occur_date TEXT NOT NULL,
      invoice_no TEXT,
      amount REAL NOT NULL,
      summary TEXT,
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME
    )
  `);

  // 创建支出记录索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_expense_records_category ON expense_records(category);
    CREATE INDEX IF NOT EXISTS idx_expense_records_item ON expense_records(item);
    CREATE INDEX IF NOT EXISTS idx_expense_records_report_date ON expense_records(report_date);
    CREATE INDEX IF NOT EXISTS idx_expense_records_occur_date ON expense_records(occur_date);
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
  
  // 将 other_fee 改为 agency_fee（代办费）
  if (existingColumns.includes('other_fee') && !existingColumns.includes('agency_fee')) {
    db.exec('ALTER TABLE student_fees ADD COLUMN agency_fee REAL DEFAULT 600');
    // 迁移数据：将 other_fee 的值复制到 agency_fee，如果 other_fee > 0 则保留，否则设为 600
    db.exec(`
      UPDATE student_fees SET agency_fee = CASE 
        WHEN other_fee > 0 THEN other_fee 
        ELSE 600 
      END
    `);
    console.log('Added agency_fee column and migrated from other_fee');
  }

  // 删除不需要的字段（需要重建表）
  const columnsToRemove = ['enrollment_status', 'other_fee'];
  const needsRebuild = columnsToRemove.some(col => existingColumns.includes(col));
  
  if (needsRebuild) {
    console.log('Rebuilding table to remove old columns...');
    
    // 创建临时表
    db.exec(`
      CREATE TABLE student_fees_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        class_name TEXT NOT NULL,
        student_name TEXT NOT NULL,
        gender TEXT DEFAULT '男',
        nap_status TEXT DEFAULT '走读',
        tuition_fee REAL DEFAULT 0,
        lunch_fee REAL DEFAULT 0,
        nap_fee REAL DEFAULT 0,
        after_school_fee REAL DEFAULT 0,
        club_fee REAL DEFAULT 0,
        agency_fee REAL DEFAULT 600,
        remark TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME
      )
    `);
    
    // 复制数据
    const columnsToCopy = ['id', 'class_name', 'student_name', 'gender', 'nap_status', 
                          'tuition_fee', 'lunch_fee', 'nap_fee', 'after_school_fee', 'club_fee', 
                          'agency_fee', 'remark', 'created_at', 'updated_at'];
    const availableColumns = columnsToCopy.filter(col => 
      col === 'agency_fee' || existingColumns.includes(col) || col === 'id' || col === 'created_at' || col === 'updated_at'
    );
    
    // 如果 agency_fee 不存在，使用默认值
    if (!existingColumns.includes('agency_fee')) {
      db.exec(`
        INSERT INTO student_fees_new (id, class_name, student_name, gender, nap_status, tuition_fee, lunch_fee, nap_fee, after_school_fee, club_fee, agency_fee, remark, created_at, updated_at)
        SELECT id, class_name, student_name, gender, nap_status, tuition_fee, lunch_fee, nap_fee, after_school_fee, club_fee, 600, remark, created_at, updated_at
        FROM student_fees
      `);
    } else {
      db.exec(`
        INSERT INTO student_fees_new (id, class_name, student_name, gender, nap_status, tuition_fee, lunch_fee, nap_fee, after_school_fee, club_fee, agency_fee, remark, created_at, updated_at)
        SELECT id, class_name, student_name, gender, nap_status, tuition_fee, lunch_fee, nap_fee, after_school_fee, club_fee, agency_fee, remark, created_at, updated_at
        FROM student_fees
      `);
    }
    
    // 删除旧表
    db.exec('DROP TABLE student_fees');
    
    // 重命名新表
    db.exec('ALTER TABLE student_fees_new RENAME TO student_fees');
    
    // 重建索引
    db.exec('CREATE INDEX IF NOT EXISTS idx_student_fees_class_name ON student_fees(class_name)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_student_fees_student_name ON student_fees(student_name)');
    
    console.log('Table rebuilt successfully');
  }

  // 删除 other 类型的交费记录（已改为代办费，不需要交费记录）
  db.exec(`DELETE FROM payment_records WHERE fee_type = 'other'`);

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
export { FEE_TYPE_MAP, FEE_TYPE_REVERSE_MAP, AGENCY_FEE_ITEM_TYPES } from './constants';
