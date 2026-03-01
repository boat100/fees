import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { db, initDatabase } from '@/lib/database';

// 初始化数据库
initDatabase();

// 学生数据类型
interface StudentData {
  id: number;
  class_name: string;
  student_name: string;
  gender: string;
  tuition_fee: number;
  lunch_fee: number;
  nap_fee: number;
  after_school_fee: number;
  club_fee: number;
  agency_fee: number;
  agency_paid: number;
  total_paid: number;
  [key: string]: number | string;
}

// 交费记录类型
interface PaymentData {
  id: number;
  student_id: number;
  fee_type: string;
  amount: number;
  payment_date: string;
  student_name: string;
  student_class: string;
  remarks?: string;
}

// 费用类型映射
const feeTypeMap: Record<string, string> = {
  'tuition': '学费',
  'lunch': '午餐费',
  'nap': '午托费',
  'after_school': '课后服务',
  'club': '社团费',
  'agency': '代办费'
};

// 导出统计数据的 API
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'class';
    const className = searchParams.get('class_name'); // 用于导出单个班级数据

    // 获取学生数据
    const students = db.prepare(`
      SELECT 
        sf.*,
        COALESCE(SUM(pr.amount), 0) as total_paid
      FROM student_fees sf
      LEFT JOIN payment_records pr ON sf.id = pr.student_id
      GROUP BY sf.id
      ORDER BY sf.class_name, sf.student_name
    `).all() as StudentData[];

    // 获取交费记录
    const payments = db.prepare(`
      SELECT 
        pr.*,
        sf.student_name,
        sf.class_name as student_class
      FROM payment_records pr
      JOIN student_fees sf ON pr.student_id = sf.id
      ORDER BY pr.payment_date DESC
    `).all() as PaymentData[];

    // 创建工作簿
    const workbook = XLSX.utils.book_new();

    switch (type) {
      case 'school_summary':
        await exportSchoolSummary(workbook, students, payments);
        break;
      case 'completion_stats':
        await exportCompletionStats(workbook, students, payments);
        break;
      case 'project_stats':
        await exportProjectStats(workbook, students);
        break;
      case 'class_project_stats':
        await exportClassProjectStats(workbook, students);
        break;
      case 'class_detail':
        if (!className) {
          return NextResponse.json({ error: '缺少班级参数' }, { status: 400 });
        }
        await exportClassDetail(workbook, students, payments, className);
        break;
      case 'class_payment_records':
        if (!className) {
          return NextResponse.json({ error: '缺少班级参数' }, { status: 400 });
        }
        await exportClassPaymentRecords(workbook, payments, className);
        break;
      case 'agency_fee_detail':
        if (!className) {
          return NextResponse.json({ error: '缺少班级参数' }, { status: 400 });
        }
        await exportAgencyFeeDetail(workbook, className);
        break;
      case 'month':
        await exportByMonth(workbook, students, payments);
        break;
      case 'class':
      default:
        await exportByClass(workbook, students, payments);
        break;
    }

    // 生成文件名
    const filenameMap: Record<string, string> = {
      'school_summary': '全校汇总统计.xlsx',
      'completion_stats': '缴费完成人数统计.xlsx',
      'project_stats': '全校项目参与人数.xlsx',
      'class_project_stats': '班级项目参与人数.xlsx',
      'class_detail': `${className}班级费用明细.xlsx`,
      'class_payment_records': `${className}班级缴费记录.xlsx`,
      'agency_fee_detail': `${className}代办费明细.xlsx`,
      'month': '月度费用统计.xlsx',
      'class': '班级费用统计.xlsx'
    };
    const filename = filenameMap[type] || '统计数据.xlsx';

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

