import { NextRequest, NextResponse } from 'next/server';
import { db, initDatabase } from '@/lib/database';

// 初始化数据库
initDatabase();

// GET - 获取单个学生
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
    
    if (!student) {
      return NextResponse.json({ error: '学生不存在' }, { status: 404 });
    }
    
    return NextResponse.json({ data: student });
  } catch (error) {
    console.error('Error fetching student:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student' },
      { status: 500 }
    );
  }
}

// PUT - 更新学生信息
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, studentNumber, className, phone, email } = body;
    
    // 构建更新语句
    const updates: string[] = [];
    const values: (string | null)[] = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (studentNumber !== undefined) {
      updates.push('student_number = ?');
      values.push(studentNumber);
    }
    if (className !== undefined) {
      updates.push('class_name = ?');
      values.push(className);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone || null);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email || null);
    }
    
    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    
    values.push(id);
    
    const stmt = db.prepare(`
      UPDATE students 
      SET ${updates.join(', ')}
      WHERE id = ?
    `);
    
    const result = stmt.run(...values);
    
    if (result.changes === 0) {
      return NextResponse.json({ error: '学生不存在' }, { status: 404 });
    }
    
    // 获取更新后的学生
    const updatedStudent = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
    
    return NextResponse.json({ data: updatedStudent });
  } catch (error: unknown) {
    console.error('Error updating student:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update student';
    if (errorMessage.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { error: '学号已存在' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE - 删除学生
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 先删除该学生的所有费用记录（虽然外键设置了 CASCADE，但手动删除更安全）
    db.prepare('DELETE FROM fees WHERE student_id = ?').run(id);
    
    // 再删除学生
    const result = db.prepare('DELETE FROM students WHERE id = ?').run(id);
    
    if (result.changes === 0) {
      return NextResponse.json({ error: '学生不存在' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting student:', error);
    return NextResponse.json(
      { error: 'Failed to delete student' },
      { status: 500 }
    );
  }
}
