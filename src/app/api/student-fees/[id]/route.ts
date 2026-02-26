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
      SET class_name = ?, student_name = ?, tuition_fee = ?, lunch_fee = ?, 
          nap_fee = ?, after_school_fee = ?, club_fee = ?, other_fee = ?, 
          remark = ?, updated_at = ?
      WHERE id = ?
    `);
    
    const result = stmt.run(
      className,
      studentName,
      tuitionFee || 0,
      lunchFee || 0,
      napFee || 0,
      afterSchoolFee || 0,
      clubFee || 0,
      otherFee || 0,
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