// 导出全校汇总
async function exportSchoolSummary(workbook: XLSX.WorkBook, students: StudentData[], payments: PaymentData[]) {
  // 计算全校汇总数据
  const totalStudents = students.length;
  const totalFee = students.reduce((sum, s) => {
    return sum + (s.tuition_fee || 0) + (s.lunch_fee || 0) + (s.nap_fee || 0) +
           (s.after_school_fee || 0) + (s.club_fee || 0) + (s.agency_fee || 0);
  }, 0);
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // 各费用项目统计
  const feeItems = ['tuition', 'lunch', 'nap', 'after_school', 'club', 'other'];
  const feeStats = feeItems.map(item => {
    const fee = students.reduce((sum, s) => sum + (Number(s[`${item}_fee`]) || 0), 0);
    const paid = payments
      .filter(p => p.fee_type === item)
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    return {
      项目: feeTypeMap[item],
      应交金额: fee,
      已交金额: paid,
      待收金额: fee - paid,
      收缴率: fee > 0 ? ((paid / fee) * 100).toFixed(1) + '%' : '0%'
    };
  });

  // 创建汇总表
  const summaryData = [
    { 项目: '学生总数', 数值: totalStudents, 单位: '人' },
    { 项目: '应交总额', 数值: totalFee, 单位: '元' },
    { 项目: '已收总额', 数值: totalPaid, 单位: '元' },
    { 项目: '待收总额', 数值: totalFee - totalPaid, 单位: '元' },
    { 项目: '总体收缴率', 数值: totalFee > 0 ? ((totalPaid / totalFee) * 100).toFixed(1) + '%' : '0%', 单位: '' },
  ];

  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summaryWs, '全校汇总');

  // 创建各项目明细表
  const itemWs = XLSX.utils.json_to_sheet(feeStats);
  XLSX.utils.book_append_sheet(workbook, itemWs, '各费用项目明细');
}

// 导出缴费完成人数统计
async function exportCompletionStats(workbook: XLSX.WorkBook, students: StudentData[], payments: PaymentData[]) {
  const feeItems = ['tuition', 'lunch', 'nap', 'after_school', 'club', 'other'];
  
  const stats = feeItems.map(item => {
    // 应交人数（费用 > 0 的学生数）
    const totalStudents = students.filter(s => (Number(s[`${item}_fee`]) || 0) > 0).length;
    
    // 已完成人数（已交金额 >= 应交金额的学生数）
    const completedStudents = students.filter(s => {
      const fee = Number(s[`${item}_fee`]) || 0;
      if (fee === 0) return false;
      const paid = payments
        .filter(p => p.student_id === s.id && p.fee_type === item)
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      return paid >= fee;
    }).length;

    const percentage = totalStudents > 0 ? ((completedStudents / totalStudents) * 100).toFixed(1) : '0';

    return {
      费用项目: feeTypeMap[item],
      应交人数: totalStudents,
      已完成人数: completedStudents,
      未完成人数: totalStudents - completedStudents,
      完成率: percentage + '%'
    };
  });

  const ws = XLSX.utils.json_to_sheet(stats);
  ws['!cols'] = [
    { wch: 12 }, // 费用项目
    { wch: 12 }, // 应交人数
    { wch: 14 }, // 已完成人数
    { wch: 14 }, // 未完成人数
    { wch: 10 }, // 完成率
  ];
  XLSX.utils.book_append_sheet(workbook, ws, '缴费完成人数统计');
}

// 导出全校项目参与人数统计
async function exportProjectStats(workbook: XLSX.WorkBook, students: StudentData[]) {
  const totalStudents = students.length;
  
  const stats = [
    { 项目: '学生总数', 参与人数: totalStudents },
    { 项目: '学费', 参与人数: students.filter(s => (s.tuition_fee || 0) > 0).length },
    { 项目: '午餐费', 参与人数: students.filter(s => (s.lunch_fee || 0) > 0).length },
    { 项目: '午托费', 参与人数: students.filter(s => (s.nap_fee || 0) > 0).length },
    { 项目: '课后服务', 参与人数: students.filter(s => (s.after_school_fee || 0) > 0).length },
    { 项目: '社团费', 参与人数: students.filter(s => (s.club_fee || 0) > 0).length },
    { 项目: '代办费', 参与人数: students.filter(s => (s.agency_fee || 0) > 0).length },
  ];

  const ws = XLSX.utils.json_to_sheet(stats);
  ws['!cols'] = [
    { wch: 12 }, // 项目
    { wch: 12 }, // 参与人数
  ];
  XLSX.utils.book_append_sheet(workbook, ws, '全校项目参与人数');
}

