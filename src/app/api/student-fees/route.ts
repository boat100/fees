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
    
    // 获取所有收费项目
    const feeItems = db.prepare(`
      SELECT key, name FROM fee_items WHERE is_active = 1 ORDER BY sort_order
    `).all() as Array<{ key: string; name: string }>;
    
    // 获取每个学生的费用值和已交费汇总
    const studentsWithPayments = students.map(student => {
      // 获取学生的各项费用应交金额（从student_fee_values表）
      const feeValues = db.prepare(`
        SELECT fee_item_key, expected_amount
        FROM student_fee_values
        WHERE student_id = ?
      `).all(student.id) as Array<{ fee_item_key: string; expected_amount: number }>;
      
      const feeValueMap: Record<string, number> = {};
      feeValues.forEach(fv => {
        feeValueMap[fv.fee_item_key] = fv.expected_amount;
      });
      
      // 获取已交费汇总
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
      
      // 构建动态费用对象
      const feeValuesDynamic: Record<string, number> = {};
      const feePaidDynamic: Record<string, number> = {};
      
      // 优先使用新表数据，如果没有则使用旧字段（兼容迁移）
      for (const item of feeItems) {
        // 应交金额：优先新表，其次旧字段
        if (feeValueMap[item.key] !== undefined) {
          feeValuesDynamic[item.key] = feeValueMap[item.key];
        } else {
          // 兼容旧字段
          const oldField = `${item.key}_fee` as keyof typeof student;
          feeValuesDynamic[item.key] = (student[oldField] as number) || 0;
        }
        
        // 已交金额
        feePaidDynamic[item.key] = paymentMap[item.key] || 0;
      }
      
      // agency_paid 和 agency_balance 特殊处理
      const agencyPaid = student.agency_paid ?? feeValuesDynamic['agency'] ?? 600;
      
      return {
        ...student,
        feeValues: feeValuesDynamic,
        feePaid: feePaidDynamic,
        agency_paid: agencyPaid,
        agency_balance: agencyPaid - agencyUsed.total,
      };
    });
    
    return NextResponse.json({ 
      data: studentsWithPayments,
      feeItems: feeItems
    });
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
      remark = null,
      feeValues, // 新格式：动态费用项目 { tuition: 1000, lunch: 500, ... }
    } = body;
    
    // 验证必填字段
    if (!className || !studentName) {
      return NextResponse.json(
        { error: '班级和姓名为必填项' },
        { status: 400 }
      );
    }
    
    // 获取所有收费项目
    const feeItems = db.prepare(`
      SELECT key, name FROM fee_items WHERE is_active = 1 ORDER BY sort_order
    `).all() as Array<{ key: string; name: string }>;
    
    // 兼容旧格式：从单独字段获取费用值
    const legacyFeeValues: Record<string, number> = {
      tuition: body.tuitionFee ?? 0,
      lunch: body.lunchFee ?? 0,
      nap: body.napFee ?? 0,
      after_school: body.afterSchoolFee ?? 0,
      club: body.clubFee ?? 0,
      agency: body.agencyFee ?? 600,
    };
    
    // 合并费用值（新格式优先）
    const finalFeeValues: Record<string, number> = {};
    for (const item of feeItems) {
      if (feeValues && feeValues[item.key] !== undefined) {
        finalFeeValues[item.key] = feeValues[item.key];
      } else if (legacyFeeValues[item.key] !== undefined) {
        finalFeeValues[item.key] = legacyFeeValues[item.key];
      } else {
        finalFeeValues[item.key] = item.key === 'agency' ? 600 : 0;
      }
    }
    
    // 根据午餐费或午托费自动判断午托状态
    const napStatus = (finalFeeValues['lunch'] > 0 || finalFeeValues['nap'] > 0) ? '午托' : '走读';
    
    // agencyPaid 默认等于 agencyFee（视为一次性收齐）
    const agencyPaidValue = body.agencyPaid ?? finalFeeValues['agency'] ?? 600;
    
    // 插入学生记录（保持旧字段兼容性）
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
      finalFeeValues['tuition'] ?? 0,
      finalFeeValues['lunch'] ?? 0,
      finalFeeValues['nap'] ?? 0,
      finalFeeValues['after_school'] ?? 0,
      finalFeeValues['club'] ?? 0,
      finalFeeValues['agency'] ?? 600,
      agencyPaidValue,
      remark
    );
    
    const studentId = result.lastInsertRowid as number;
    
    // 插入费用值到新表
    const insertFeeValue = db.prepare(
      'INSERT OR REPLACE INTO student_fee_values (student_id, fee_item_key, expected_amount) VALUES (?, ?, ?)'
    );
    
    for (const [key, value] of Object.entries(finalFeeValues)) {
      if (value > 0) {
        insertFeeValue.run(studentId, key, value);
      }
    }
    
    const newStudent = db.prepare('SELECT * FROM student_fees WHERE id = ?').get(studentId);
    
    return NextResponse.json({ 
      data: newStudent,
      feeValues: finalFeeValues
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating student fee:', error);
    return NextResponse.json(
      { error: 'Failed to create student fee' },
      { status: 500 }
    );
  }
}

