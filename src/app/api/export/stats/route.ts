import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { db, initDatabase } from '@/lib/database';

// 初始化数据库
initDatabase();

// 导出统计数据的 API
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'class'; // 'class' 或 'month'

    // 获取学生数据
    const students = db.prepare(`
      SELECT 
        sf.*,
        COALESCE(SUM(pr.amount), 0) as total_paid
      FROM student_fees sf
      LEFT JOIN payment_records pr ON sf.id = pr.student_id
      GROUP BY sf.id
    `).all() as any[];

    // 获取交费记录
    const payments = db.prepare(`
      SELECT 
        pr.*,
        sf.student_name,
        sf.class_name as student_class
      FROM payment_records pr
      JOIN student_fees sf ON pr.student_id = sf.id
      ORDER BY pr.payment_date DESC
    `).all() as any[];

    // 创建工作簿
    const workbook = XLSX.utils.book_new();

    if (type === 'class') {
      // 按班级导出
      await exportByClass(workbook, students, payments);
    } else if (type === 'month') {
      // 按月导出
      await exportByMonth(workbook, students, payments);
    }

    // 生成文件名
    const filename = type === 'class' ? '班级费用统计.xlsx' : '月度费用统计.xlsx';

    // 生成 buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // 返回文件
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: '导出失败' },
      { status: 500 }
    );
  }
}

// 按班级导出
async function exportByClass(workbook: XLSX.WorkBook, students: any[], payments: any[]) {
  // 获取所有班级
  const classes = [...new Set(students.map(s => s.class_name))].sort();

  // 计算各班级统计数据
  const classStats = classes.map(className => {
    const classStudents = students.filter(s => s.class_name === className);
    const classPayments = payments.filter(p => p.student_class === className);

    // 计算各费用项目
    const tuitionFee = classStudents.reduce((sum, s) => sum + (s.tuition_fee || 0), 0);
    const tuitionPaid = classPayments
      .filter(p => p.fee_type === 'tuition')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const lunchFee = classStudents.reduce((sum, s) => sum + (s.lunch_fee || 0), 0);
    const lunchPaid = classPayments
      .filter(p => p.fee_type === 'lunch')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const napFee = classStudents.reduce((sum, s) => sum + (s.nap_fee || 0), 0);
    const napPaid = classPayments
      .filter(p => p.fee_type === 'nap')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const afterSchoolFee = classStudents.reduce((sum, s) => sum + (s.after_school_fee || 0), 0);
    const afterSchoolPaid = classPayments
      .filter(p => p.fee_type === 'after_school')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const clubFee = classStudents.reduce((sum, s) => sum + (s.club_fee || 0), 0);
    const clubPaid = classPayments
      .filter(p => p.fee_type === 'club')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const otherFee = classStudents.reduce((sum, s) => sum + (s.other_fee || 0), 0);
    const otherPaid = classPayments
      .filter(p => p.fee_type === 'other')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const totalFee = tuitionFee + lunchFee + napFee + afterSchoolFee + clubFee + otherFee;
    const totalPaid = tuitionPaid + lunchPaid + napPaid + afterSchoolPaid + clubPaid + otherPaid;

    return {
      班级: className,
      人数: classStudents.length,
      学费应交: tuitionFee,
      学费已交: tuitionPaid,
      午餐费应交: lunchFee,
      午餐费已交: lunchPaid,
      午托费应交: napFee,
      午托费已交: napPaid,
      课后服务应交: afterSchoolFee,
      课后服务已交: afterSchoolPaid,
      社团费应交: clubFee,
      社团费已交: clubPaid,
      其他应交: otherFee,
      其他已交: otherPaid,
      合计应交: totalFee,
      合计已交: totalPaid,
      待收金额: totalFee - totalPaid,
      收缴率: totalFee > 0 ? ((totalPaid / totalFee) * 100).toFixed(1) + '%' : '0%'
    };
  });

  // 添加汇总行
  const totalRow = {
    班级: '全校合计',
    人数: students.length,
    学费应交: classStats.reduce((sum, s) => sum + s.学费应交, 0),
    学费已交: classStats.reduce((sum, s) => sum + s.学费已交, 0),
    午餐费应交: classStats.reduce((sum, s) => sum + s.午餐费应交, 0),
    午餐费已交: classStats.reduce((sum, s) => sum + s.午餐费已交, 0),
    午托费应交: classStats.reduce((sum, s) => sum + s.午托费应交, 0),
    午托费已交: classStats.reduce((sum, s) => sum + s.午托费已交, 0),
    课后服务应交: classStats.reduce((sum, s) => sum + s.课后服务应交, 0),
    课后服务已交: classStats.reduce((sum, s) => sum + s.课后服务已交, 0),
    社团费应交: classStats.reduce((sum, s) => sum + s.社团费应交, 0),
    社团费已交: classStats.reduce((sum, s) => sum + s.社团费已交, 0),
    其他应交: classStats.reduce((sum, s) => sum + s.其他应交, 0),
    其他已交: classStats.reduce((sum, s) => sum + s.其他已交, 0),
    合计应交: classStats.reduce((sum, s) => sum + s.合计应交, 0),
    合计已交: classStats.reduce((sum, s) => sum + s.合计已交, 0),
    待收金额: classStats.reduce((sum, s) => sum + s.待收金额, 0),
    收缴率: (() => {
      const total = classStats.reduce((sum, s) => sum + s.合计应交, 0);
      const paid = classStats.reduce((sum, s) => sum + s.合计已交, 0);
      return total > 0 ? ((paid / total) * 100).toFixed(1) + '%' : '0%';
    })()
  };

  const sheetData = [...classStats, totalRow];

  // 创建工作表
  const ws = XLSX.utils.json_to_sheet(sheetData);

  // 设置列宽
  ws['!cols'] = [
    { wch: 12 }, // 班级
    { wch: 8 },  // 人数
    { wch: 12 }, // 学费应交
    { wch: 12 }, // 学费已交
    { wch: 12 }, // 午餐费应交
    { wch: 12 }, // 午餐费已交
    { wch: 12 }, // 午托费应交
    { wch: 12 }, // 午托费已交
    { wch: 14 }, // 课后服务应交
    { wch: 14 }, // 课后服务已交
    { wch: 12 }, // 社团费应交
    { wch: 12 }, // 社团费已交
    { wch: 12 }, // 其他应交
    { wch: 12 }, // 其他已交
    { wch: 12 }, // 合计应交
    { wch: 12 }, // 合计已交
    { wch: 12 }, // 待收金额
    { wch: 10 }, // 收缴率
  ];

  XLSX.utils.book_append_sheet(workbook, ws, '班级费用统计');
}

