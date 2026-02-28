import { NextRequest, NextResponse } from 'next/server';
import { db, initDatabase, EXPENSE_CATEGORIES, DAILY_EXPENSE_ITEMS, PERSONNEL_EXPENSE_ITEMS } from '@/lib/database';
import { isAuthenticated } from '@/lib/auth';

// 初始化数据库
initDatabase();

// GET - 获取支出统计
export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const yearMonth = searchParams.get('yearMonth');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // 构建日期过滤条件
    let dateFilter = '';
    const params: (string | number)[] = [];

    if (yearMonth) {
      dateFilter = ' AND report_date LIKE ?';
      params.push(`${yearMonth}%`);
    } else if (startDate && endDate) {
      dateFilter = ' AND report_date >= ? AND report_date <= ?';
      params.push(startDate, endDate);
    }

    // 按类别统计
    const categoryStats = db.prepare(`
      SELECT category, SUM(amount) as total, COUNT(*) as count
      FROM expense_records
      WHERE 1=1 ${dateFilter}
      GROUP BY category
    `).all(...params) as Array<{ category: string; total: number; count: number }>;

    // 按子项目统计
    const itemStats = db.prepare(`
      SELECT category, item, SUM(amount) as total, COUNT(*) as count
      FROM expense_records
      WHERE 1=1 ${dateFilter}
      GROUP BY category, item
      ORDER BY category, total DESC
    `).all(...params) as Array<{ category: string; item: string; total: number; count: number }>;

    // 按月份统计（最近12个月）
    const monthlyStats = db.prepare(`
      SELECT strftime("%Y-%m", occur_date) as month, 
             SUM(amount) as total,
             COUNT(*) as count
      FROM expense_records
      WHERE occur_date >= date('now', '-12 months')
      GROUP BY strftime("%Y-%m", occur_date)
      ORDER BY month DESC
    `).all() as Array<{ month: string; total: number; count: number }>;

    // 计算总支出
    const totalResult = db.prepare(`
      SELECT SUM(amount) as total, COUNT(*) as count
      FROM expense_records
      WHERE 1=1 ${dateFilter}
    `).get(...params) as { total: number | null; count: number };

    // 分类汇总
    const dailyTotal = categoryStats.find(s => s.category === EXPENSE_CATEGORIES.DAILY)?.total || 0;
    const personnelTotal = categoryStats.find(s => s.category === EXPENSE_CATEGORIES.PERSONNEL)?.total || 0;

    // 构建子项目详情
    const dailyItems = DAILY_EXPENSE_ITEMS.map(itemName => {
      const stat = itemStats.find(s => s.category === EXPENSE_CATEGORIES.DAILY && s.item === itemName);
      return {
        item: itemName,
        total: stat?.total || 0,
        count: stat?.count || 0
      };
    }).filter(item => item.total > 0 || item.count > 0);

    const personnelItems = PERSONNEL_EXPENSE_ITEMS.map(itemName => {
      const stat = itemStats.find(s => s.category === EXPENSE_CATEGORIES.PERSONNEL && s.item === itemName);
      return {
        item: itemName,
        total: stat?.total || 0,
        count: stat?.count || 0
      };
    }).filter(item => item.total > 0 || item.count > 0);

    return NextResponse.json({
      total: totalResult.total || 0,
      count: totalResult.count,
      categoryStats: {
        daily: dailyTotal,
        personnel: personnelTotal
      },
      dailyItems,
      personnelItems,
      monthlyStats,
      allItemStats: itemStats
    });
  } catch (error) {
    console.error('Error fetching expense statistics:', error);
    return NextResponse.json({ error: '获取支出统计失败' }, { status: 500 });
  }
}
