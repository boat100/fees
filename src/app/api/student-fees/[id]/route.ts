import { NextRequest, NextResponse } from 'next/server';
import { db, initDatabase, FEE_TYPE_MAP } from '@/lib/database';

// 初始化数据库
initDatabase();

// GET - 获取单个学生详情（包含所有交费记录）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const student = db.prepare('SELECT * FROM student_fees WHERE id = ?').get(id) as {
      id: number;
      class_name: string;
      student_name: string;
      tuition_fee: number;
      lunch_fee: number;
      nap_fee: number;
      after_school_fee: number;
      club_fee: number;
      other_fee: number;
      remark: string | null;
      created_at: string;
      updated_at: string | null;
    } | undefined;
    
    if (!student) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }
    
    // 获取所有交费记录
    const paymentRecords = db.prepare(`
      SELECT * FROM payment_records 
      WHERE student_id = ? 
      ORDER BY payment_date DESC, created_at DESC
    `).all(id) as Array<{
      id: number;
      student_id: number;
      fee_type: string;
      amount: number;
      payment_date: string;
      remark: string | null;
      created_at: string;
    }>;
    
    // 按费用类型分组并计算已交总额
    const paymentsByType: Record<string, { records: typeof paymentRecords; total: number }> = {};
    Object.keys(FEE_TYPE_MAP).forEach(key => {
      paymentsByType[key] = { records: [], total: 0 };
    });
    
    paymentRecords.forEach(record => {
      if (paymentsByType[record.fee_type]) {
        paymentsByType[record.fee_type].records.push(record);
        paymentsByType[record.fee_type].total += record.amount;
      }
    });
    
    return NextResponse.json({ 
      data: {
        ...student,
        paymentsByType,
        paymentRecords,
      }
    });
  } catch (error) {
    console.error('Error fetching student fee:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student fee' },
      { status: 500 }
    );
  }
}

// PUT - 更新学生应交费用
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const {
      className,
      studentName,
      tuitionFee,
      lunchFee,
      napFee,
      afterSchoolFee,
      clubFee,
      otherFee,
      remark,
    } = body;
    
    const stmt = db.prepare(`
      UPDATE student_fees 
      SET class_name = ?, student_name = ?, 
          tuition_fee = ?, lunch_fee = ?, nap_fee = ?, 
          after_school_fee = ?, club_fee = ?, other_fee = ?,
          remark = ?, updated_at = ?
      WHERE id = ?
    `);
    
    const result = stmt.run(
      className,
      studentName,
      tuitionFee ?? 0,
      lunchFee ?? 0,
      napFee ?? 0,
      afterSchoolFee ?? 0,
      clubFee ?? 0,
      otherFee ?? 0,
      remark || null,
      new Date().toISOString(),
      id
    );
    
    if (result.changes === 0) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }
    
    const updatedStudent = db.prepare('SELECT * FROM student_fees WHERE id = ?').get(id);
    
    return NextResponse.json({ data: updatedStudent });
  } catch (error) {
    console.error('Error updating student fee:', error);
    return NextResponse.json(
      { error: 'Failed to update student fee' },
      { status: 500 }
    );
  }
}

// DELETE - 删除单个学生费用
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 先删除交费记录
    db.prepare('DELETE FROM payment_records WHERE student_id = ?').run(id);
    
    // 再删除学生
    const result = db.prepare('DELETE FROM student_fees WHERE id = ?').run(id);
    
    if (result.changes === 0) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting student fee:', error);
    return NextResponse.json(
      { error: 'Failed to delete student fee' },
      { status: 500 }
    );
  }
}
