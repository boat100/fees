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
      gender: string;
      nap_status: string;
      tuition_fee: number;
      lunch_fee: number;
      nap_fee: number;
      after_school_fee: number;
      club_fee: number;
      agency_fee: number;
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
        // 代办费不需要 paid，因为是一次性收齐
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
      gender = '男',
      tuitionFee = 0,
      lunchFee = 0,
      napFee = 0,
      afterSchoolFee = 0,
      clubFee = 0,
      agencyFee = 600, // 默认代办费600元
      remark = null,
    } = body;
    
    // 验证必填字段
    if (!className || !studentName) {
      return NextResponse.json(
        { error: '班级和姓名为必填项' },
        { status: 400 }
      );
    }
    
    // 根据午托费自动判断午托状态
    const napStatus = napFee > 0 ? '午托' : '走读';
    
    const stmt = db.prepare(`
      INSERT INTO student_fees 
      (class_name, student_name, gender, nap_status, tuition_fee, lunch_fee, nap_fee, after_school_fee, club_fee, agency_fee, remark)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      className,
      studentName,
      gender,
      napStatus,
      tuitionFee,
      lunchFee,
      napFee,
      afterSchoolFee,
      clubFee,
      agencyFee,
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

// PUT - 批量导入数据（覆盖重复学生，支持已交费用）
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
    
    let insertCount = 0;
    let updateCount = 0;
    let paymentCount = 0;
    
    const insertStmt = db.prepare(`
      INSERT INTO student_fees 
      (class_name, student_name, gender, nap_status, tuition_fee, lunch_fee, nap_fee, after_school_fee, club_fee, agency_fee, remark)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const updateStmt = db.prepare(`
      UPDATE student_fees 
      SET gender = ?, nap_status = ?, 
          tuition_fee = ?, lunch_fee = ?, nap_fee = ?, 
          after_school_fee = ?, club_fee = ?, agency_fee = ?, remark = ?, updated_at = CURRENT_TIMESTAMP
      WHERE class_name = ? AND student_name = ?
    `);
    
    const insertPaymentStmt = db.prepare(`
      INSERT INTO payment_records (student_id, fee_type, amount, payment_date, remark)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const deletePaymentsStmt = db.prepare(`
      DELETE FROM payment_records WHERE student_id = ?
    `);
    
    const importMany = db.transaction((students: Array<{
      className: string;
      studentName: string;
      gender?: string;
      tuitionFee?: number;
      tuitionPaid?: number;
      lunchFee?: number;
      lunchPaid?: number;
      napFee?: number;
      napPaid?: number;
      afterSchoolFee?: number;
      afterSchoolPaid?: number;
      clubFee?: number;
      clubPaid?: number;
      agencyFee?: number;
      remark?: string;
    }>) => {
      for (const student of students) {
        if (!student.className || !student.studentName) continue;
        
        // 根据午托费自动判断午托状态
        const napStatus = (student.napFee || 0) > 0 ? '午托' : '走读';
        
        // 检查学生是否已存在
        const existing = db.prepare(
          'SELECT id FROM student_fees WHERE class_name = ? AND student_name = ?'
        ).get(student.className, student.studentName) as { id: number } | undefined;
        
        let studentId: number;
        
        if (existing) {
          // 更新已存在学生
          updateStmt.run(
            student.gender || '男',
            napStatus,
            student.tuitionFee || 0,
            student.lunchFee || 0,
            student.napFee || 0,
            student.afterSchoolFee || 0,
            student.clubFee || 0,
            student.agencyFee || 600,
            student.remark || null,
            student.className,
            student.studentName
          );
          studentId = existing.id;
          updateCount++;
        } else {
          // 新增学生
          const result = insertStmt.run(
            student.className,
            student.studentName,
            student.gender || '男',
            napStatus,
            student.tuitionFee || 0,
            student.lunchFee || 0,
            student.napFee || 0,
            student.afterSchoolFee || 0,
            student.clubFee || 0,
            student.agencyFee || 600,
            student.remark || null
          );
          studentId = result.lastInsertRowid as number;
          insertCount++;
        }
        
        // 处理已交费用（如果有任何已交金额）
        const hasPaidAmounts = 
          (student.tuitionPaid || 0) > 0 ||
          (student.lunchPaid || 0) > 0 ||
          (student.napPaid || 0) > 0 ||
          (student.afterSchoolPaid || 0) > 0 ||
          (student.clubPaid || 0) > 0;
        
        if (hasPaidAmounts) {
          // 删除该学生之前的所有交费记录
          deletePaymentsStmt.run(studentId);
          
          // 插入新的交费记录
          const paymentDate = new Date().toISOString().split('T')[0];
          
          if ((student.tuitionPaid || 0) > 0) {
            insertPaymentStmt.run(studentId, 'tuition', student.tuitionPaid, paymentDate, '批量导入');
            paymentCount++;
          }
          if ((student.lunchPaid || 0) > 0) {
            insertPaymentStmt.run(studentId, 'lunch', student.lunchPaid, paymentDate, '批量导入');
            paymentCount++;
          }
          if ((student.napPaid || 0) > 0) {
            insertPaymentStmt.run(studentId, 'nap', student.napPaid, paymentDate, '批量导入');
            paymentCount++;
          }
          if ((student.afterSchoolPaid || 0) > 0) {
            insertPaymentStmt.run(studentId, 'after_school', student.afterSchoolPaid, paymentDate, '批量导入');
            paymentCount++;
          }
          if ((student.clubPaid || 0) > 0) {
            insertPaymentStmt.run(studentId, 'club', student.clubPaid, paymentDate, '批量导入');
            paymentCount++;
          }
        }
      }
    });
    
    importMany(data);
    
    return NextResponse.json({ 
      success: true, 
      insertCount, 
      updateCount,
      paymentCount,
      total: insertCount + updateCount 
    });
  } catch (error) {
    console.error('Error importing data:', error);
    return NextResponse.json(
      { error: 'Failed to import data' },
      { status: 500 }
    );
  }
}
