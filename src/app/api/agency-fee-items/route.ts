import { NextRequest, NextResponse } from 'next/server';
import { db, initDatabase, AGENCY_FEE_ITEM_TYPES } from '@/lib/database';

// 初始化数据库
initDatabase();

// GET - 获取代办费扣除项目列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId') || searchParams.get('student_id');
    
    if (!studentId) {
      return NextResponse.json({ error: '缺少学生ID' }, { status: 400 });
    }
    
    const items = db.prepare(`
      SELECT * FROM agency_fee_items 
      WHERE student_id = ? 
      ORDER BY item_date DESC, created_at DESC
    `).all(studentId) as Array<{
      id: number;
      student_id: number;
      item_type: string;
      amount: number;
      item_date: string;
      remark: string | null;
      created_at: string;
    }>;
    
    // 计算各类型扣除总额
    const totalsByType: Record<string, number> = {};
    Object.keys(AGENCY_FEE_ITEM_TYPES).forEach(key => {
      totalsByType[key] = 0;
    });
    
    items.forEach(item => {
      if (totalsByType[item.item_type] !== undefined) {
        totalsByType[item.item_type] += item.amount;
      }
    });
    
    const totalUsed = items.reduce((sum, item) => sum + item.amount, 0);
    
    return NextResponse.json({ 
      data: items,
      totalsByType,
      totalUsed
    });
  } catch (error) {
    console.error('Error fetching agency fee items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agency fee items' },
      { status: 500 }
    );
  }
}

// POST - 新增代办费扣除项目
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, itemType, amount, deductDate, itemDate, remark } = body;
    
    // 兼容两种字段名
    const date = deductDate || itemDate;
    
    if (!studentId || !itemType || !amount || !date) {
      return NextResponse.json(
        { error: '学生ID、项目类型、金额和日期为必填项' },
        { status: 400 }
      );
    }
    
    // 检查学生是否存在
    const student = db.prepare('SELECT id, agency_fee FROM student_fees WHERE id = ?').get(studentId) as {
      id: number;
      agency_fee: number;
    } | undefined;
    
    if (!student) {
      return NextResponse.json({ error: '学生不存在' }, { status: 404 });
    }
    
    // 检查余额是否足够
    const currentUsed = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM agency_fee_items WHERE student_id = ?
    `).get(studentId) as { total: number };
    
    const newTotal = currentUsed.total + amount;
    if (newTotal > student.agency_fee) {
      return NextResponse.json(
        { error: `代办费余额不足。当前余额：${student.agency_fee - currentUsed.total}元，本次扣除：${amount}元` },
        { status: 400 }
      );
    }
    
    const stmt = db.prepare(`
      INSERT INTO agency_fee_items (student_id, item_type, amount, item_date, remark)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(studentId, itemType, amount, date, remark || null);
    
    const newItem = db.prepare('SELECT * FROM agency_fee_items WHERE id = ?').get(result.lastInsertRowid);
    
    return NextResponse.json({ data: newItem, message: '添加成功' }, { status: 201 });
  } catch (error) {
    console.error('Error creating agency fee item:', error);
    return NextResponse.json(
      { error: 'Failed to create agency fee item' },
      { status: 500 }
    );
  }
}

// DELETE - 删除代办费扣除项目
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: '缺少项目ID' }, { status: 400 });
    }
    
    const result = db.prepare('DELETE FROM agency_fee_items WHERE id = ?').run(id);
    
    if (result.changes === 0) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting agency fee item:', error);
    return NextResponse.json(
      { error: 'Failed to delete agency fee item' },
      { status: 500 }
    );
  }
}
