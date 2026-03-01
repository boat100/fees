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
        SELECT DISTINCT class_name FROM student_fees
      `).all() as Array<{ class_name: string }>;
      
      // 中文数字到阿拉伯数字的映射
      const chineseToNumber: Record<string, number> = {
        '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
        '六': 6, '七': 7, '八': 8, '九': 9, '十': 10
      };
      
      // 提取年级数字的函数
      const extractGradeNumber = (className: string): number => {
        // 尝试匹配各种年级格式
        // 1. "X年级" 格式（如 "一年级1班"）
        const match1 = className.match(/([一二三四五六七八九十])年级/);
        if (match1) {
          return chineseToNumber[match1[1]] || 0;
        }
        // 2. "X年" 格式（如 "一年1班"）
        const match2 = className.match(/([一二三四五六七八九十])年/);
        if (match2) {
          return chineseToNumber[match2[1]] || 0;
        }
        // 3. "数字年级" 格式（如 "1年级1班"）
        const match3 = className.match(/(\d+)\s*年级/);
        if (match3) {
          return parseInt(match3[1], 10);
        }
        // 4. "数字年" 格式（如 "1年1班"）
        const match4 = className.match(/(\d+)\s*年/);
        if (match4) {
          return parseInt(match4[1], 10);
        }
        // 5. 开头是数字（如 "1班"、"101班"）
        const match5 = className.match(/^(\d+)/);
        if (match5) {
          return parseInt(match5[1], 10);
        }
        return 999; // 未知年级排到最后
      };
      
      // 提取班级数字的函数
      const extractClassNumber = (className: string): number => {
        // 匹配 "X班" 格式
        const match = className.match(/(\d+)\s*班/);
        if (match) {
          return parseInt(match[1], 10);
        }
        return 0;
      };
      
      // 按年级和班级排序
      const sortedClasses = classes.map(c => c.class_name).sort((a, b) => {
        const gradeA = extractGradeNumber(a);
        const gradeB = extractGradeNumber(b);
        if (gradeA !== gradeB) {
          return gradeA - gradeB; // 年级从低到高
        }
        // 同年级按班级号排序
        const classA = extractClassNumber(a);
        const classB = extractClassNumber(b);
        return classA - classB;
      });
      
      return NextResponse.json({ 
        data: sortedClasses 
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
      agency_paid: number;
      remark: string | null;
      created_at: string;
      updated_at: string | null;
    }>;
    
    // 获取每个学生的已交费汇总和代办费余额
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
      
      // 计算代办费已扣除金额
      const agencyUsed = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total FROM agency_fee_items WHERE student_id = ?
      `).get(student.id) as { total: number };
      
      // agency_balance = agency_paid - 已扣除
      const agencyPaid = student.agency_paid ?? student.agency_fee ?? 600;
      
      return {
        ...student,
        tuition_paid: paymentMap['tuition'] || 0,
        lunch_paid: paymentMap['lunch'] || 0,
        nap_paid: paymentMap['nap'] || 0,
        after_school_paid: paymentMap['after_school'] || 0,
        club_paid: paymentMap['club'] || 0,
        agency_paid: agencyPaid,
        agency_balance: agencyPaid - agencyUsed.total, // 剩余 = 已交 - 已扣除
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
    
    // agencyPaid 默认等于 agencyFee（视为一次性收齐）
    const agencyPaidValue = body.agencyPaid ?? agencyFee;
    
    const stmt = db.prepare(`
      INSERT INTO student_fees 
      (class_name, student_name, gender, nap_status, tuition_fee, lunch_fee, nap_fee, after_school_fee, club_fee, agency_fee, agency_paid, remark)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      agencyPaidValue,
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
    
    // 验证并处理每条记录
    const validRecords: Array<{
      className: string;
      studentName: string;
      gender: string;
      tuitionFee: number;
      tuitionPaid: number;
      lunchFee: number;
      lunchPaid: number;
      napFee: number;
      napPaid: number;
      afterSchoolFee: number;
      afterSchoolPaid: number;
      clubFee: number;
      clubPaid: number;
      agencyFee: number;
      agencyPaid: number;
      paymentDate: string;
      remark: string;
    }> = [];
    
    const errors: Array<{ row: number; error: string }> = [];
    
    // 日期格式验证正则
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    
    for (let i = 0; i < data.length; i++) {
      const student = data[i];
      const rowNum = i + 2; // Excel/CSV行号从2开始（第1行是表头）
      
      // 验证班级
      const className = String(student.className || '').trim();
      if (!className) {
        errors.push({ row: rowNum, error: '班级不能为空' });
        continue;
      }
      
      // 验证姓名
      const studentName = String(student.studentName || '').trim();
      if (!studentName) {
        errors.push({ row: rowNum, error: '姓名不能为空' });
        continue;
      }
      
      // 验证性别
      const gender = String(student.gender || '男').trim();
      if (gender !== '男' && gender !== '女') {
        errors.push({ row: rowNum, error: `性别"${gender}"无效，必须为"男"或"女"` });
        continue;
      }
      
      // 验证各项金额（必须为非负数）
      const validateAmount = (value: unknown, fieldName: string): number => {
        const num = Number(value);
        if (isNaN(num) || num < 0) {
          return -1; // 标记为无效
        }
        return num;
      };
      
      const tuitionFee = validateAmount(student.tuitionFee, '学费应交');
      const lunchFee = validateAmount(student.lunchFee, '午餐费应交');
      const napFee = validateAmount(student.napFee, '午托费应交');
      const afterSchoolFee = validateAmount(student.afterSchoolFee, '课后服务费应交');
      const clubFee = validateAmount(student.clubFee, '社团费应交');
      const agencyFee = validateAmount(student.agencyFee, '代办费应交');
      
      if (tuitionFee < 0 || lunchFee < 0 || napFee < 0 || afterSchoolFee < 0 || clubFee < 0 || agencyFee < 0) {
        const invalidFields: string[] = [];
        if (tuitionFee < 0) invalidFields.push('学费应交');
        if (lunchFee < 0) invalidFields.push('午餐费应交');
        if (napFee < 0) invalidFields.push('午托费应交');
        if (afterSchoolFee < 0) invalidFields.push('课后服务费应交');
        if (clubFee < 0) invalidFields.push('社团费应交');
        if (agencyFee < 0) invalidFields.push('代办费应交');
        errors.push({ row: rowNum, error: `${invalidFields.join('、')}金额无效，必须为非负数` });
        continue;
      }
      
      // 验证已交金额（必须为非负数）
      const tuitionPaid = validateAmount(student.tuitionPaid, '学费已交');
      const lunchPaid = validateAmount(student.lunchPaid, '午餐费已交');
      const napPaid = validateAmount(student.napPaid, '午托费已交');
      const afterSchoolPaid = validateAmount(student.afterSchoolPaid, '课后服务费已交');
      const clubPaid = validateAmount(student.clubPaid, '社团费已交');
      const agencyPaid = validateAmount(student.agencyPaid, '代办费已交');
      
      if (tuitionPaid < 0 || lunchPaid < 0 || napPaid < 0 || afterSchoolPaid < 0 || clubPaid < 0 || agencyPaid < 0) {
        const invalidFields: string[] = [];
        if (tuitionPaid < 0) invalidFields.push('学费已交');
        if (lunchPaid < 0) invalidFields.push('午餐费已交');
        if (napPaid < 0) invalidFields.push('午托费已交');
        if (afterSchoolPaid < 0) invalidFields.push('课后服务费已交');
        if (clubPaid < 0) invalidFields.push('社团费已交');
        if (agencyPaid < 0) invalidFields.push('代办费已交');
        errors.push({ row: rowNum, error: `${invalidFields.join('、')}金额无效，必须为非负数` });
        continue;
      }
      
      // 验证缴费日期格式
      const paymentDate = String(student.paymentDate || '').trim();
      if (paymentDate && !dateRegex.test(paymentDate)) {
        errors.push({ row: rowNum, error: `缴费日期"${paymentDate}"格式无效，应为YYYY-MM-DD格式` });
        continue;
      }
      
      // 验证通过，添加到有效记录列表
      validRecords.push({
        className,
        studentName,
        gender,
        tuitionFee,
        tuitionPaid,
        lunchFee,
        lunchPaid,
        napFee,
        napPaid,
        afterSchoolFee,
        afterSchoolPaid,
        clubFee,
        clubPaid,
        agencyFee,
        agencyPaid,
        paymentDate: paymentDate || new Date().toISOString().split('T')[0],
        remark: String(student.remark || '').trim(),
      });
    }
    
    // 如果所有记录都有错误，返回错误信息
    if (errors.length > 0 && validRecords.length === 0) {
      return NextResponse.json({
        success: false,
        error: '所有记录都有错误，请修正后再导入',
        errors,
        insertCount: 0,
        updateCount: 0
      }, { status: 400 });
    }
    
    let insertCount = 0;
    let updateCount = 0;
    let paymentCount = 0;
    
    const insertStmt = db.prepare(`
      INSERT INTO student_fees 
      (class_name, student_name, gender, nap_status, tuition_fee, lunch_fee, nap_fee, after_school_fee, club_fee, agency_fee, agency_paid, remark)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const updateStmt = db.prepare(`
      UPDATE student_fees 
      SET gender = ?, nap_status = ?, 
          tuition_fee = ?, lunch_fee = ?, nap_fee = ?, 
          after_school_fee = ?, club_fee = ?, agency_fee = ?, agency_paid = ?, updated_at = CURRENT_TIMESTAMP
      WHERE class_name = ? AND student_name = ?
    `);
    
    const insertPaymentStmt = db.prepare(`
      INSERT INTO payment_records (student_id, fee_type, amount, payment_date, remark)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const deletePaymentsStmt = db.prepare(`
      DELETE FROM payment_records WHERE student_id = ?
    `);
    
    const importMany = db.transaction((students: typeof validRecords) => {
      for (const student of students) {        
        // 根据午餐费或午托费自动判断午托状态
        const napStatus = (student.lunchFee > 0 || student.napFee > 0) ? '午托' : '走读';
        
        // 检查学生是否已存在
        const existing = db.prepare(
          'SELECT id FROM student_fees WHERE class_name = ? AND student_name = ?'
        ).get(student.className, student.studentName) as { id: number } | undefined;
        
        let studentId: number;
        
        if (existing) {
          // 更新已存在学生
          updateStmt.run(
            student.gender,
            napStatus,
            student.tuitionFee,
            student.lunchFee,
            student.napFee,
            student.afterSchoolFee,
            student.clubFee,
            student.agencyFee,
            student.agencyPaid,
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
            student.gender,
            napStatus,
            student.tuitionFee,
            student.lunchFee,
            student.napFee,
            student.afterSchoolFee,
            student.clubFee,
            student.agencyFee,
            student.agencyPaid,
            null  // 备注不存入费用明细，只用于缴费记录
          );
          studentId = result.lastInsertRowid as number;
          insertCount++;
        }
        
        // 处理已交费用（如果有任何已交金额）
        const hasPaidAmounts = 
          student.tuitionPaid > 0 ||
          student.lunchPaid > 0 ||
          student.napPaid > 0 ||
          student.afterSchoolPaid > 0 ||
          student.clubPaid > 0;
        
        if (hasPaidAmounts) {
          // 删除该学生之前的所有交费记录
          deletePaymentsStmt.run(studentId);
          
          const paymentDate = student.paymentDate;
          // 使用导入的备注，如果没有则为空
          const paymentRemark = student.remark || null;
          
          if (student.tuitionPaid > 0) {
            insertPaymentStmt.run(studentId, 'tuition', student.tuitionPaid, paymentDate, paymentRemark);
            paymentCount++;
          }
          if (student.lunchPaid > 0) {
            insertPaymentStmt.run(studentId, 'lunch', student.lunchPaid, paymentDate, paymentRemark);
            paymentCount++;
          }
          if (student.napPaid > 0) {
            insertPaymentStmt.run(studentId, 'nap', student.napPaid, paymentDate, paymentRemark);
            paymentCount++;
          }
          if (student.afterSchoolPaid > 0) {
            insertPaymentStmt.run(studentId, 'after_school', student.afterSchoolPaid, paymentDate, paymentRemark);
            paymentCount++;
          }
          if (student.clubPaid > 0) {
            insertPaymentStmt.run(studentId, 'club', student.clubPaid, paymentDate, paymentRemark);
            paymentCount++;
          }
        }
      }
    });
    
    importMany(validRecords);
    
    // 如果有错误记录，返回部分成功信息和错误详情
    if (errors.length > 0) {
      return NextResponse.json({ 
        success: true,
        message: `成功导入 ${validRecords.length} 条记录，${errors.length} 条记录有错误`,
        insertCount, 
        updateCount,
        paymentCount,
        total: insertCount + updateCount,
        importedCount: validRecords.length,
        errorCount: errors.length,
        errors
      });
    }
    
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
