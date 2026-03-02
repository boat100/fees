import { NextRequest, NextResponse } from 'next/server';
import { db, initDatabase } from '@/lib/database';

// 初始化数据库
initDatabase();

// GET - 获取单个学生详情（包含所有交费记录和代办费扣除项目）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const student = db.prepare('SELECT * FROM student_fees WHERE id = ?').get(id) as {
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
    } | undefined;
    
    if (!student) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }
    
    // 获取所有收费项目
    const feeItems = db.prepare(`
      SELECT key, name FROM fee_items WHERE is_active = 1 ORDER BY sort_order
    `).all() as Array<{ key: string; name: string }>;
    
    // 获取学生的各项费用应交金额（从student_fee_values表）
    const feeValues = db.prepare(`
      SELECT fee_item_key, expected_amount
      FROM student_fee_values
      WHERE student_id = ?
    `).all(id) as Array<{ fee_item_key: string; expected_amount: number }>;
    
    const feeValueMap: Record<string, number> = {};
    feeValues.forEach(fv => {
      feeValueMap[fv.fee_item_key] = fv.expected_amount;
    });
    
    // 构建动态费用值对象
    const feeValuesDynamic: Record<string, number> = {};
    for (const item of feeItems) {
      if (feeValueMap[item.key] !== undefined) {
        feeValuesDynamic[item.key] = feeValueMap[item.key];
      } else {
        // 兼容旧字段
        const oldField = `${item.key}_fee` as keyof typeof student;
        feeValuesDynamic[item.key] = (student[oldField] as number) || 0;
      }
    }
    
    // 获取所有交费记录
    const paymentRecords = db.prepare(`
      SELECT * FROM payment_records 
      WHERE student_id = ? 
      ORDER BY payment_date DESC, created_at DESC
    `).all(id) as Array<{
      id: number;
      student_id: number;
      fee_type: string;
      amount: number;
      payment_date: string;
      remark: string | null;
      created_at: string;
    }>;
    
    // 按费用类型分组并计算已交总额
    const paymentsByType: Record<string, { records: typeof paymentRecords; total: number }> = {};
    feeItems.forEach(item => {
      paymentsByType[item.key] = { records: [], total: 0 };
    });
    
    paymentRecords.forEach(record => {
      if (paymentsByType[record.fee_type]) {
        paymentsByType[record.fee_type].records.push(record);
        paymentsByType[record.fee_type].total += record.amount;
      } else {
        // 动态项目可能不在feeItems中（已停用），也要显示
        paymentsByType[record.fee_type] = { 
          records: [record], 
          total: record.amount 
        };
      }
    });
    
    // 获取代办费扣除项目
    const agencyFeeItems = db.prepare(`
      SELECT * FROM agency_fee_items 
      WHERE student_id = ? 
      ORDER BY item_date DESC, created_at DESC
    `).all(id) as Array<{
      id: number;
      student_id: number;
      item_type: string;
      amount: number;
      item_date: string;
      remark: string | null;
      created_at: string;
    }>;
    
    // 计算代办费余额（剩余 = 已交 - 已扣除）
    const agencyUsed = agencyFeeItems.reduce((sum, item) => sum + item.amount, 0);
    const agencyPaid = student.agency_paid ?? feeValuesDynamic['agency'] ?? 600;
    const agencyBalance = agencyPaid - agencyUsed;
    
    return NextResponse.json({ 
      data: {
        ...student,
        feeValues: feeValuesDynamic,
        paymentsByType,
        paymentRecords,
        agencyFeeItems,
        agencyUsed,
        agencyBalance,
      },
      feeItems: feeItems
    });
  } catch (error) {
    console.error('Error fetching student fee:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student fee' },
      { status: 500 }
    );
  }
}

// PUT - 更新学生应交费用
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
      gender,
      remark,
      feeValues, // 新格式：动态费用项目 { tuition: 1000, lunch: 500, ... }
    } = body;
    
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
        finalFeeValues[item.key] = 0;
      }
    }
    
    // 根据午餐费或午托费自动判断午托状态
    const napStatus = (finalFeeValues['lunch'] > 0 || finalFeeValues['nap'] > 0) ? '午托' : '走读';
    
    // agencyPaid 处理
    const agencyPaidValue = body.agencyPaid ?? finalFeeValues['agency'] ?? 600;
    
    // 更新学生记录
    const stmt = db.prepare(`
      UPDATE student_fees 
      SET class_name = ?, student_name = ?, gender = ?, nap_status = ?,
          tuition_fee = ?, lunch_fee = ?, nap_fee = ?, 
          after_school_fee = ?, club_fee = ?, agency_fee = ?, agency_paid = ?,
          remark = ?, updated_at = ?
      WHERE id = ?
    `);
    
    const result = stmt.run(
      className,
      studentName,
      gender ?? '男',
      napStatus,
      finalFeeValues['tuition'] ?? 0,
      finalFeeValues['lunch'] ?? 0,
      finalFeeValues['nap'] ?? 0,
      finalFeeValues['after_school'] ?? 0,
      finalFeeValues['club'] ?? 0,
      finalFeeValues['agency'] ?? 600,
      agencyPaidValue,
      remark || null,
      new Date().toISOString(),
      id
    );
    
    if (result.changes === 0) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }
    
    // 更新费用值到新表
    const updateFeeValue = db.prepare(
      'INSERT OR REPLACE INTO student_fee_values (student_id, fee_item_key, expected_amount) VALUES (?, ?, ?)'
    );
    
    for (const [key, value] of Object.entries(finalFeeValues)) {
      updateFeeValue.run(Number(id), key, value);
    }
    
    const updatedStudent = db.prepare('SELECT * FROM student_fees WHERE id = ?').get(id);
    
    return NextResponse.json({ 
      data: updatedStudent,
      feeValues: finalFeeValues
    });
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
    
    // 先删除交费记录
    db.prepare('DELETE FROM payment_records WHERE student_id = ?').run(id);
    
    // 删除代办费扣除项目
    db.prepare('DELETE FROM agency_fee_items WHERE student_id = ?').run(id);
    
    // 删除费用值
    db.prepare('DELETE FROM student_fee_values WHERE student_id = ?').run(id);
    
    // 再删除学生
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
