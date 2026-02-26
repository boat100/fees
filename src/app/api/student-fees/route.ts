import { NextRequest, NextResponse } from 'next/server';
import { db, initDatabase, FEE_TYPE_MAP } from '@/lib/database';

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
    
    // 获取学生费用列表（包含已交费汇总）
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
    
    const students = db.prepare(sql).all(...params) as Array<{
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
    }>;
    
    // 获取每个学生的已交费汇总
    const studentsWithPayments = students.map(student => {
      const payments = db.prepare(`
        SELECT fee_type, SUM(amount) as total_paid
        FROM payment_records
        WHERE student_id = ?
        GROUP BY fee_type
      `).all(student.id) as Array<{ fee_type: string; total_paid: number }>;
      
      const paymentMap: Record<string, number> = {};
      payments.forEach(p => {
        paymentMap[p.fee_type] = p.total_paid;
      });
      
      return {
        ...student,
        tuition_paid: paymentMap['tuition'] || 0,
        lunch_paid: paymentMap['lunch'] || 0,
        nap_paid: paymentMap['nap'] || 0,
        after_school_paid: paymentMap['after_school'] || 0,
        club_paid: paymentMap['club'] || 0,
        other_paid: paymentMap['other'] || 0,
      };
    });
    
    return NextResponse.json({ data: studentsWithPayments });
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
