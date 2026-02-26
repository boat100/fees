import { NextRequest, NextResponse } from 'next/server';
import { db, initDatabase } from '@/lib/database';

// 初始化数据库
initDatabase();

// GET - 获取单个学生费用
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const student = db.prepare('SELECT * FROM student_fees WHERE id = ?').get(id);
    
    if (!student) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }
    
    return NextResponse.json({ data: student });
  } catch (error) {
    console.error('Error fetching student fee:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student fee' },
      { status: 500 }
    );
  }
}

// PUT - 更新学生费用
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
      tuitionFee, tuitionPaid, tuitionPaidDate,
      lunchFee, lunchPaid, lunchPaidDate,
      napFee, napPaid, napPaidDate,
      afterSchoolFee, afterSchoolPaid, afterSchoolPaidDate,
      clubFee, clubPaid, clubPaidDate,
      otherFee, otherPaid, otherPaidDate,
      remark,
    } = body;
    
    const stmt = db.prepare(`
      UPDATE student_fees 
      SET class_name = ?, student_name = ?, 
          tuition_fee = ?, tuition_paid = ?, tuition_paid_date = ?,
          lunch_fee = ?, lunch_paid = ?, lunch_paid_date = ?,
          nap_fee = ?, nap_paid = ?, nap_paid_date = ?,
          after_school_fee = ?, after_school_paid = ?, after_school_paid_date = ?,
          club_fee = ?, club_paid = ?, club_paid_date = ?,
          other_fee = ?, other_paid = ?, other_paid_date = ?,
          remark = ?, updated_at = ?
      WHERE id = ?
    `);
    
    const result = stmt.run(
      className,
      studentName,
      tuitionFee ?? 0, tuitionPaid ?? 0, tuitionPaidDate || null,
      lunchFee ?? 0, lunchPaid ?? 0, lunchPaidDate || null,
      napFee ?? 0, napPaid ?? 0, napPaidDate || null,
      afterSchoolFee ?? 0, afterSchoolPaid ?? 0, afterSchoolPaidDate || null,
      clubFee ?? 0, clubPaid ?? 0, clubPaidDate || null,
      otherFee ?? 0, otherPaid ?? 0, otherPaidDate || null,
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
