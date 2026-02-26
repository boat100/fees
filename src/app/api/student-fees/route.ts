import { NextRequest, NextResponse } from 'next/server';
import { db, initDatabase } from '@/lib/database';

// 初始化数据库
initDatabase();

// GET - 获取学生费用列表或班级列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    // 获取班级列表
    if (action === 'classes') {
      const classes = db.prepare(`
        SELECT DISTINCT class_name FROM student_fees ORDER BY class_name
      `).all() as Array<{ class_name: string }>;
      
      return NextResponse.json({ 
        data: classes.map(c => c.class_name) 
      });
    }
    
    // 获取学生费用列表
    const className = searchParams.get('className');
    const search = searchParams.get('search');
    
    let sql = 'SELECT * FROM student_fees WHERE 1=1';
    const params: (string | number)[] = [];
    
    if (className) {
      sql += ' AND class_name = ?';
      params.push(className);
    }
    
    if (search) {
      sql += ' AND student_name LIKE ?';
      params.push(`%${search}%`);
    }
    
    sql += ' ORDER BY class_name, student_name';
    
    const students = db.prepare(sql).all(...params);
    
    return NextResponse.json({ data: students });
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

// POST - 新增学生费用
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      className,
      studentName,
      tuitionFee = 0,
      lunchFee = 0,
      napFee = 0,
      afterSchoolFee = 0,
      clubFee = 0,
      otherFee = 0,
      remark = null,
    } = body;
    
    // 验证必填字段
    if (!className || !studentName) {
      return NextResponse.json(
        { error: '班级和姓名为必填项' },
        { status: 400 }
      );
    }
    
    const stmt = db.prepare(`
      INSERT INTO student_fees 
      (class_name, student_name, tuition_fee, lunch_fee, nap_fee, after_school_fee, club_fee, other_fee, remark)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      className,
      studentName,
      tuitionFee,
      lunchFee,
      napFee,
      afterSchoolFee,
      clubFee,
      otherFee,
      remark
    );
    
    const newStudent = db.prepare('SELECT * FROM student_fees WHERE id = ?').get(result.lastInsertRowid);
    
    return NextResponse.json({ data: newStudent }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating student fee:', error);
    return NextResponse.json(
      { error: 'Failed to create student fee' },
      { status: 500 }
    );
  }
}

// PUT - 批量导入数据
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { data } = body;
    
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: '无效的导入数据' },
        { status: 400 }
      );
    }
    
    // 使用事务批量插入
    const insertStmt = db.prepare(`
      INSERT INTO student_fees 
      (class_name, student_name, tuition_fee, lunch_fee, nap_fee, after_school_fee, club_fee, other_fee, remark)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertMany = db.transaction((students: Array<{
      className: string;
      studentName: string;
      tuitionFee?: number;
      lunchFee?: number;
      napFee?: number;
      afterSchoolFee?: number;
      clubFee?: number;
      otherFee?: number;
      remark?: string;
    }>) => {
      for (const student of students) {
        if (!student.className || !student.studentName) continue;
        
        insertStmt.run(
          student.className,
          student.studentName,
          student.tuitionFee || 0,
          student.lunchFee || 0,
          student.napFee || 0,
          student.afterSchoolFee || 0,
          student.clubFee || 0,
          student.otherFee || 0,
          student.remark || null
        );
      }
    });
    
    insertMany(data);
    
    return NextResponse.json({ 
      success: true,
      message: `成功导入 ${data.length} 条数据`
    });
  } catch (error) {
    console.error('Error importing data:', error);
    return NextResponse.json(
      { error: 'Failed to import data' },
      { status: 500 }
    );
  }
}

// DELETE - 清空所有数据
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const className = searchParams.get('className');
    
    if (className) {
      db.prepare('DELETE FROM student_fees WHERE class_name = ?').run(className);
      return NextResponse.json({ 
        success: true,
        message: `已删除班级 "${className}" 的所有数据`
      });
    } else {
      db.prepare('DELETE FROM student_fees').run();
      return NextResponse.json({ 
        success: true,
        message: '已清空所有数据'
      });
    }
  } catch (error) {
    console.error('Error deleting data:', error);
    return NextResponse.json(
      { error: 'Failed to delete data' },
      { status: 500 }
    );
  }
}