// 导出班级项目参与人数统计
async function exportClassProjectStats(workbook: XLSX.WorkBook, students: StudentData[]) {
  const classes = [...new Set(students.map(s => s.class_name))].sort();

  const stats = classes.map(className => {
    const classStudents = students.filter(s => s.class_name === className);
    return {
      班级: className,
      学生数: classStudents.length,
      学费: classStudents.filter(s => (s.tuition_fee || 0) > 0).length,
      午餐费: classStudents.filter(s => (s.lunch_fee || 0) > 0).length,
      午托费: classStudents.filter(s => (s.nap_fee || 0) > 0).length,
      课后服务: classStudents.filter(s => (s.after_school_fee || 0) > 0).length,
      社团费: classStudents.filter(s => (s.club_fee || 0) > 0).length,
      代办费: classStudents.filter(s => (s.agency_fee || 0) > 0).length,
    };
  });

  // 添加合计行
  const totalRow = {
    班级: '全校合计',
    学生数: students.length,
    学费: students.filter(s => (s.tuition_fee || 0) > 0).length,
    午餐费: students.filter(s => (s.lunch_fee || 0) > 0).length,
    午托费: students.filter(s => (s.nap_fee || 0) > 0).length,
    课后服务: students.filter(s => (s.after_school_fee || 0) > 0).length,
    社团费: students.filter(s => (s.club_fee || 0) > 0).length,
    代办费: students.filter(s => (s.agency_fee || 0) > 0).length,
  };

  const sheetData = [...stats, totalRow];

  const ws = XLSX.utils.json_to_sheet(sheetData);
  ws['!cols'] = [
    { wch: 12 }, // 班级
    { wch: 10 }, // 学生数
    { wch: 8 },  // 学费
    { wch: 10 }, // 午餐费
    { wch: 10 }, // 午托费
    { wch: 12 }, // 课后服务
    { wch: 10 }, // 社团费
    { wch: 8 },  // 代办费
  ];
  XLSX.utils.book_append_sheet(workbook, ws, '班级项目参与人数');
}

