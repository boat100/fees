import { NextResponse } from 'next/server';
import { db, initDatabase } from '@/lib/database';

// 初始化数据库
initDatabase();

// GET - 获取统计数据
export async function GET() {
  try {
    // 1. 全校汇总（包含性别、走读/午托统计）
    const schoolSummaryData = db.prepare(`
      SELECT 
        COUNT(*) as student_count,
        SUM(CASE WHEN gender = '男' THEN 1 ELSE 0 END) as male_count,
        SUM(CASE WHEN gender = '女' THEN 1 ELSE 0 END) as female_count,
        SUM(CASE WHEN lunch_fee > 0 OR nap_fee > 0 THEN 1 ELSE 0 END) as nap_count,
        SUM(CASE WHEN lunch_fee = 0 AND nap_fee = 0 THEN 1 ELSE 0 END) as day_student_count,
        SUM(tuition_fee) as tuition_fee,
        SUM(lunch_fee) as lunch_fee,
        SUM(nap_fee) as nap_fee,
        SUM(after_school_fee) as after_school_fee,
        SUM(club_fee) as club_fee,
        SUM(agency_fee) as agency_fee,
        SUM(agency_paid) as agency_paid
      FROM student_fees
    `).get() as {
      student_count: number;
      male_count: number;
      female_count: number;
      nap_count: number;
      day_student_count: number;
      tuition_fee: number;
      lunch_fee: number;
      nap_fee: number;
      after_school_fee: number;
      club_fee: number;
      agency_fee: number;
      agency_paid: number;
    };

    // 获取所有缴费记录的已交金额
    const paymentTotals = db.prepare(`
      SELECT 
        fee_type,
        SUM(amount) as total_paid
      FROM payment_records
      GROUP BY fee_type
    `).all() as Array<{ fee_type: string; total_paid: number }>;

    const paymentMap: Record<string, number> = {};
    paymentTotals.forEach(p => {
      paymentMap[p.fee_type] = p.total_paid;
    });

    // 计算全校汇总
    const totalFee = (schoolSummaryData.tuition_fee || 0) + 
                     (schoolSummaryData.lunch_fee || 0) + 
                     (schoolSummaryData.nap_fee || 0) + 
                     (schoolSummaryData.after_school_fee || 0) + 
                     (schoolSummaryData.club_fee || 0) + 
                     (schoolSummaryData.agency_fee || 0);
    
    const totalPaid = (paymentMap['tuition'] || 0) + 
                      (paymentMap['lunch'] || 0) + 
                      (paymentMap['nap'] || 0) + 
                      (paymentMap['after_school'] || 0) + 
                      (paymentMap['club'] || 0) + 
                      (schoolSummaryData.agency_paid || 0);
    
    const schoolSummary = {
      student_count: schoolSummaryData.student_count || 0,
      male_count: schoolSummaryData.male_count || 0,
      female_count: schoolSummaryData.female_count || 0,
      nap_count: schoolSummaryData.nap_count || 0,
      day_student_count: schoolSummaryData.day_student_count || 0,
      total_fee: totalFee,
      total_paid: totalPaid,
      pending_amount: totalFee - totalPaid,
      collection_rate: totalFee > 0 ? ((totalPaid / totalFee) * 100).toFixed(1) + '%' : '0%',
    };

    // 2. 全校各班级交费情况
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
        SUM(sf.agency_paid) as agency_paid,
        COALESCE(SUM(pm.tuition_paid), 0) as tuition_paid,
        COALESCE(SUM(pm.lunch_paid), 0) as lunch_paid,
        COALESCE(SUM(pm.nap_paid), 0) as nap_paid,
        COALESCE(SUM(pm.after_school_paid), 0) as after_school_paid,
        COALESCE(SUM(pm.club_paid), 0) as club_paid
      FROM student_fees sf
      LEFT JOIN (
        SELECT 
          s.id as student_id,
          SUM(CASE WHEN p.fee_type = 'tuition' THEN p.amount ELSE 0 END) as tuition_paid,
          SUM(CASE WHEN p.fee_type = 'lunch' THEN p.amount ELSE 0 END) as lunch_paid,
          SUM(CASE WHEN p.fee_type = 'nap' THEN p.amount ELSE 0 END) as nap_paid,
          SUM(CASE WHEN p.fee_type = 'after_school' THEN p.amount ELSE 0 END) as after_school_paid,
          SUM(CASE WHEN p.fee_type = 'club' THEN p.amount ELSE 0 END) as club_paid
        FROM student_fees s
        LEFT JOIN payment_records p ON s.id = p.student_id
        GROUP BY s.id
      ) pm ON sf.id = pm.student_id
      GROUP BY sf.class_name
    `).all() as Array<{
      class_name: string;
      student_count: number;
      tuition_fee: number;
      lunch_fee: number;
      nap_fee: number;
      after_school_fee: number;
      club_fee: number;
      agency_fee: number;
      agency_paid: number;
      tuition_paid: number;
      lunch_paid: number;
      nap_paid: number;
      after_school_paid: number;
      club_paid: number;
    }>;

    // 计算每个班级的合计
    const classStatsWithTotals = classStats.map(c => {
      const totalFee = (c.tuition_fee || 0) + (c.lunch_fee || 0) + (c.nap_fee || 0) + 
                       (c.after_school_fee || 0) + (c.club_fee || 0) + (c.agency_fee || 0);
      const totalPaid = (c.tuition_paid || 0) + (c.lunch_paid || 0) + (c.nap_paid || 0) + 
                       (c.after_school_paid || 0) + (c.club_paid || 0) + (c.agency_paid || 0);
      return {
        ...c,
        total_fee: totalFee,
        total_paid: totalPaid,
        pending_amount: totalFee - totalPaid,
        collection_rate: totalFee > 0 ? ((totalPaid / totalFee) * 100).toFixed(1) + '%' : '0%',
      };
    });

    // 按年级从低到高排序（一年 -> 二年 -> 三年...，班级号升序）
    const gradeOrder: Record<string, number> = {
      '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6,
      '七': 7, '八': 8, '九': 9, '十': 10,
      '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
      '7': 7, '8': 8, '9': 9, '10': 10
    };

    // 解析班级名称，提取年级和班级号
    const parseClassName = (className: string) => {
      // 匹配格式如: "一年1班"、"二年2班"、"三年1班" 等
      const match = className.match(/^(.+?)(\d+)班$/);
      if (match) {
        const gradePart = match[1]; // "一年"、"二年" 等
        const classNum = parseInt(match[2], 10); // 班级号
        
        // 从年级部分提取年级数字（取最后一个字符）
        const gradeChar = gradePart.slice(-1); // "年"前面的字符
        const gradeNum = gradeOrder[gradeChar] || 99;
        
        return { gradeNum, classNum };
      }
      return { gradeNum: 99, classNum: 99 }; // 无法解析的放最后
    };

    // 排序班级统计
    classStatsWithTotals.sort((a, b) => {
      const parsedA = parseClassName(a.class_name);
      const parsedB = parseClassName(b.class_name);
      
      if (parsedA.gradeNum !== parsedB.gradeNum) {
        return parsedA.gradeNum - parsedB.gradeNum; // 年级升序
      }
      return parsedA.classNum - parsedB.classNum; // 班级号升序
    });

    // 3. 各项目参与人数（全校）
    const projectStats = db.prepare(`
      SELECT 
        COUNT(*) as total_students,
        SUM(CASE WHEN tuition_fee > 0 THEN 1 ELSE 0 END) as tuition_count,
        SUM(CASE WHEN lunch_fee > 0 THEN 1 ELSE 0 END) as lunch_count,
        SUM(CASE WHEN nap_fee > 0 THEN 1 ELSE 0 END) as nap_count,
        SUM(CASE WHEN after_school_fee > 0 THEN 1 ELSE 0 END) as after_school_count,
        SUM(CASE WHEN club_fee > 0 THEN 1 ELSE 0 END) as club_count,
        SUM(CASE WHEN agency_fee > 0 THEN 1 ELSE 0 END) as agency_count
      FROM student_fees
    `).get() as {
      total_students: number;
      tuition_count: number;
      lunch_count: number;
      nap_count: number;
      after_school_count: number;
      club_count: number;
      agency_count: number;
    };

    // 4. 月度各班级缴费统计
    // 先获取所有可用月份
    const availableMonths = db.prepare(`
      SELECT DISTINCT 
        CASE 
          WHEN payment_date LIKE '%/%' THEN 
            strftime('%Y-%m', date(payment_date))
          ELSE 
            strftime('%Y-%m', payment_date)
        END as month
      FROM payment_records
      WHERE payment_date IS NOT NULL AND payment_date != ''
      ORDER BY month DESC
    `).all() as Array<{ month: string }>;

    // 获取月度各班级缴费统计
    const monthlyClassStats = db.prepare(`
      SELECT 
        CASE 
          WHEN pr.payment_date LIKE '%/%' THEN 
            strftime('%Y-%m', date(pr.payment_date))
          ELSE 
            strftime('%Y-%m', pr.payment_date)
        END as month,
        sf.class_name,
        pr.fee_type,
        SUM(pr.amount) as total_amount,
        COUNT(*) as payment_count
      FROM payment_records pr
      JOIN student_fees sf ON pr.student_id = sf.id
      WHERE pr.payment_date IS NOT NULL AND pr.payment_date != ''
      GROUP BY month, sf.class_name, pr.fee_type
      HAVING month IS NOT NULL
      ORDER BY month DESC, sf.class_name, pr.fee_type
    `).all() as Array<{
      month: string;
      class_name: string;
      fee_type: string;
      total_amount: number;
      payment_count: number;
    }>;

    // 转换为按月份->班级分组的格式
    const monthlyClassData: Record<string, Record<string, {
      class_name: string;
      payments: Record<string, { amount: number; count: number }>;
      total: number;
    }>> = {};

    monthlyClassStats.forEach(stat => {
      if (!monthlyClassData[stat.month]) {
        monthlyClassData[stat.month] = {};
      }
      if (!monthlyClassData[stat.month][stat.class_name]) {
        monthlyClassData[stat.month][stat.class_name] = {
          class_name: stat.class_name,
          payments: {},
          total: 0,
        };
      }
      monthlyClassData[stat.month][stat.class_name].payments[stat.fee_type] = {
        amount: stat.total_amount,
        count: stat.payment_count,
      };
      monthlyClassData[stat.month][stat.class_name].total += stat.total_amount;
    });

    // 费用类型映射
    const feeTypeMap: Record<string, string> = {
      'tuition': '学费',
      'lunch': '午餐费',
      'nap': '午托费',
      'after_school': '课后服务',
      'club': '社团费',
      'agency': '代办费',
    };

    return NextResponse.json({
      schoolSummary,
      classStats: classStatsWithTotals,
      projectStats: {
        total_students: projectStats.total_students || 0,
        tuition: projectStats.tuition_count || 0,
        lunch: projectStats.lunch_count || 0,
        nap: projectStats.nap_count || 0,
        after_school: projectStats.after_school_count || 0,
        club: projectStats.club_count || 0,
        agency: projectStats.agency_count || 0,
      },
      monthlyStats: {
        availableMonths: availableMonths.map(m => m.month),
        classStats: monthlyClassData,
      },
      feeTypeMap,
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
