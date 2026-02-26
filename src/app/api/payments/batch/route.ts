import { NextRequest, NextResponse } from 'next/server';
import { db, initDatabase } from '@/lib/database';

// 初始化数据库
initDatabase();

// POST - 批量录入交费记录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { payments, paymentDate, remark } = body;
    
    // payments 格式: [{ studentId: number, feeType: string, amount: number }, ...]
    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      return NextResponse.json({ error: '请提供交费记录数据' }, { status: 400 });
    }
    
    if (!paymentDate) {
      return NextResponse.json({ error: '交费日期为必填项' }, { status: 400 });
    }
    
    const results: Array<{
      studentId: number;
      feeType: string;
      amount: number;
      success: boolean;
      message?: string;
      error?: string;
    }> = [];
    
    let successCount = 0;
    let failCount = 0;
    
    // 使用事务处理批量操作
    const insertStmt = db.prepare(`
      INSERT INTO payment_records (student_id, fee_type, amount, payment_date, remark)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const transaction = db.transaction(() => {
      for (const payment of payments) {
        const { studentId, feeType, amount } = payment;
        
        // 验证必填字段
        if (!studentId || !feeType || !amount || amount <= 0) {
          results.push({
            studentId,
            feeType,
            amount,
            success: false,
            error: '学生ID、费用类型和金额为必填项',
          });
          failCount++;
          continue;
        }
        
        // 验证学生是否存在并获取应交费用
        const student = db.prepare('SELECT * FROM student_fees WHERE id = ?').get(studentId) as {
          id: number;
          student_name: string;
          tuition_fee: number;
          lunch_fee: number;
          nap_fee: number;
          after_school_fee: number;
          club_fee: number;
          other_fee: number;
        } | undefined;
        
        if (!student) {
          results.push({
            studentId,
            feeType,
            amount,
            success: false,
            error: '学生不存在',
          });
          failCount++;
          continue;
        }
        
        // 验证费用类型对应的应交金额
        const feeField = `${feeType}_fee` as keyof typeof student;
        const expectedFee = student[feeField] as number;
        
        // 获取该费用类型已交总额
        const paidResult = db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as total_paid 
          FROM payment_records 
          WHERE student_id = ? AND fee_type = ?
        `).get(studentId, feeType) as { total_paid: number };
        
        const totalPaid = paidResult.total_paid;
        const newTotal = totalPaid + Number(amount);
        
        // 检查是否超过应交金额
        if (newTotal > expectedFee) {
          results.push({
            studentId,
            feeType,
            amount,
            success: false,
            error: `超出应交金额。应交: ${expectedFee}, 已交: ${totalPaid}, 本次: ${amount}, 合计: ${newTotal}`,
          });
          failCount++;
          continue;
        }
        
        // 插入记录
        insertStmt.run(studentId, feeType, amount, paymentDate, remark || null);
        
        results.push({
          studentId,
          feeType,
          amount,
          success: true,
          message: `${student.student_name} - ${feeType}: 成功录入 ${amount} 元`,
        });
        successCount++;
      }
    });
    
    transaction();
    
    return NextResponse.json({
      success: true,
      message: `批量录入完成：成功 ${successCount} 条，失败 ${failCount} 条`,
      summary: {
        total: payments.length,
        success: successCount,
        fail: failCount,
      },
      results,
    }, { status: 201 });
  } catch (error) {
    console.error('Error batch creating payment records:', error);
    return NextResponse.json(
      { error: '批量录入失败' },
      { status: 500 }
    );
  }
}