// 导出单个班级详细数据
async function exportClassDetail(workbook: XLSX.WorkBook, students: StudentData[], payments: PaymentData[], className: string) {
  const classStudents = students.filter(s => s.class_name === className);
  const classPayments = payments.filter(p => p.student_class === className);

  // 学生费用明细
  const studentDetails = classStudents.map(s => {
    const studentPayments = classPayments.filter(p => p.student_id === s.id);
    
    const paidByType: Record<string, number> = {};
    ['tuition', 'lunch', 'nap', 'after_school', 'club'].forEach(type => {
      paidByType[type] = studentPayments
        .filter(p => p.fee_type === type)
        .reduce((sum, p) => sum + (p.amount || 0), 0);
    });
    
    // 代办费已交金额：优先使用 agency_paid 字段（从 student_fees 表获取）
    // 也可以从 payment_records 计算：paidByType['agency'] = studentPayments.filter(p => p.fee_type === 'agency').reduce(...)
    const agencyPaid = s.agency_paid ?? s.agency_fee ?? 0;

    const totalFee = (s.tuition_fee || 0) + (s.lunch_fee || 0) + (s.nap_fee || 0) +
                     (s.after_school_fee || 0) + (s.club_fee || 0) + (s.agency_fee || 0);
    const totalPaid = Object.values(paidByType).reduce((a, b) => a + b, 0) + agencyPaid;

    return {
      班级: className,
      学生姓名: s.student_name,
      性别: s.gender || '未设置',
      学费应交: s.tuition_fee || 0,
      学费已交: paidByType['tuition'],
      午餐费应交: s.lunch_fee || 0,
      午餐费已交: paidByType['lunch'],
      午托费应交: s.nap_fee || 0,
      午托费已交: paidByType['nap'],
      课后服务应交: s.after_school_fee || 0,
      课后服务已交: paidByType['after_school'],
      社团费应交: s.club_fee || 0,
      社团费已交: paidByType['club'],
      代办费应交: s.agency_fee || 0,
      代办费已交: agencyPaid,
      合计应交: totalFee,
      合计已交: totalPaid,
      待收金额: totalFee - totalPaid,
      收缴率: totalFee > 0 ? ((totalPaid / totalFee) * 100).toFixed(1) + '%' : '0%'
    };
  });

  // 添加汇总行
  const totalRow = {
    班级: '合计',
    学生姓名: '',
    性别: '',
    学费应交: classStudents.reduce((sum, s) => sum + (s.tuition_fee || 0), 0),
    学费已交: studentDetails.reduce((sum, s) => sum + s.学费已交, 0),
    午餐费应交: classStudents.reduce((sum, s) => sum + (s.lunch_fee || 0), 0),
    午餐费已交: studentDetails.reduce((sum, s) => sum + s.午餐费已交, 0),
    午托费应交: classStudents.reduce((sum, s) => sum + (s.nap_fee || 0), 0),
    午托费已交: studentDetails.reduce((sum, s) => sum + s.午托费已交, 0),
    课后服务应交: classStudents.reduce((sum, s) => sum + (s.after_school_fee || 0), 0),
    课后服务已交: studentDetails.reduce((sum, s) => sum + s.课后服务已交, 0),
    社团费应交: classStudents.reduce((sum, s) => sum + (s.club_fee || 0), 0),
    社团费已交: studentDetails.reduce((sum, s) => sum + s.社团费已交, 0),
    代办费应交: classStudents.reduce((sum, s) => sum + (s.agency_fee || 0), 0),
    代办费已交: studentDetails.reduce((sum, s) => sum + s.代办费已交, 0),
    合计应交: studentDetails.reduce((sum, s) => sum + s.合计应交, 0),
    合计已交: studentDetails.reduce((sum, s) => sum + s.合计已交, 0),
    待收金额: studentDetails.reduce((sum, s) => sum + s.待收金额, 0),
    收缴率: (() => {
      const total = studentDetails.reduce((sum, s) => sum + s.合计应交, 0);
      const paid = studentDetails.reduce((sum, s) => sum + s.合计已交, 0);
      return total > 0 ? ((paid / total) * 100).toFixed(1) + '%' : '0%';
    })()
  };

  const sheetData = [...studentDetails, totalRow];

  const ws = XLSX.utils.json_to_sheet(sheetData);
  ws['!cols'] = [
    { wch: 10 }, // 班级
    { wch: 12 }, // 学生姓名
    { wch: 8 },  // 性别
    { wch: 10 }, { wch: 10 }, // 学费
    { wch: 10 }, { wch: 10 }, // 午餐费
    { wch: 10 }, { wch: 10 }, // 午托费
    { wch: 12 }, { wch: 12 }, // 课后服务
    { wch: 10 }, { wch: 10 }, // 社团费
    { wch: 10 }, { wch: 10 }, // 代办费
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, // 合计
  ];
  XLSX.utils.book_append_sheet(workbook, ws, '学生费用明细');
}

