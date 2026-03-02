import { NextRequest, NextResponse } from 'next/server';
import { db, initDatabase } from '@/lib/database';

// 初始化数据库
initDatabase();

// GET - 获取所有收费项目
export async function GET() {
  try {
    const feeItems = db.prepare(`
      SELECT * FROM fee_items 
      WHERE is_active = 1 
      ORDER BY sort_order
    `).all() as Array<{
      id: number;
      key: string;
      name: string;
      sort_order: number;
      is_active: number;
      created_at: string;
      updated_at: string | null;
    }>;
    
    return NextResponse.json({ data: feeItems });
  } catch (error) {
    console.error('Error fetching fee items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fee items' },
      { status: 500 }
    );
  }
}

// POST - 新增收费项目
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, name, sortOrder } = body;
    
    // 验证必填字段
    if (!key || !name) {
      return NextResponse.json(
        { error: '项目标识和名称为必填项' },
        { status: 400 }
      );
    }
    
    // 验证key格式（只允许字母、数字和下划线）
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(key)) {
      return NextResponse.json(
        { error: '项目标识只能包含字母、数字和下划线，且必须以字母开头' },
        { status: 400 }
      );
    }
    
    // 检查key是否已存在
    const existing = db.prepare('SELECT id FROM fee_items WHERE key = ?').get(key);
    if (existing) {
      return NextResponse.json(
        { error: '项目标识已存在' },
        { status: 400 }
      );
    }
    
    // 获取最大排序号
    const maxOrder = db.prepare('SELECT MAX(sort_order) as max_order FROM fee_items').get() as { max_order: number | null };
    const newSortOrder = sortOrder ?? (maxOrder.max_order ?? 0) + 1;
    
    const stmt = db.prepare(`
      INSERT INTO fee_items (key, name, sort_order)
      VALUES (?, ?, ?)
    `);
    
    const result = stmt.run(key, name, newSortOrder);
    
    const newItem = db.prepare('SELECT * FROM fee_items WHERE id = ?').get(result.lastInsertRowid);
    
    return NextResponse.json({ 
      data: newItem, 
      message: '收费项目添加成功' 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating fee item:', error);
    return NextResponse.json(
      { error: 'Failed to create fee item' },
      { status: 500 }
    );
  }
}

// PUT - 更新收费项目
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, sortOrder } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: '缺少项目ID' },
        { status: 400 }
      );
    }
    
    // 检查项目是否存在
    const existing = db.prepare('SELECT * FROM fee_items WHERE id = ?').get(id) as {
      id: number;
      key: string;
      name: string;
      sort_order: number;
    } | undefined;
    
    if (!existing) {
      return NextResponse.json(
        { error: '项目不存在' },
        { status: 404 }
      );
    }
    
    const updateStmt = db.prepare(`
      UPDATE fee_items 
      SET name = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    updateStmt.run(
      name ?? existing.name,
      sortOrder ?? existing.sort_order,
      id
    );
    
    const updatedItem = db.prepare('SELECT * FROM fee_items WHERE id = ?').get(id);
    
    return NextResponse.json({ 
      data: updatedItem, 
      message: '收费项目更新成功' 
    });
  } catch (error) {
    console.error('Error updating fee item:', error);
    return NextResponse.json(
      { error: 'Failed to update fee item' },
      { status: 500 }
    );
  }
}

// DELETE - 删除收费项目（软删除）
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: '缺少项目ID' },
        { status: 400 }
      );
    }
    
    // 检查项目是否存在
    const existing = db.prepare('SELECT * FROM fee_items WHERE id = ?').get(id) as {
      id: number;
      key: string;
      name: string;
    } | undefined;
    
    if (!existing) {
      return NextResponse.json(
        { error: '项目不存在' },
        { status: 404 }
      );
    }
    
    // 检查是否有学生使用了这个费用项目
    const usageCount = db.prepare(`
      SELECT COUNT(*) as count FROM student_fee_values WHERE fee_item_key = ?
    `).get(existing.key) as { count: number };
    
    if (usageCount.count > 0) {
      // 如果有学生使用，执行软删除
      db.prepare('UPDATE fee_items SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
      return NextResponse.json({ 
        message: `该收费项目已被 ${usageCount.count} 名学生使用，已标记为停用` 
      });
    }
    
    // 检查是否有交费记录
    const paymentCount = db.prepare(`
      SELECT COUNT(*) as count FROM payment_records WHERE fee_type = ?
    `).get(existing.key) as { count: number };
    
    if (paymentCount.count > 0) {
      // 如果有交费记录，执行软删除
      db.prepare('UPDATE fee_items SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
      return NextResponse.json({ 
        message: `该收费项目已有 ${paymentCount.count} 条交费记录，已标记为停用` 
      });
    }
    
    // 没有使用，可以硬删除
    db.prepare('DELETE FROM fee_items WHERE id = ?').run(id);
    
    return NextResponse.json({ 
      message: '收费项目删除成功' 
    });
  } catch (error) {
    console.error('Error deleting fee item:', error);
    return NextResponse.json(
      { error: 'Failed to delete fee item' },
      { status: 500 }
    );
  }
}
