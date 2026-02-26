import { NextRequest, NextResponse } from 'next/server';
import { db, initDatabase } from '@/lib/database';

// 初始化数据库
initDatabase();

// GET - 获取费用列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const status = searchParams.get('status');
    const feeType = searchParams.get('feeType');
    
    let sql = 'SELECT * FROM fees WHERE 1=1';
    const params: (string | number)[] = [];
    
    if (studentId) {
      sql += ' AND student_id = ?';
      params.push(studentId);
    }
    
    if (status !== null) {
      sql += ' AND status = ?';
      params.push(status === 'true' ? 1 : 0);
    }
    
    if (feeType) {
      sql += ' AND fee_type = ?';
      params.push(feeType);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    const stmt = db.prepare(sql);
    const fees = stmt.all(...params);
    
    return NextResponse.json({ data: fees });
  } catch (error) {
    console.error('Error fetching fees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fees' },
      { status: 500 }
    );
  }
}

// POST - 新增费用记录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, feeType, amount, status, remark } = body;
    
    // 验证必填字段
    if (!studentId || !feeType || amount === undefined) {
      return NextResponse.json(
        { error: '学生ID、费用类型和金额为必填项' },
        { status: 400 }
      );
    }
    
    // 验证学生是否存在
    const student = db.prepare('SELECT id FROM students WHERE id = ?').get(studentId);
    if (!student) {
      return NextResponse.json(
        { error: '学生不存在' },
        { status: 400 }
      );
    }
    
    const stmt = db.prepare(`
      INSERT INTO fees (student_id, fee_type, amount, status, remark)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      studentId,
      feeType,
      amount,
      status ? 1 : 0,
      remark || null
    );
    
    // 获取插入的费用记录
    const newFee = db.prepare('SELECT * FROM fees WHERE id = ?').get(result.lastInsertRowid);
    
    return NextResponse.json({ data: newFee }, { status: 201 });
  } catch (error) {
    console.error('Error creating fee:', error);
    return NextResponse.json(
      { error: 'Failed to create fee' },
      { status: 500 }
    );
  }
}
