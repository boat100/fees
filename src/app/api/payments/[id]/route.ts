import { NextRequest, NextResponse } from 'next/server';
import { db, initDatabase } from '@/lib/database';

// 初始化数据库
initDatabase();

// DELETE - 删除交费记录
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 先获取要删除的记录信息
    const record = db.prepare(`
      SELECT pr.*, sf.agency_paid
      FROM payment_records pr
      LEFT JOIN student_fees sf ON pr.student_id = sf.id
      WHERE pr.id = ?
    `).get(id) as {
      id: number;
      student_id: number;
      fee_type: string;
      amount: number;
      agency_paid: number | null;
    } | undefined;
    
    if (!record) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }
    
    // 删除记录
    const result = db.prepare('DELETE FROM payment_records WHERE id = ?').run(id);
    
    // 如果是代办费，需要同步更新 agency_paid 字段
    if (record.fee_type === 'agency') {
      const newAgencyPaid = Math.max(0, (record.agency_paid || 0) - record.amount);
      db.prepare('UPDATE student_fees SET agency_paid = ? WHERE id = ?').run(newAgencyPaid, record.student_id);
    }
    
    return NextResponse.json({ success: true, message: '交费记录已删除' });
  } catch (error) {
    console.error('Error deleting payment record:', error);
    return NextResponse.json(
      { error: 'Failed to delete payment record' },
      { status: 500 }
    );
  }
}
