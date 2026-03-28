import { NextRequest, NextResponse } from 'next/server';
import { db, initDatabase, FEE_TYPE_MAP } from '@/lib/database';

// 初始化数据库
initDatabase();

// PUT - 批量更新学生的交费记录
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { payments } = body;
    
    if (!Array.isArray(payments) || payments.length === 0) {
      return NextResponse.json({ error: '无效的交费记录' }, { status: 400 });
    }
    
    // 获取学生信息
    const student = db.prepare('SELECT * FROM student_fees WHERE id = ?').get(id) as {
      id: number;
      student_name: string;
    } | undefined;
    
    if (!student) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }
    
    const studentId = student.id;
    const today = new Date().toISOString().split('T')[0];
    
    // 获取现有的交费记录（按类型分组）
    const existingPayments = db.prepare(`
      SELECT fee_type, SUM(amount) as total_amount, COUNT(*) as record_count
      FROM payment_records
      WHERE student_id = ?
      GROUP BY fee_type
    `).all(studentId) as Array<{ fee_type: string; total_amount: number; record_count: number }>;
    
    const paymentMap: Record<string, { total_amount: number; record_count: number }> = {};
    existingPayments.forEach(p => {
      paymentMap[p.fee_type] = { total_amount: p.total_amount, record_count: p.record_count };
    });
    
    // 事务处理：更新交费记录
    const updatePayments = db.transaction((payments: Array<{ type: string; value: number }>) => {
      for (const payment of payments) {
        const { type, value } = payment;
        
        if (!FEE_TYPE_MAP[type]) {
          console.warn(`未知的费用类型: ${type}`);
          continue;
        }
        
        const existing = paymentMap[type];
        const existingAmount = existing?.total_amount || 0;
        
        // 计算差额
        const diff = value - existingAmount;
        
        if (diff > 0) {
          // 需要增加：添加新的交费记录
          db.prepare(`
            INSERT INTO payment_records (student_id, fee_type, amount, payment_date, remark)
            VALUES (?, ?, ?, ?, ?)
          `).run(studentId, type, diff, today, `批量更新 - ${student.student_name}`);
        } else if (diff < 0) {
          // 需要减少：删除最新的交费记录直到达到目标金额
          let remainingToRemove = Math.abs(diff);
          const records = db.prepare(`
            SELECT id, amount
            FROM payment_records
            WHERE student_id = ? AND fee_type = ?
            ORDER BY created_at DESC
          `).all(studentId, type) as Array<{ id: number; amount: number }>;
          
          for (const record of records) {
            if (remainingToRemove <= 0) break;
            
            if (record.amount <= remainingToRemove) {
              // 删除整条记录
              db.prepare(`DELETE FROM payment_records WHERE id = ?`).run(record.id);
              remainingToRemove -= record.amount;
            } else {
              // 减少记录金额（删除原记录，插入新记录）
              db.prepare(`DELETE FROM payment_records WHERE id = ?`).run(record.id);
              db.prepare(`
                INSERT INTO payment_records (student_id, fee_type, amount, payment_date, remark)
                VALUES (?, ?, ?, ?, ?)
              `).run(studentId, type, record.amount - remainingToRemove, today, `批量调整 - ${student.student_name}`);
              remainingToRemove = 0;
            }
          }
        }
        // diff === 0 表示金额相同，无需操作
      }
    });
    
    updatePayments(payments);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating payment records:', error);
    return NextResponse.json(
      { error: 'Failed to update payment records' },
      { status: 500 }
    );
  }
}
