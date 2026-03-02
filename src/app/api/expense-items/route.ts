import { NextRequest, NextResponse } from 'next/server';
import { db, initDatabase } from '@/lib/database';
import { isAuthenticated } from '@/lib/auth';

// 初始化数据库
initDatabase();

// GET - 获取支出子项目
export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get('categoryId');

    let sql = `
      SELECT ei.id, ei.category_id, ei.name, ei.sort_order, ec.name as category_name, ei.created_at, ei.updated_at
      FROM expense_items ei
      JOIN expense_categories ec ON ei.category_id = ec.id
    `;
    const params: (string | number)[] = [];

    if (categoryId) {
      sql += ' WHERE ei.category_id = ?';
      params.push(categoryId);
    }

    sql += ' ORDER BY ec.sort_order, ei.sort_order, ei.id';

    const items = db.prepare(sql).all(...params) as Array<{
      id: number;
      category_id: number;
      name: string;
      sort_order: number;
      category_name: string;
      created_at: string;
      updated_at: string | null;
    }>;

    return NextResponse.json({ data: items });
  } catch (error) {
    console.error('Error fetching expense items:', error);
    return NextResponse.json({ error: '获取支出子项目失败' }, { status: 500 });
  }
}

// POST - 新增支出子项目
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { categoryId, name, sortOrder } = body;

    if (!categoryId) {
      return NextResponse.json({ error: '请选择所属类别' }, { status: 400 });
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ error: '子项目名称不能为空' }, { status: 400 });
    }

    // 检查类别是否存在
    const category = db.prepare('SELECT id FROM expense_categories WHERE id = ?').get(categoryId);
    if (!category) {
      return NextResponse.json({ error: '所属类别不存在' }, { status: 404 });
    }

    // 检查该类别下是否已存在同名子项目
    const existing = db.prepare('SELECT id FROM expense_items WHERE category_id = ? AND name = ?').get(categoryId, name.trim());
    if (existing) {
      return NextResponse.json({ error: '该类别下已存在同名子项目' }, { status: 400 });
    }

    const stmt = db.prepare('INSERT INTO expense_items (category_id, name, sort_order) VALUES (?, ?, ?)');
    const result = stmt.run(categoryId, name.trim(), sortOrder || 0);

    return NextResponse.json({
      success: true,
      message: '子项目添加成功',
      id: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Error creating expense item:', error);
    return NextResponse.json({ error: '添加支出子项目失败' }, { status: 500 });
  }
}

// PUT - 更新支出子项目
export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, categoryId, name, sortOrder } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少子项目ID' }, { status: 400 });
    }

    if (!categoryId) {
      return NextResponse.json({ error: '请选择所属类别' }, { status: 400 });
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ error: '子项目名称不能为空' }, { status: 400 });
    }

    // 检查是否存在，并获取旧名称
    const existing = db.prepare('SELECT id, name, category_id FROM expense_items WHERE id = ?').get(id) as { id: number; name: string; category_id: number } | undefined;
    if (!existing) {
      return NextResponse.json({ error: '子项目不存在' }, { status: 404 });
    }

    const oldName = existing.name;

    // 检查类别是否存在
    const category = db.prepare('SELECT id FROM expense_categories WHERE id = ?').get(categoryId);
    if (!category) {
      return NextResponse.json({ error: '所属类别不存在' }, { status: 404 });
    }

    // 检查名称是否与同类别下其他子项目重复
    const duplicate = db.prepare('SELECT id FROM expense_items WHERE category_id = ? AND name = ? AND id != ?').get(categoryId, name.trim(), id);
    if (duplicate) {
      return NextResponse.json({ error: '该类别下已存在同名子项目' }, { status: 400 });
    }

    // 使用事务确保数据一致性
    const updateItem = db.transaction(() => {
      // 更新子项目
      db.prepare('UPDATE expense_items SET category_id = ?, name = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(categoryId, name.trim(), sortOrder || 0, id);
      
      // 同步更新支出记录中的子项目字段
      if (oldName !== name.trim()) {
        const result = db.prepare('UPDATE expense_records SET item = ?, updated_at = CURRENT_TIMESTAMP WHERE item = ?').run(name.trim(), oldName);
        return { updatedRecords: result.changes };
      }
      return { updatedRecords: 0 };
    });

    const { updatedRecords } = updateItem();

    return NextResponse.json({ 
      success: true, 
      message: updatedRecords > 0 
        ? `子项目更新成功，已同步更新 ${updatedRecords} 条支出记录` 
        : '子项目更新成功' 
    });
  } catch (error) {
    console.error('Error updating expense item:', error);
    return NextResponse.json({ error: '更新支出子项目失败' }, { status: 500 });
  }
}

// DELETE - 删除支出子项目
export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const force = searchParams.get('force') === 'true'; // 是否强制删除（包括关联的支出记录）

    if (!id) {
      return NextResponse.json({ error: '缺少子项目ID' }, { status: 400 });
    }

    // 检查是否存在，并获取子项目名称
    const existing = db.prepare('SELECT id, name FROM expense_items WHERE id = ?').get(id) as { id: number; name: string } | undefined;
    if (!existing) {
      return NextResponse.json({ error: '子项目不存在' }, { status: 404 });
    }

    const itemName = existing.name;

    // 检查是否有支出记录
    const recordCount = db.prepare('SELECT COUNT(*) as count FROM expense_records WHERE item = ?').get(itemName) as { count: number };

    // 如果有支出记录但不是强制删除，返回提示信息
    if (recordCount.count > 0 && !force) {
      return NextResponse.json({ 
        error: '该子项目下有支出记录',
        hasRecords: true,
        recordCount: recordCount.count,
        message: `该子项目下有 ${recordCount.count} 条支出记录，删除子项目将同时删除这些记录，是否继续？`
      }, { status: 400 });
    }

    // 使用事务确保数据一致性
    const deleteItem = db.transaction(() => {
      // 删除关联的支出记录
      if (recordCount.count > 0) {
        db.prepare('DELETE FROM expense_records WHERE item = ?').run(itemName);
      }
      // 删除子项目
      db.prepare('DELETE FROM expense_items WHERE id = ?').run(id);
    });

    deleteItem();

    return NextResponse.json({ 
      success: true, 
      message: recordCount.count > 0 
        ? `子项目删除成功，已同时删除 ${recordCount.count} 条支出记录` 
        : '子项目删除成功',
      deletedRecords: recordCount.count
    });
  } catch (error) {
    console.error('Error deleting expense item:', error);
    return NextResponse.json({ error: '删除支出子项目失败' }, { status: 500 });
  }
}
