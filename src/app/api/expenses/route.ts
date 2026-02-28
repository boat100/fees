import { NextRequest, NextResponse } from 'next/server';
import { db, initDatabase } from '@/lib/database';
import { isAuthenticated } from '@/lib/auth';

// 初始化数据库
initDatabase();

// GET - 获取支出记录列表
export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const item = searchParams.get('item');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const yearMonth = searchParams.get('yearMonth');
    const id = searchParams.get('id');

    // 获取单条记录
    if (id) {
      const record = db.prepare('SELECT * FROM expense_records WHERE id = ?').get(id) as {
        id: number;
        category: string;
        item: string;
        report_date: string;
        occur_date: string;
        invoice_no: string | null;
        amount: number;
        summary: string | null;
        remark: string | null;
        created_at: string;
        updated_at: string | null;
      } | undefined;

      if (!record) {
        return NextResponse.json({ error: '记录不存在' }, { status: 404 });
      }

      return NextResponse.json({ data: record });
    }

    // 构建查询条件
    let sql = 'SELECT * FROM expense_records WHERE 1=1';
    const params: (string | number)[] = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (item) {
      sql += ' AND item = ?';
      params.push(item);
    }

    if (startDate) {
      sql += ' AND occur_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND occur_date <= ?';
      params.push(endDate);
    }

    if (yearMonth) {
      sql += ' AND strftime("%Y-%m", occur_date) = ?';
      params.push(yearMonth);
    }

    sql += ' ORDER BY occur_date DESC, created_at DESC';

    const records = db.prepare(sql).all(...params) as Array<{
      id: number;
      category: string;
      item: string;
      report_date: string;
      occur_date: string;
      invoice_no: string | null;
      amount: number;
      summary: string | null;
      remark: string | null;
      created_at: string;
      updated_at: string | null;
    }>;

    return NextResponse.json({ data: records });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: '获取支出记录失败' }, { status: 500 });
  }
}

// POST - 新增支出记录
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { category, item, reportDate, occurDate, invoiceNo, amount, summary, remark } = body;

    // 验证必填字段
    if (!category || !item || !reportDate || !occurDate || amount === undefined) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({ error: '金额必须大于0' }, { status: 400 });
    }

    const stmt = db.prepare(`
      INSERT INTO expense_records (category, item, report_date, occur_date, invoice_no, amount, summary, remark)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      category,
      item,
      reportDate,
      occurDate,
      invoiceNo || null,
      amount,
      summary || null,
      remark || null
    );

    return NextResponse.json({
      success: true,
      message: '支出记录添加成功',
      id: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: '添加支出记录失败' }, { status: 500 });
  }
}

// PUT - 更新支出记录
export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, category, item, reportDate, occurDate, invoiceNo, amount, summary, remark } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少记录ID' }, { status: 400 });
    }

    // 检查记录是否存在
    const existing = db.prepare('SELECT id FROM expense_records WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }

    const stmt = db.prepare(`
      UPDATE expense_records 
      SET category = ?, item = ?, report_date = ?, occur_date = ?, invoice_no = ?, 
          amount = ?, summary = ?, remark = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      category,
      item,
      reportDate,
      occurDate,
      invoiceNo || null,
      amount,
      summary || null,
      remark || null,
      id
    );

    return NextResponse.json({
      success: true,
      message: '支出记录更新成功'
    });
  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json({ error: '更新支出记录失败' }, { status: 500 });
  }
}

// DELETE - 删除支出记录
export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少记录ID' }, { status: 400 });
    }

    const result = db.prepare('DELETE FROM expense_records WHERE id = ?').run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: '支出记录删除成功'
    });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json({ error: '删除支出记录失败' }, { status: 500 });
  }
}
