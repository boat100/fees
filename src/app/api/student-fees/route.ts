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
      tuitionFee = 0, tuitionPaid = 0, tuitionPaidDate = null,
      lunchFee = 0, lunchPaid = 0, lunchPaidDate = null,
      napFee = 0, napPaid = 0, napPaidDate = null,
      afterSchoolFee = 0, afterSchoolPaid = 0, afterSchoolPaidDate = null,
      clubFee = 0, clubPaid = 0, clubPaidDate = null,
      otherFee = 0, otherPaid = 0, otherPaidDate = null,
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
      (class_name, student_name, 
       tuition_fee, tuition_paid, tuition_paid_date,
       lunch_fee, lunch_paid, lunch_paid_date,
       nap_fee, nap_paid, nap_paid_date,
       after_school_fee, after_school_paid, after_school_paid_date,
       club_fee, club_paid, club_paid_date,
       other_fee, other_paid, other_paid_date,
       remark)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      className, studentName,
      tuitionFee, tuitionPaid, tuitionPaidDate,
      lunchFee, lunchPaid, lunchPaidDate,
      napFee, napPaid, napPaidDate,
      afterSchoolFee, afterSchoolPaid, afterSchoolPaidDate,
      clubFee, clubPaid, clubPaidDate,
      otherFee, otherPaid, otherPaidDate,
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
      (class_name, student_name, 
       tuition_fee, tuition_paid, tuition_paid_date,
       lunch_fee, lunch_paid, lunch_paid_date,
       nap_fee, nap_paid, nap_paid_date,
       after_school_fee, after_school_paid, after_school_paid_date,
       club_fee, club_paid, club_paid_date,
       other_fee, other_paid, other_paid_date,
       remark)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertMany = db.transaction((students: Array<{
      className: string;
      studentName: string;
      tuitionFee?: number; tuitionPaid?: number; tuitionPaidDate?: string;
      lunchFee?: number; lunchPaid?: number; lunchPaidDate?: string;
      napFee?: number; napPaid?: number; napPaidDate?: string;
      afterSchoolFee?: number; afterSchoolPaid?: number; afterSchoolPaidDate?: string;
      clubFee?: number; clubPaid?: number; clubPaidDate?: string;
      otherFee?: number; otherPaid?: number; otherPaidDate?: string;
      remark?: string;
    }>) => {
      for (const student of students) {
        if (!student.className || !student.studentName) continue;
        
        insertStmt.run(
          student.className, student.studentName,
          student.tuitionFee || 0, student.tuitionPaid || 0, student.tuitionPaidDate || null,
          student.lunchFee || 0, student.lunchPaid || 0, student.lunchPaidDate || null,
          student.napFee || 0, student.napPaid || 0, student.napPaidDate || null,
          student.afterSchoolFee || 0, student.afterSchoolPaid || 0, student.afterSchoolPaidDate || null,
          student.clubFee || 0, student.clubPaid || 0, student.clubPaidDate || null,
          student.otherFee || 0, student.otherPaid || 0, student.otherPaidDate || null,
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
