import { NextRequest, NextResponse } from 'next/server';
import { db, initDatabase } from '@/lib/database';
import { isAuthenticated } from '@/lib/auth';

// 初始化数据库
initDatabase();

// GET - 获取所有支出类别（包含子项目）
export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const withItems = searchParams.get('withItems') === 'true';

    // 获取所有类别
    const categories = db.prepare(`
      SELECT id, name, sort_order, created_at, updated_at
      FROM expense_categories
      ORDER BY sort_order, id
    `).all() as Array<{
      id: number;
      name: string;
      sort_order: number;
      created_at: string;
      updated_at: string | null;
    }>;

    if (withItems) {
      // 获取所有子项目
      const items = db.prepare(`
        SELECT id, category_id, name, sort_order, created_at, updated_at
        FROM expense_items
        ORDER BY sort_order, id
      `).all() as Array<{
        id: number;
        category_id: number;
        name: string;
        sort_order: number;
        created_at: string;
        updated_at: string | null;
      }>;

      // 组装数据
      const result = categories.map(category => ({
        ...category,
        items: items.filter(item => item.category_id === category.id)
      }));

      return NextResponse.json({ data: result });
    }

    return NextResponse.json({ data: categories });
  } catch (error) {
    console.error('Error fetching expense categories:', error);
    return NextResponse.json({ error: '获取支出类别失败' }, { status: 500 });
  }
}

// POST - 新增支出类别
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, sortOrder } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: '类别名称不能为空' }, { status: 400 });
    }

    // 检查是否已存在
    const existing = db.prepare('SELECT id FROM expense_categories WHERE name = ?').get(name.trim());
    if (existing) {
      return NextResponse.json({ error: '类别名称已存在' }, { status: 400 });
    }

    const stmt = db.prepare('INSERT INTO expense_categories (name, sort_order) VALUES (?, ?)');
    const result = stmt.run(name.trim(), sortOrder || 0);

    return NextResponse.json({
      success: true,
      message: '类别添加成功',
      id: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Error creating expense category:', error);
    return NextResponse.json({ error: '添加支出类别失败' }, { status: 500 });
  }
}

// PUT - 更新支出类别
export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, name, sortOrder } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少类别ID' }, { status: 400 });
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ error: '类别名称不能为空' }, { status: 400 });
    }

    // 检查是否存在
    const existing = db.prepare('SELECT id FROM expense_categories WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: '类别不存在' }, { status: 404 });
    }

    // 检查名称是否与其他类别重复
    const duplicate = db.prepare('SELECT id FROM expense_categories WHERE name = ? AND id != ?').get(name.trim(), id);
    if (duplicate) {
      return NextResponse.json({ error: '类别名称已存在' }, { status: 400 });
    }

    const stmt = db.prepare('UPDATE expense_categories SET name = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(name.trim(), sortOrder || 0, id);

    return NextResponse.json({ success: true, message: '类别更新成功' });
  } catch (error) {
    console.error('Error updating expense category:', error);
    return NextResponse.json({ error: '更新支出类别失败' }, { status: 500 });
  }
}

// DELETE - 删除支出类别
export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少类别ID' }, { status: 400 });
    }

    // 检查是否存在
    const existing = db.prepare('SELECT id FROM expense_categories WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: '类别不存在' }, { status: 404 });
    }

    // 检查是否有子项目
    const itemCount = db.prepare('SELECT COUNT(*) as count FROM expense_items WHERE category_id = ?').get(id) as { count: number };
    if (itemCount.count > 0) {
      return NextResponse.json({ error: '该类别下还有子项目，请先删除子项目' }, { status: 400 });
    }

    db.prepare('DELETE FROM expense_categories WHERE id = ?').run(id);

    return NextResponse.json({ success: true, message: '类别删除成功' });
  } catch (error) {
    console.error('Error deleting expense category:', error);
    return NextResponse.json({ error: '删除支出类别失败' }, { status: 500 });
  }
}
