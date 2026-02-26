import { NextResponse } from 'next/server';
import { db, initDatabase } from '@/lib/database';

// 初始化数据库
initDatabase();

// GET - 获取统计数据
export async function GET() {
  try {
    // 1. 全校各班级交费情况
    const classStats = db.prepare(`
      SELECT 
        sf.class_name,
        COUNT(*) as student_count,
        SUM(sf.tuition_fee) as tuition_fee,
        SUM(sf.lunch_fee) as lunch_fee,
        SUM(sf.nap_fee) as nap_fee,
        SUM(sf.after_school_fee) as after_school_fee,
        SUM(sf.club_fee) as club_fee,
        SUM(sf.other_fee) as other_fee,
        COALESCE(pm.tuition_paid, 0) as tuition_paid,
        COALESCE(pm.lunch_paid, 0) as lunch_paid,
        COALESCE(pm.nap_paid, 0) as nap_paid,
        COALESCE(pm.after_school_paid, 0) as after_school_paid,
        COALESCE(pm.club_paid, 0) as club_paid,
        COALESCE(pm.other_paid, 0) as other_paid
      FROM student_fees sf
      LEFT JOIN (
        SELECT 
          s.id as student_id,
          s.class_name,
          SUM(CASE WHEN p.fee_type = 'tuition' THEN p.amount ELSE 0 END) as tuition_paid,
          SUM(CASE WHEN p.fee_type = 'lunch' THEN p.amount ELSE 0 END) as lunch_paid,
          SUM(CASE WHEN p.fee_type = 'nap' THEN p.amount ELSE 0 END) as nap_paid,
          SUM(CASE WHEN p.fee_type = 'after_school' THEN p.amount ELSE 0 END) as after_school_paid,
          SUM(CASE WHEN p.fee_type = 'club' THEN p.amount ELSE 0 END) as club_paid,
          SUM(CASE WHEN p.fee_type = 'other' THEN p.amount ELSE 0 END) as other_paid
        FROM student_fees s
        LEFT JOIN payment_records p ON s.id = p.student_id
        GROUP BY s.id, s.class_name
      ) pm ON sf.id = pm.student_id
      GROUP BY sf.class_name
      ORDER BY sf.class_name
    `).all() as Array<{
      class_name: string;
      student_count: number;
      tuition_fee: number;
      lunch_fee: number;
      nap_fee: number;
      after_school_fee: number;
      club_fee: number;
      other_fee: number;
      tuition_paid: number;
      lunch_paid: number;
      nap_paid: number;
      after_school_paid: number;
      club_paid: number;
      other_paid: number;
    }>;

    // 计算每个班级的合计
    const classStatsWithTotals = classStats.map(c => ({
      ...c,
      total_fee: c.tuition_fee + c.lunch_fee + c.nap_fee + c.after_school_fee + c.club_fee + c.other_fee,
      total_paid: c.tuition_paid + c.lunch_paid + c.nap_paid + c.after_school_paid + c.club_paid + c.other_paid,
    }));

    // 2. 每个月每个项目交费情况
    const monthlyStats = db.prepare(`
      SELECT 
        strftime('%Y-%m', payment_date) as month,
        fee_type,
        SUM(amount) as total_amount,
        COUNT(*) as payment_count
      FROM payment_records
      GROUP BY strftime('%Y-%m', payment_date), fee_type
      ORDER BY month DESC, fee_type
    `).all() as Array<{
      month: string;
      fee_type: string;
      total_amount: number;
      payment_count: number;
    }>;

    // 转换为按月份分组的格式
    const monthlyData: Record<string, {
      month: string;
      payments: Record<string, { amount: number; count: number }>;
      total: number;
    }> = {};

    monthlyStats.forEach(stat => {
      if (!monthlyData[stat.month]) {
        monthlyData[stat.month] = {
          month: stat.month,
          payments: {},
          total: 0,
        };
      }
      monthlyData[stat.month].payments[stat.fee_type] = {
        amount: stat.total_amount,
        count: stat.payment_count,
      };
      monthlyData[stat.month].total += stat.total_amount;
    });

    // 3. 全校汇总
    const schoolTotal = {
      student_count: 0,
      total_fee: 0,
      total_paid: 0,
      tuition_fee: 0,
      tuition_paid: 0,
      lunch_fee: 0,
      lunch_paid: 0,
      nap_fee: 0,
      nap_paid: 0,
      after_school_fee: 0,
      after_school_paid: 0,
      club_fee: 0,
      club_paid: 0,
      other_fee: 0,
      other_paid: 0,
    };

    classStatsWithTotals.forEach(c => {
      schoolTotal.student_count += c.student_count;
      schoolTotal.total_fee += c.total_fee;
      schoolTotal.total_paid += c.total_paid;
      schoolTotal.tuition_fee += c.tuition_fee || 0;
      schoolTotal.tuition_paid += c.tuition_paid || 0;
      schoolTotal.lunch_fee += c.lunch_fee || 0;
      schoolTotal.lunch_paid += c.lunch_paid || 0;
      schoolTotal.nap_fee += c.nap_fee || 0;
      schoolTotal.nap_paid += c.nap_paid || 0;
      schoolTotal.after_school_fee += c.after_school_fee || 0;
      schoolTotal.after_school_paid += c.after_school_paid || 0;
      schoolTotal.club_fee += c.club_fee || 0;
      schoolTotal.club_paid += c.club_paid || 0;
      schoolTotal.other_fee += c.other_fee || 0;
      schoolTotal.other_paid += c.other_paid || 0;
    });

    return NextResponse.json({
      classStats: classStatsWithTotals,
      monthlyStats: Object.values(monthlyData).sort((a, b) => b.month.localeCompare(a.month)),
      schoolTotal,
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
