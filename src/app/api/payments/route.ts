import { NextRequest, NextResponse } from 'next/server';
import { db, initDatabase } from '@/lib/database';

// 初始化数据库
initDatabase();

// GET - 获取学生的交费记录
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const feeType = searchParams.get('feeType');
    
    if (!studentId) {
      return NextResponse.json({ error: '缺少学生ID' }, { status: 400 });
    }
    
    let sql = 'SELECT * FROM payment_records WHERE student_id = ?';
    const params: (string | number)[] = [studentId];
    
    if (feeType) {
      sql += ' AND fee_type = ?';
      params.push(feeType);
    }
    
    sql += ' ORDER BY payment_date DESC, created_at DESC';
    
    const records = db.prepare(sql).all(...params);
    
    return NextResponse.json({ data: records });
  } catch (error) {
    console.error('Error fetching payment records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment records' },
      { status: 500 }
    );
  }
}

// POST - 新增交费记录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, feeType, amount, paymentDate, remark } = body;
    
    // 验证必填字段
    if (!studentId || !feeType || !amount || !paymentDate) {
      return NextResponse.json(
        { error: '学生ID、费用类型、金额和交费日期为必填项' },
        { status: 400 }
      );
    }
    
    // 验证学生是否存在
    const student = db.prepare('SELECT * FROM student_fees WHERE id = ?').get(studentId) as {
      id: number;
      tuition_fee: number;
      lunch_fee: number;
      nap_fee: number;
      after_school_fee: number;
      club_fee: number;
      other_fee: number;
    } | undefined;
    
    if (!student) {
      return NextResponse.json({ error: '学生不存在' }, { status: 404 });
    }
    
    // 验证费用类型对应的应交金额
    const feeField = `${feeType}_fee` as keyof typeof student;
    const expectedFee = student[feeField] as number;
    
    // 获取该费用类型已交总额
    const paidResult = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total_paid 
      FROM payment_records 
      WHERE student_id = ? AND fee_type = ?
    `).get(studentId, feeType) as { total_paid: number };
    
    const totalPaid = paidResult.total_paid;
    const newTotal = totalPaid + Number(amount);
    
    // 检查是否超过应交金额
    if (newTotal > expectedFee) {
      return NextResponse.json({
        error: `缴费金额超出应交金额。应交：${expectedFee}，已交：${totalPaid}，本次：${amount}，合计：${newTotal}`,
        expectedFee,
        currentPaid: totalPaid,
        exceeded: newTotal - expectedFee,
      }, { status: 400 });
    }
    
    const stmt = db.prepare(`
      INSERT INTO payment_records (student_id, fee_type, amount, payment_date, remark)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(studentId, feeType, amount, paymentDate, remark || null);
    
    const newRecord = db.prepare('SELECT * FROM payment_records WHERE id = ?').get(result.lastInsertRowid);
    
    return NextResponse.json({ 
      data: newRecord,
      message: `成功记录交费 ${amount} 元`,
      summary: {
        expectedFee,
        previousPaid: totalPaid,
        currentPayment: Number(amount),
        totalPaid: newTotal,
        remaining: expectedFee - newTotal,
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating payment record:', error);
    return NextResponse.json(
      { error: 'Failed to create payment record' },
      { status: 500 }
    );
  }
}