// 按月导出
async function exportByMonth(workbook: XLSX.WorkBook, students: any[], payments: any[]) {
  // 获取所有月份
  const months = [...new Set(
    payments.map(p => p.payment_date?.substring(0, 7)).filter(Boolean)
  )].sort();

  // 费用类型映射
  const feeTypeMap: Record<string, string> = {
    'tuition': '学费',
    'lunch': '午餐费',
    'nap': '午托费',
    'after_school': '课后服务',
    'club': '社团费',
    'other': '其他'
  };

  // 计算各月统计数据
  const monthlyStats = months.map(month => {
    const monthPayments = payments.filter(p => p.payment_date?.startsWith(month));

    const result: Record<string, any> = {
      月份: month
    };

    // 计算各费用类型的收款
    let total = 0;
    Object.keys(feeTypeMap).forEach(type => {
      const typePayments = monthPayments.filter(p => p.fee_type === type);
      const amount = typePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      result[feeTypeMap[type]] = amount;
      total += amount;
    });

    result['月度合计'] = total;
    result['交费笔数'] = monthPayments.length;

    return result;
  });

  // 添加汇总行
  const totalRow: Record<string, any> = {
    月份: '合计'
  };

  Object.keys(feeTypeMap).forEach(type => {
    totalRow[feeTypeMap[type]] = monthlyStats.reduce((sum: number, s: any) => sum + (s[feeTypeMap[type]] || 0), 0);
  });
  totalRow['月度合计'] = monthlyStats.reduce((sum: number, s: any) => sum + (s['月度合计'] || 0), 0);
  totalRow['交费笔数'] = monthlyStats.reduce((sum: number, s: any) => sum + (s['交费笔数'] || 0), 0);

  const sheetData = [...monthlyStats, totalRow];

  // 创建工作表
  const ws = XLSX.utils.json_to_sheet(sheetData);

  // 设置列宽
  ws['!cols'] = [
    { wch: 12 }, // 月份
    { wch: 12 }, // 学费
    { wch: 12 }, // 午餐费
    { wch: 12 }, // 午托费
    { wch: 12 }, // 课后服务
    { wch: 12 }, // 社团费
    { wch: 12 }, // 其他
    { wch: 12 }, // 月度合计
    { wch: 10 }, // 交费笔数
  ];

  XLSX.utils.book_append_sheet(workbook, ws, '月度费用统计');

  // 添加详细交费记录
  const detailData = payments.map(p => ({
    日期: p.payment_date,
    班级: p.student_class,
    学生姓名: p.student_name,
    费用类型: feeTypeMap[p.fee_type] || p.fee_type,
    金额: p.amount,
    备注: p.remarks || ''
  }));

  const detailWs = XLSX.utils.json_to_sheet(detailData);

  detailWs['!cols'] = [
    { wch: 12 }, // 日期
    { wch: 10 }, // 班级
    { wch: 12 }, // 学生姓名
    { wch: 12 }, // 费用类型
    { wch: 10 }, // 金额
    { wch: 20 }, // 备注
  ];

  XLSX.utils.book_append_sheet(workbook, detailWs, '交费明细');
}
