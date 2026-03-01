import { NextRequest, NextResponse } from 'next/server';
import { db, initDatabase, EXPENSE_CATEGORIES, DAILY_EXPENSE_ITEMS, PERSONNEL_EXPENSE_ITEMS } from '@/lib/database';
import { isAuthenticated } from '@/lib/auth';

// 初始化数据库
initDatabase();

// 类别名称映射
const CATEGORY_MAP: Record<string, string> = {
  '日常公用支出': EXPENSE_CATEGORIES.DAILY,
  '人员支出': EXPENSE_CATEGORIES.PERSONNEL,
  '日常公用': EXPENSE_CATEGORIES.DAILY,
  '人员': EXPENSE_CATEGORIES.PERSONNEL,
};

// 验证并获取类别
function getCategory(categoryStr: string): string | null {
  // 直接匹配
  if (CATEGORY_MAP[categoryStr]) {
    return CATEGORY_MAP[categoryStr];
  }
  
  // 模糊匹配
  const normalized = categoryStr.trim().toLowerCase();
  if (normalized.includes('日常') || normalized.includes('公用')) {
    return EXPENSE_CATEGORIES.DAILY;
  }
  if (normalized.includes('人员')) {
    return EXPENSE_CATEGORIES.PERSONNEL;
  }
  
  return null;
}

// 验证子项目
function validateItem(category: string, item: string): boolean {
  if (category === EXPENSE_CATEGORIES.DAILY) {
    return (DAILY_EXPENSE_ITEMS as readonly string[]).includes(item);
  } else if (category === EXPENSE_CATEGORIES.PERSONNEL) {
    return (PERSONNEL_EXPENSE_ITEMS as readonly string[]).includes(item);
  }
  return false;
}

// POST - 批量导入支出记录
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { records } = body;

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: '没有可导入的数据' }, { status: 400 });
    }

    // 验证并处理每条记录
    const validRecords: Array<{
      category: string;
      item: string;
      reportDate: string;
      occurDate: string;
      invoiceNo: string | null;
      amount: number;
      summary: string | null;
      remark: string | null;
    }> = [];

    const errors: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNum = i + 2; // Excel行号从2开始（第1行是表头）

      // 验证类别
      const category = getCategory(record.category || '');
      if (!category) {
        errors.push({ row: rowNum, error: `类别"${record.category}"无效，应为"日常公用支出"或"人员支出"` });
        continue;
      }

      // 验证子项目
      const item = record.item?.trim();
      if (!item || !validateItem(category, item)) {
        const validItems = category === EXPENSE_CATEGORIES.DAILY ? DAILY_EXPENSE_ITEMS : PERSONNEL_EXPENSE_ITEMS;
        errors.push({ row: rowNum, error: `子项目"${item}"无效，有效值为: ${validItems.join('、')}` });
        continue;
      }

      // 验证报账日期
      const reportDate = record.reportDate || record.report_date;
      if (!reportDate || !/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) {
        errors.push({ row: rowNum, error: `报账日期"${reportDate}"格式无效，应为YYYY-MM-DD格式` });
        continue;
      }

      // 验证发生日期（支持 YYYY-MM 或 YYYY-MM-DD 格式）
      const occurDate = record.occurDate || record.occur_date;
      if (!occurDate || !/^\d{4}-\d{2}(-\d{2})?$/.test(occurDate)) {
        errors.push({ row: rowNum, error: `发生日期"${occurDate}"格式无效，应为YYYY-MM或YYYY-MM-DD格式` });
        continue;
      }
      // 如果是 YYYY-MM 格式，补充为 YYYY-MM-01
      const occurDateNormalized = occurDate.length === 7 ? `${occurDate}-01` : occurDate;

      // 验证金额
      const amount = Number(record.amount);
      if (isNaN(amount) || amount <= 0) {
        errors.push({ row: rowNum, error: `金额"${record.amount}"无效，必须为大于0的数字` });
        continue;
      }

      // 验证通过，添加到有效记录列表
      validRecords.push({
        category,
        item,
        reportDate,
        occurDate: occurDateNormalized,
        invoiceNo: record.invoiceNo || record.invoice_no || null,
        amount,
        summary: record.summary || null,
        remark: record.remark || null,
      });
    }

    // 如果有错误，返回错误信息
    if (errors.length > 0 && validRecords.length === 0) {
      return NextResponse.json({
        success: false,
        error: '所有记录都有错误，请修正后再导入',
        errors,
        importedCount: 0,
        errorCount: errors.length
      }, { status: 400 });
    }

    // 批量插入有效记录
    const insertStmt = db.prepare(`
      INSERT INTO expense_records (category, item, report_date, occur_date, invoice_no, amount, summary, remark)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((records: typeof validRecords) => {
      for (const record of records) {
        insertStmt.run(
          record.category,
          record.item,
          record.reportDate,
          record.occurDate,
          record.invoiceNo,
          record.amount,
          record.summary,
          record.remark
        );
      }
    });

    insertMany(validRecords);

    return NextResponse.json({
      success: true,
      message: `成功导入 ${validRecords.length} 条记录`,
      importedCount: validRecords.length,
      errorCount: errors.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error batch importing expenses:', error);
    return NextResponse.json({ error: '批量导入失败' }, { status: 500 });
  }
}
