import { NextRequest, NextResponse } from 'next/server';
import { db, initDatabase } from '@/lib/database';
import { isAuthenticated } from '@/lib/auth';

// 初始化数据库
initDatabase();

// 获取类别名称列表
function getCategoryNames(): string[] {
  const categories = db.prepare(`
    SELECT name FROM expense_categories ORDER BY sort_order, id
  `).all() as Array<{ name: string }>;
  return categories.map(c => c.name);
}

// GET - 获取支出统计数据
export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const timeType = searchParams.get('timeType') || 'all'; // all, year, month
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    // 获取动态类别名称
    const categoryNames = getCategoryNames();

    // 构建时间筛选条件
    let timeCondition = '';
    const params: (string | number)[] = [];

    if (timeType === 'year' && year) {
      timeCondition = " AND strftime('%Y', occur_date) = ?";
      params.push(year);
    } else if (timeType === 'month' && month) {
      // month 格式: YYYY-MM
      const [yearPart, monthPart] = month.split('-');
      timeCondition = " AND strftime('%Y', occur_date) = ? AND strftime('%m', occur_date) = ?";
      params.push(yearPart, monthPart);
    }

    // 1. 按类别统计（使用动态类别）
    const categoryStats = db.prepare(`
      SELECT 
        category,
        SUM(amount) as total_amount,
        COUNT(*) as record_count
      FROM expense_records
      WHERE 1=1 ${timeCondition}
      GROUP BY category
      ORDER BY total_amount DESC
    `).all(...params) as Array<{
      category: string;
      total_amount: number;
      record_count: number;
    }>;

    const categoryData = categoryStats.map(stat => ({
      category: stat.category,
      categoryKey: stat.category,
      totalAmount: stat.total_amount,
      recordCount: stat.record_count
    }));

    // 2. 按类别统计子项目
    const itemDataByCategory: Record<string, Array<{ item: string; totalAmount: number; recordCount: number }>> = {};
    
    for (const categoryName of categoryNames) {
      const itemStats = db.prepare(`
        SELECT 
          item,
          SUM(amount) as total_amount,
          COUNT(*) as record_count
        FROM expense_records
        WHERE category = ? ${timeCondition}
        GROUP BY item
        ORDER BY total_amount DESC
      `).all(categoryName, ...params) as Array<{
        item: string;
        total_amount: number;
        record_count: number;
      }>;

      itemDataByCategory[categoryName] = itemStats.map(stat => ({
        item: stat.item,
        totalAmount: stat.total_amount,
        recordCount: stat.record_count
      }));
    }

    // 3. 获取可用的年份列表
    const yearList = db.prepare(`
      SELECT DISTINCT strftime('%Y', occur_date) as year
      FROM expense_records
      WHERE occur_date IS NOT NULL AND occur_date != ''
      ORDER BY year DESC
    `).all() as Array<{ year: string }>;

    // 4. 获取可用的月份列表
    const monthList = db.prepare(`
      SELECT DISTINCT strftime('%Y-%m', occur_date) as month
      FROM expense_records
      WHERE occur_date IS NOT NULL AND occur_date != ''
      ORDER BY month DESC
    `).all() as Array<{ month: string }>;

    // 5. 计算总计
    const totalStats = db.prepare(`
      SELECT 
        SUM(amount) as total_amount,
        COUNT(*) as record_count
      FROM expense_records
      WHERE 1=1 ${timeCondition}
    `).get(...params) as {
      total_amount: number | null;
      record_count: number | null;
    };

    // 构建类别统计对象（兼容旧格式）
    const categoryStatsMap: Record<string, number> = {};
    for (const stat of categoryStats) {
      categoryStatsMap[stat.category] = stat.total_amount;
    }

    return NextResponse.json({
      success: true,
      data: {
        categoryData,
        itemDataByCategory,
        categoryNames,
        yearList: yearList.map(y => y.year),
        monthList: monthList.map(m => m.month),
        totalAmount: totalStats.total_amount || 0,
        totalRecords: totalStats.record_count || 0
      },
      // 为保持与 stats 页面的兼容性，同时返回扁平格式
      total: totalStats.total_amount || 0,
      count: totalStats.record_count || 0,
      categoryStats: categoryStatsMap
    });
  } catch (error) {
    console.error('Error fetching expense stats:', error);
    return NextResponse.json({ error: '获取统计数据失败' }, { status: 500 });
  }
}
