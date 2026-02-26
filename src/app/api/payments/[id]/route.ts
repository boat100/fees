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
    
    const result = db.prepare('DELETE FROM payment_records WHERE id = ?').run(id);
    
    if (result.changes === 0) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
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
