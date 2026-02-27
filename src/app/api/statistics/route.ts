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
        SUM(sf.agency_fee) as agency_fee,
        COALESCE(pm.tuition_paid, 0) as tuition_paid,
        COALESCE(pm.lunch_paid, 0) as lunch_paid,
        COALESCE(pm.nap_paid, 0) as nap_paid,
        COALESCE(pm.after_school_paid, 0) as after_school_paid,
        COALESCE(pm.club_paid, 0) as club_paid
      FROM student_fees sf
      LEFT JOIN (
        SELECT 
          s.id as student_id,
          s.class_name,
          SUM(CASE WHEN p.fee_type = 'tuition' THEN p.amount ELSE 0 END) as tuition_paid,
          SUM(CASE WHEN p.fee_type = 'lunch' THEN p.amount ELSE 0 END) as lunch_paid,
          SUM(CASE WHEN p.fee_type = 'nap' THEN p.amount ELSE 0 END) as nap_paid,
          SUM(CASE WHEN p.fee_type = 'after_school' THEN p.amount ELSE 0 END) as after_school_paid,
          SUM(CASE WHEN p.fee_type = 'club' THEN p.amount ELSE 0 END) as club_paid
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
      agency_fee: number;
      tuition_paid: number;
      lunch_paid: number;
      nap_paid: number;
      after_school_paid: number;
      club_paid: number;
    }>;

    // 计算每个班级的合计（代办费视为已收）
    const classStatsWithTotals = classStats.map(c => ({
      ...c,
      total_fee: c.tuition_fee + c.lunch_fee + c.nap_fee + c.after_school_fee + c.club_fee + c.agency_fee,
      total_paid: c.tuition_paid + c.lunch_paid + c.nap_paid + c.after_school_paid + c.club_paid + c.agency_fee,
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
      agency_fee: 0,
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
      schoolTotal.agency_fee += c.agency_fee || 0;
    });

    // 4. 各费用项目缴费完成人数统计
    // 获取每个学生每个费用项目的应交和已交金额
    const studentPayments = db.prepare(`
      SELECT 
        sf.id,
        sf.tuition_fee,
        sf.lunch_fee,
        sf.nap_fee,
        sf.after_school_fee,
        sf.club_fee,
        sf.agency_fee,
        COALESCE(pm.tuition_paid, 0) as tuition_paid,
        COALESCE(pm.lunch_paid, 0) as lunch_paid,
        COALESCE(pm.nap_paid, 0) as nap_paid,
        COALESCE(pm.after_school_paid, 0) as after_school_paid,
        COALESCE(pm.club_paid, 0) as club_paid
      FROM student_fees sf
      LEFT JOIN (
        SELECT 
          student_id,
          SUM(CASE WHEN fee_type = 'tuition' THEN amount ELSE 0 END) as tuition_paid,
          SUM(CASE WHEN fee_type = 'lunch' THEN amount ELSE 0 END) as lunch_paid,
          SUM(CASE WHEN fee_type = 'nap' THEN amount ELSE 0 END) as nap_paid,
          SUM(CASE WHEN fee_type = 'after_school' THEN amount ELSE 0 END) as after_school_paid,
          SUM(CASE WHEN fee_type = 'club' THEN amount ELSE 0 END) as club_paid
        FROM payment_records
        GROUP BY student_id
      ) pm ON sf.id = pm.student_id
    `).all() as Array<{
      id: number;
      tuition_fee: number;
      lunch_fee: number;
      nap_fee: number;
      after_school_fee: number;
      club_fee: number;
      agency_fee: number;
      tuition_paid: number;
      lunch_paid: number;
      nap_paid: number;
      after_school_paid: number;
      club_paid: number;
    }>;

    // 计算各费用项目的完成人数（代办费不需要完成统计，因为是一次性收齐）
    const completionStats = {
      tuition: { total: 0, completed: 0 },      // 学费
      lunch: { total: 0, completed: 0 },        // 午餐费
      nap: { total: 0, completed: 0 },          // 午托费
      after_school: { total: 0, completed: 0 }, // 课后服务
      club: { total: 0, completed: 0 },         // 社团费
      agency: { total: 0, completed: 0 },       // 代办费（一次性收齐，全部完成）
    };

    studentPayments.forEach(s => {
      // 学费
      if (s.tuition_fee > 0) {
        completionStats.tuition.total++;
        if (s.tuition_paid >= s.tuition_fee) completionStats.tuition.completed++;
      }
      // 午餐费
      if (s.lunch_fee > 0) {
        completionStats.lunch.total++;
        if (s.lunch_paid >= s.lunch_fee) completionStats.lunch.completed++;
      }
      // 午托费
      if (s.nap_fee > 0) {
        completionStats.nap.total++;
        if (s.nap_paid >= s.nap_fee) completionStats.nap.completed++;
      }
      // 课后服务
      if (s.after_school_fee > 0) {
        completionStats.after_school.total++;
        if (s.after_school_paid >= s.after_school_fee) completionStats.after_school.completed++;
      }
      // 社团费
      if (s.club_fee > 0) {
        completionStats.club.total++;
        if (s.club_paid >= s.club_fee) completionStats.club.completed++;
      }
      // 代办费（一次性收齐，全部完成）
      if (s.agency_fee > 0) {
        completionStats.agency.total++;
        completionStats.agency.completed++; // 代办费一次性收齐，视为完成
      }
    });

    // 5. 各班级各项目参与人数统计
    const classProjectStats = db.prepare(`
      SELECT 
        class_name,
        COUNT(*) as total_students,
        SUM(CASE WHEN tuition_fee > 0 THEN 1 ELSE 0 END) as tuition_count,
        SUM(CASE WHEN lunch_fee > 0 THEN 1 ELSE 0 END) as lunch_count,
        SUM(CASE WHEN nap_fee > 0 THEN 1 ELSE 0 END) as nap_count,
        SUM(CASE WHEN after_school_fee > 0 THEN 1 ELSE 0 END) as after_school_count,
        SUM(CASE WHEN club_fee > 0 THEN 1 ELSE 0 END) as club_count,
        SUM(CASE WHEN agency_fee > 0 THEN 1 ELSE 0 END) as agency_count
      FROM student_fees
      GROUP BY class_name
      ORDER BY class_name
    `).all() as Array<{
      class_name: string;
      total_students: number;
      tuition_count: number;
      lunch_count: number;
      nap_count: number;
      after_school_count: number;
      club_count: number;
      agency_count: number;
    }>;

    // 6. 全校各项目参与人数统计
    const schoolProjectStats = {
      total_students: 0,
      tuition: 0,
      lunch: 0,
      nap: 0,
      after_school: 0,
      club: 0,
      agency: 0,
    };

    classProjectStats.forEach(c => {
      schoolProjectStats.total_students += c.total_students;
      schoolProjectStats.tuition += c.tuition_count;
      schoolProjectStats.lunch += c.lunch_count;
      schoolProjectStats.nap += c.nap_count;
      schoolProjectStats.after_school += c.after_school_count;
      schoolProjectStats.club += c.club_count;
      schoolProjectStats.agency += c.agency_count;
    });

    return NextResponse.json({
      classStats: classStatsWithTotals,
      monthlyStats: Object.values(monthlyData),
      schoolTotal,
      completionStats,
      classProjectStats,
      schoolProjectStats,
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