// 导出班级缴费记录
async function exportClassPaymentRecords(workbook: XLSX.WorkBook, payments: PaymentData[], className: string) {
  const classPayments = payments.filter(p => p.student_class === className);

  // 按日期排序
  const sortedPayments = [...classPayments].sort((a, b) => 
    (b.payment_date || '').localeCompare(a.payment_date || '')
  );

  // 缴费记录
  const paymentRecords = sortedPayments.map(p => ({
    班级: className,
    学生姓名: p.student_name,
    交费日期: p.payment_date,
    费用类型: feeTypeMap[p.fee_type] || p.fee_type,
    金额: p.amount,
    备注: p.remarks || ''
  }));

  // 添加汇总行
  const summaryRow = {
    班级: '合计',
    学生姓名: '',
    交费日期: '',
    费用类型: '',
    金额: paymentRecords.reduce((sum, p) => sum + p.金额, 0),
    备注: `共 ${paymentRecords.length} 条记录`
  };

  const sheetData = [...paymentRecords, summaryRow];

  if (sheetData.length > 1) {
    const ws = XLSX.utils.json_to_sheet(sheetData);
    ws['!cols'] = [
      { wch: 10 }, // 班级
      { wch: 12 }, // 学生姓名
      { wch: 12 }, // 交费日期
      { wch: 10 }, // 费用类型
      { wch: 10 }, // 金额
      { wch: 20 }, // 备注
    ];
    XLSX.utils.book_append_sheet(workbook, ws, '缴费记录');
  } else {
    // 如果没有缴费记录，添加空表提示
    const emptyWs = XLSX.utils.json_to_sheet([{ 提示: '暂无缴费记录' }]);
    XLSX.utils.book_append_sheet(workbook, emptyWs, '缴费记录');
  }
}

// 按班级导出（原有功能）
async function exportByClass(workbook: XLSX.WorkBook, students: StudentData[], payments: PaymentData[]) {
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

    const otherFee = classStudents.reduce((sum, s) => sum + (s.agency_fee || 0), 0);
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
      代办费应交: otherFee,
      代办费已交: otherPaid,
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
    代办费应交: classStats.reduce((sum, s) => sum + s.代办费应交, 0),
    代办费已交: classStats.reduce((sum, s) => sum + s.代办费已交, 0),
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
    { wch: 12 }, // 代办费应交
    { wch: 12 }, // 代办费已交
    { wch: 12 }, // 合计应交
    { wch: 12 }, // 合计已交
    { wch: 12 }, // 待收金额
    { wch: 10 }, // 收缴率
  ];

  XLSX.utils.book_append_sheet(workbook, ws, '班级费用统计');
}

