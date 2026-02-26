import { NextRequest, NextResponse } from 'next/server';
import { db, initDatabase } from '@/lib/database';

// 初始化数据库
initDatabase();

// GET - 获取学生列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const className = searchParams.get('className');
    const search = searchParams.get('search');
    
    let sql = 'SELECT * FROM students WHERE 1=1';
    const params: (string | number)[] = [];
    
    if (className) {
      sql += ' AND class_name = ?';
      params.push(className);
    }
    
    if (search) {
      sql += ' AND (name LIKE ? OR student_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    const stmt = db.prepare(sql);
    const students = stmt.all(...params);
    
    return NextResponse.json({ data: students });
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    );
  }
}

// POST - 新增学生
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, studentNumber, className, phone, email } = body;
    
    // 验证必填字段
    if (!name || !studentNumber || !className) {
      return NextResponse.json(
        { error: '姓名、学号和班级为必填项' },
        { status: 400 }
      );
    }
    
    const stmt = db.prepare(`
      INSERT INTO students (name, student_number, class_name, phone, email)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(name, studentNumber, className, phone || null, email || null);
    
    // 获取插入的学生
    const newStudent = db.prepare('SELECT * FROM students WHERE id = ?').get(result.lastInsertRowid);
    
    return NextResponse.json({ data: newStudent }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating student:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create student';
    // 检查是否是唯一约束错误
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
