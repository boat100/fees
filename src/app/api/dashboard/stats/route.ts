import { NextResponse } from 'next/server';
import { db, initDatabase } from '@/lib/database';
import { isAuthenticated } from '@/lib/auth';

// 初始化数据库
initDatabase();

// GET - 获取首页统计数据
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    // 1. 获取收费统计（应交总收费、已交总收费）
    const feeStats = db.prepare(`
      SELECT 
        COALESCE(SUM(tuition_fee), 0) as tuition_fee,
        COALESCE(SUM(tuition_paid), 0) as tuition_paid,
        COALESCE(SUM(lunch_fee), 0) as lunch_fee,
        COALESCE(SUM(lunch_paid), 0) as lunch_paid,
        COALESCE(SUM(nap_fee), 0) as nap_fee,
        COALESCE(SUM(nap_paid), 0) as nap_paid,
        COALESCE(SUM(after_school_fee), 0) as after_school_fee,
        COALESCE(SUM(after_school_paid), 0) as after_school_paid,
        COALESCE(SUM(club_fee), 0) as club_fee,
        COALESCE(SUM(club_paid), 0) as club_paid,
        COALESCE(SUM(agency_fee), 0) as agency_fee,
        COALESCE(SUM(agency_paid), 0) as agency_paid,
        COUNT(*) as student_count
      FROM student_fees
    `).get() as {
      tuition_fee: number;
      tuition_paid: number;
      lunch_fee: number;
      lunch_paid: number;
      nap_fee: number;
      nap_paid: number;
      after_school_fee: number;
      after_school_paid: number;
      club_fee: number;
      club_paid: number;
      agency_fee: number;
      agency_paid: number;
      student_count: number;
    };

    // 计算总应交和总已交
    const totalFee = 
      (feeStats.tuition_fee || 0) + 
      (feeStats.lunch_fee || 0) + 
      (feeStats.nap_fee || 0) + 
      (feeStats.after_school_fee || 0) + 
      (feeStats.club_fee || 0) + 
      (feeStats.agency_fee || 0);

    const totalPaid = 
      (feeStats.tuition_paid || 0) + 
      (feeStats.lunch_paid || 0) + 
      (feeStats.nap_paid || 0) + 
      (feeStats.after_school_paid || 0) + 
      (feeStats.club_paid || 0) + 
      (feeStats.agency_paid || 0);

    // 2. 获取支出统计
    const expenseStats = db.prepare(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_amount,
        COUNT(*) as record_count
      FROM expense_records
    `).get() as {
      total_amount: number;
      record_count: number;
    };

    // 3. 获取班级数量
    const classCount = db.prepare(`
      SELECT COUNT(DISTINCT class_name) as count FROM student_fees
    `).get() as { count: number };

    return NextResponse.json({
      success: true,
      data: {
        // 收费统计
        totalFee,
        totalPaid,
        totalUnpaid: totalFee - totalPaid,
        studentCount: feeStats.student_count || 0,
        classCount: classCount.count || 0,
        
        // 支出统计
        totalExpense: expenseStats.total_amount || 0,
        expenseRecordCount: expenseStats.record_count || 0,
        
        // 收费明细（用于图表）
        feeBreakdown: {
          tuition: { fee: feeStats.tuition_fee || 0, paid: feeStats.tuition_paid || 0 },
          lunch: { fee: feeStats.lunch_fee || 0, paid: feeStats.lunch_paid || 0 },
          nap: { fee: feeStats.nap_fee || 0, paid: feeStats.nap_paid || 0 },
          afterSchool: { fee: feeStats.after_school_fee || 0, paid: feeStats.after_school_paid || 0 },
          club: { fee: feeStats.club_fee || 0, paid: feeStats.club_paid || 0 },
          agency: { fee: feeStats.agency_fee || 0, paid: feeStats.agency_paid || 0 },
        }
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: '获取统计数据失败' }, { status: 500 });
  }
}