// 按月导出（原有功能）
async function exportByMonth(workbook: XLSX.WorkBook, students: StudentData[], payments: PaymentData[]) {
  // 获取所有月份
  const months = [...new Set(
    payments.map(p => p.payment_date?.substring(0, 7)).filter(Boolean)
  )].sort();

  // 月度统计类型
  interface MonthlyStat {
    月份: string;
    [key: string]: string | number;
  }

  // 计算各月统计数据
  const monthlyStats: MonthlyStat[] = months.map(month => {
    const monthPayments = payments.filter(p => p.payment_date?.startsWith(month));

    const result: MonthlyStat = {
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
  const totalRow: MonthlyStat = {
    月份: '合计'
  };

  Object.keys(feeTypeMap).forEach(type => {
    totalRow[feeTypeMap[type]] = monthlyStats.reduce((sum, s) => sum + (Number(s[feeTypeMap[type]]) || 0), 0);
  });
  totalRow['月度合计'] = monthlyStats.reduce((sum, s) => sum + (Number(s['月度合计']) || 0), 0);
  totalRow['交费笔数'] = monthlyStats.reduce((sum, s) => sum + (Number(s['交费笔数']) || 0), 0);

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
    { wch: 12 }, // 代办费
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

// 代办费扣除项目类型映射
const agencyFeeItemTypeMap: Record<string, string> = {
  textbook: '教材教辅',
  notebook: '簿册费',
  autumn_trip: '秋游',
  art_supplies: '美术用品',
  report_manual: '报告手册',
  daily_other: '日常其他',
};

// 导出班级代办费明细
async function exportAgencyFeeDetail(workbook: XLSX.WorkBook, className: string) {
  // 获取班级学生列表
  const students = db.prepare(`
    SELECT id, student_name, gender, agency_fee, agency_paid
    FROM student_fees
    WHERE class_name = ?
    ORDER BY student_name
  `).all(className) as Array<{
    id: number;
    student_name: string;
    gender: string;
    agency_fee: number;
    agency_paid: number;
  }>;

  // 获取每个学生的代办费扣除记录
  const studentDetails = [];
  const allDeductionRecords = [];

  for (const student of students) {
    // 计算已扣除金额
    const deductions = db.prepare(`
      SELECT id, item_type, amount, item_date, remark
      FROM agency_fee_items
      WHERE student_id = ?
      ORDER BY item_date DESC
    `).all(student.id) as Array<{
      id: number;
      item_type: string;
      amount: number;
      item_date: string;
      remark: string | null;
    }>;

    const totalDeducted = deductions.reduce((sum, d) => sum + d.amount, 0);
    const agencyPaid = student.agency_paid ?? student.agency_fee ?? 0;
    const balance = agencyPaid - totalDeducted;

    studentDetails.push({
      班级: className,
      学生姓名: student.student_name,
      性别: student.gender || '未设置',
      应交代办费: student.agency_fee || 0,
      已交代办费: agencyPaid,
      已扣除金额: totalDeducted,
      剩余金额: balance,
    });

    // 收集所有扣除记录
    for (const d of deductions) {
      allDeductionRecords.push({
        班级: className,
        学生姓名: student.student_name,
        性别: student.gender || '未设置',
        扣除日期: d.item_date,
        扣除项目: agencyFeeItemTypeMap[d.item_type] || d.item_type,
        扣除金额: d.amount,
        备注: d.remark || '',
      });
    }
  }

  // 添加汇总行
  const summaryRow = {
    班级: '合计',
    学生姓名: '',
    性别: '',
    应交代办费: studentDetails.reduce((sum, s) => sum + s.应交代办费, 0),
    已交代办费: studentDetails.reduce((sum, s) => sum + s.已交代办费, 0),
    已扣除金额: studentDetails.reduce((sum, s) => sum + s.已扣除金额, 0),
    剩余金额: studentDetails.reduce((sum, s) => sum + s.剩余金额, 0),
  };

  // 创建学生汇总表
  const summarySheetData = [...studentDetails, summaryRow];
  const summaryWs = XLSX.utils.json_to_sheet(summarySheetData);
  summaryWs['!cols'] = [
    { wch: 10 }, // 班级
    { wch: 12 }, // 学生姓名
    { wch: 8 },  // 性别
    { wch: 12 }, // 应交代办费
    { wch: 12 }, // 已交代办费
    { wch: 12 }, // 已扣除金额
    { wch: 12 }, // 剩余金额
  ];
  XLSX.utils.book_append_sheet(workbook, summaryWs, '学生代办费汇总');

  // 创建扣除明细表
  if (allDeductionRecords.length > 0) {
    const detailWs = XLSX.utils.json_to_sheet(allDeductionRecords);
    detailWs['!cols'] = [
      { wch: 10 }, // 班级
      { wch: 12 }, // 学生姓名
      { wch: 8 },  // 性别
      { wch: 12 }, // 扣除日期
      { wch: 12 }, // 扣除项目
      { wch: 12 }, // 扣除金额
      { wch: 20 }, // 备注
    ];
    XLSX.utils.book_append_sheet(workbook, detailWs, '扣除明细记录');
  } else {
    // 如果没有扣除记录，添加空表提示
    const emptyWs = XLSX.utils.json_to_sheet([{ 提示: '暂无扣除记录' }]);
    XLSX.utils.book_append_sheet(workbook, emptyWs, '扣除明细记录');
  }
}