// PUT - 批量导入数据（覆盖重复学生，支持已交费用和动态费用项目）
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
    
    // 获取所有收费项目
    const feeItems = db.prepare(`
      SELECT key, name FROM fee_items WHERE is_active = 1 ORDER BY sort_order
    `).all() as Array<{ key: string; name: string }>;
    
    // 构建费用字段映射（用于兼容旧格式）
    const feeFieldMap: Record<string, string> = {
      tuition: 'tuitionFee',
      lunch: 'lunchFee',
      nap: 'napFee',
      after_school: 'afterSchoolFee',
      club: 'clubFee',
      agency: 'agencyFee',
    };
    
    // 验证并处理每条记录
    interface ValidRecord {
      className: string;
      studentName: string;
      gender: string;
      feeValues: Record<string, number>;
      feePaid: Record<string, number>;
      paymentDate: string;
      remark: string;
    }
    
    const validRecords: ValidRecord[] = [];
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
      
      // 验证各项金额（动态）
      const feeValues: Record<string, number> = {};
      const feePaid: Record<string, number> = {};
      let hasInvalidAmount = false;
      const invalidFields: string[] = [];
      
      for (const item of feeItems) {
        // 尝试多种字段名格式
        const fieldName = feeFieldMap[item.key] || item.key;
        
        // 应交金额
        const expectedValue = student[`${fieldName}`] ?? student[`fee_${item.key}`] ?? student[item.key] ?? 0;
        const expectedNum = Number(expectedValue);
        if (isNaN(expectedNum) || expectedNum < 0) {
          hasInvalidAmount = true;
          invalidFields.push(`${item.name}应交`);
        } else {
          feeValues[item.key] = expectedNum;
        }
        
        // 已交金额
        const paidValue = student[`${fieldName}Paid`] ?? student[`${item.key}Paid`] ?? student[`paid_${item.key}`] ?? 0;
        const paidNum = Number(paidValue);
        if (isNaN(paidNum) || paidNum < 0) {
          hasInvalidAmount = true;
          invalidFields.push(`${item.name}已交`);
        } else {
          feePaid[item.key] = paidNum;
        }
      }
      
      if (hasInvalidAmount) {
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
        feeValues,
        feePaid,
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
    
    const insertFeeValueStmt = db.prepare(`
      INSERT OR REPLACE INTO student_fee_values (student_id, fee_item_key, expected_amount)
      VALUES (?, ?, ?)
    `);
    
    const importMany = db.transaction((students: ValidRecord[]) => {
      for (const student of students) {        
        // 根据午餐费或午托费自动判断午托状态
        const napStatus = (student.feeValues['lunch'] > 0 || student.feeValues['nap'] > 0) ? '午托' : '走读';
        
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
            student.feeValues['tuition'] ?? 0,
            student.feeValues['lunch'] ?? 0,
            student.feeValues['nap'] ?? 0,
            student.feeValues['after_school'] ?? 0,
            student.feeValues['club'] ?? 0,
            student.feeValues['agency'] ?? 600,
            student.feePaid['agency'] ?? student.feeValues['agency'] ?? 600,
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
            student.feeValues['tuition'] ?? 0,
            student.feeValues['lunch'] ?? 0,
            student.feeValues['nap'] ?? 0,
            student.feeValues['after_school'] ?? 0,
            student.feeValues['club'] ?? 0,
            student.feeValues['agency'] ?? 600,
            student.feePaid['agency'] ?? student.feeValues['agency'] ?? 600,
            null
          );
          studentId = result.lastInsertRowid as number;
          insertCount++;
        }
        
        // 更新费用值到新表
        for (const [key, value] of Object.entries(student.feeValues)) {
          insertFeeValueStmt.run(studentId, key, value);
        }
        
        // 处理已交费用（如果有任何已交金额）
        const hasPaidAmounts = Object.values(student.feePaid).some(v => v > 0);
        
        if (hasPaidAmounts) {
          // 删除该学生之前的所有交费记录
          deletePaymentsStmt.run(studentId);
          
          const paymentDate = student.paymentDate;
          const paymentRemark = student.remark || null;
          
          for (const [feeType, amount] of Object.entries(student.feePaid)) {
            if (amount > 0) {
              insertPaymentStmt.run(studentId, feeType, amount, paymentDate, paymentRemark);
              paymentCount++;
            }
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
