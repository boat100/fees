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

  // 创建支出类别表
  db.exec(`
    CREATE TABLE IF NOT EXISTS expense_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME
    )
  `);

  // 创建支出子项目表
  db.exec(`
    CREATE TABLE IF NOT EXISTS expense_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME,
      FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE CASCADE,
      UNIQUE(category_id, name)
    )
  `);

  // 创建支出子项目索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_expense_items_category_id ON expense_items(category_id);
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

  // 添加 agency_paid 字段（已交代办费）
  if (!existingColumns.includes('agency_paid')) {
    db.exec('ALTER TABLE student_fees ADD COLUMN agency_paid REAL DEFAULT 0');
    // 迁移数据：对于已有学生，agency_paid 默认等于 agency_fee（视为已收齐）
    db.exec('UPDATE student_fees SET agency_paid = agency_fee WHERE agency_paid = 0');
    console.log('Added agency_paid column');
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

  // 迁移：为 agency_paid > 0 但没有对应交费记录的学生创建代办费交费记录
  // 这是因为之前的迁移逻辑直接设置了 agency_paid 但没有创建 payment_records
  const studentsWithoutAgencyPaymentRecords = db.prepare(`
    SELECT sf.id, sf.agency_paid, sf.created_at
    FROM student_fees sf
    WHERE sf.agency_paid > 0
    AND NOT EXISTS (
      SELECT 1 FROM payment_records pr 
      WHERE pr.student_id = sf.id AND pr.fee_type = 'agency'
    )
  `).all() as Array<{ id: number; agency_paid: number; created_at: string }>;
  
  if (studentsWithoutAgencyPaymentRecords.length > 0) {
    const insertPayment = db.prepare(`
      INSERT INTO payment_records (student_id, fee_type, amount, payment_date, remark)
      VALUES (?, 'agency', ?, ?, '代办费交费（历史数据迁移）')
    `);
    
    for (const student of studentsWithoutAgencyPaymentRecords) {
      // 使用学生创建日期作为交费日期，如果没有则使用当前日期
      const paymentDate = student.created_at 
        ? student.created_at.split('T')[0] 
        : new Date().toISOString().split('T')[0];
      insertPayment.run(student.id, student.agency_paid, paymentDate);
    }
    console.log(`Migrated ${studentsWithoutAgencyPaymentRecords.length} agency payment records`);
  }

  // 初始化支出类别和子项目（如果表为空）
  const categoryCount = db.prepare('SELECT COUNT(*) as count FROM expense_categories').get() as { count: number };
  
  if (categoryCount.count === 0) {
    console.log('Initializing default expense categories and items...');
    
    // 插入默认类别
    const insertCategory = db.prepare('INSERT INTO expense_categories (name, sort_order) VALUES (?, ?)');
    insertCategory.run('日常公用支出', 1);
    insertCategory.run('人员支出', 2);
    
    // 获取类别ID
    const categories = db.prepare('SELECT id, name FROM expense_categories').all() as Array<{ id: number; name: string }>;
    const dailyCategoryId = categories.find(c => c.name === '日常公用支出')?.id;
    const personnelCategoryId = categories.find(c => c.name === '人员支出')?.id;
    
    // 插入默认子项目
    const insertItem = db.prepare('INSERT INTO expense_items (category_id, name, sort_order) VALUES (?, ?, ?)');
    
    // 日常公用支出子项目
    const dailyItems = [
      '办公费用', '财务费', '通讯费', '交通费', '交际费',
      '学生用药（防控物资）', '垃圾处理费', '日常费用', '水电费',
      '固定资产', '安保经费', '装修费或工程', '学生退费：包括膳食费',
      '学生餐费', '活动基金', '教学业务费', '代办费', '社团',
      '维修材料及维修费', '校服、书包', '租金'
    ];
    
    if (dailyCategoryId) {
      dailyItems.forEach((item, index) => {
        insertItem.run(dailyCategoryId, item, index + 1);
      });
    }
    
    // 人员支出子项目
    const personnelItems = [
      '教职工工资', '课后服务、社团劳务费', '福利费', '医社保费',
      '住房公积金', '工作餐', '工会经费', '老师培训费',
      '外聘老师工资', '外教工资', '晚托补贴及餐费', '代理记账工资'
    ];
    
    if (personnelCategoryId) {
      personnelItems.forEach((item, index) => {
        insertItem.run(personnelCategoryId, item, index + 1);
      });
    }
    
    console.log('Default expense categories and items initialized');
  }

  // 迁移旧数据：将英文类别更新为中文名称（幂等操作，可重复执行）
  console.log('Checking for old expense category values...');
  const updateCategory = db.prepare('UPDATE expense_records SET category = ? WHERE category = ?');
  const dailyResult = updateCategory.run('日常公用支出', 'daily');
  const personnelResult = updateCategory.run('人员支出', 'personnel');
  if (dailyResult.changes > 0 || personnelResult.changes > 0) {
    console.log(`Migrated ${dailyResult.changes} daily records and ${personnelResult.changes} personnel records to Chinese category names`);
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
export { FEE_TYPE_MAP, FEE_TYPE_REVERSE_MAP, AGENCY_FEE_ITEM_TYPES } from './constants';
