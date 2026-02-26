import { NextRequest, NextResponse } from 'next/server';
import { db, initDatabase } from '@/lib/database';

// 初始化数据库
initDatabase();

// GET - 获取单条费用记录
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const fee = db.prepare('SELECT * FROM fees WHERE id = ?').get(id);
    
    if (!fee) {
      return NextResponse.json({ error: '费用记录不存在' }, { status: 404 });
    }
    
    return NextResponse.json({ data: fee });
  } catch (error) {
    console.error('Error fetching fee:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fee' },
      { status: 500 }
    );
  }
}

// PUT - 更新费用记录
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { feeType, amount, status, remark } = body;
    
    // 构建更新语句
    const updates: string[] = [];
    const values: (string | number | null)[] = [];
    
    if (feeType !== undefined) {
      updates.push('fee_type = ?');
      values.push(feeType);
    }
    if (amount !== undefined) {
      updates.push('amount = ?');
      values.push(amount);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status ? 1 : 0);
    }
    if (remark !== undefined) {
      updates.push('remark = ?');
      values.push(remark || null);
    }
    
    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    
    values.push(id);
    
    const stmt = db.prepare(`
      UPDATE fees 
      SET ${updates.join(', ')}
      WHERE id = ?
    `);
    
    const result = stmt.run(...values);
    
    if (result.changes === 0) {
      return NextResponse.json({ error: '费用记录不存在' }, { status: 404 });
    }
    
    // 获取更新后的费用记录
    const updatedFee = db.prepare('SELECT * FROM fees WHERE id = ?').get(id);
    
    return NextResponse.json({ data: updatedFee });
  } catch (error) {
    console.error('Error updating fee:', error);
    return NextResponse.json(
      { error: 'Failed to update fee' },
      { status: 500 }
    );
  }
}

// DELETE - 删除费用记录
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const result = db.prepare('DELETE FROM fees WHERE id = ?').run(id);
    
    if (result.changes === 0) {
      return NextResponse.json({ error: '费用记录不存在' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting fee:', error);
    return NextResponse.json(
      { error: 'Failed to delete fee' },
      { status: 500 }
    );
  }
}
