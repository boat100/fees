import { NextRequest, NextResponse } from 'next/server';
import { db, initDatabase } from '@/lib/database';

// 初始化数据库
initDatabase();

// GET - 获取统计数据
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const className = searchParams.get('className');
    
    // 获取学生总数
    let studentCountSql = 'SELECT COUNT(*) as count FROM students';
    const studentParams: string[] = [];
    if (className) {
      studentCountSql += ' WHERE class_name = ?';
      studentParams.push(className);
    }
    const totalStudents = (db.prepare(studentCountSql).get(...studentParams) as { count: number }).count;
    
    // 获取费用统计
    let feesSql = `
      SELECT 
        f.id, f.student_id, f.fee_type, f.amount, f.status
      FROM fees f
    `;
    const feesParams: (string | number)[] = [];
    
    if (className) {
      feesSql += ' JOIN students s ON f.student_id = s.id WHERE s.class_name = ?';
      feesParams.push(className);
    }
    
    const fees = db.prepare(feesSql).all(...feesParams) as Array<{
      id: number;
      student_id: number;
      fee_type: string;
      amount: number;
      status: number;
    }>;
    
    // 计算统计数据
    const totalFees = fees.reduce((sum, fee) => sum + fee.amount, 0);
    const paidFees = fees.filter(f => f.status === 1).reduce((sum, fee) => sum + fee.amount, 0);
    const unpaidFees = fees.filter(f => f.status === 0).reduce((sum, fee) => sum + fee.amount, 0);
    const paidCount = fees.filter(f => f.status === 1).length;
    const unpaidCount = fees.filter(f => f.status === 0).length;
    
    // 按费用类型统计
    const feeTypeMap = new Map<string, { total: number; paid: number; unpaid: number; count: number }>();
    fees.forEach(fee => {
      const existing = feeTypeMap.get(fee.fee_type) || { total: 0, paid: 0, unpaid: 0, count: 0 };
      existing.total += fee.amount;
      existing.count++;
      if (fee.status === 1) {
        existing.paid += fee.amount;
      } else {
        existing.unpaid += fee.amount;
      }
      feeTypeMap.set(fee.fee_type, existing);
    });
    
    const feeTypeStats = Array.from(feeTypeMap.entries()).map(([type, stats]) => ({
      feeType: type,
      total: stats.total,
      paid: stats.paid,
      unpaid: stats.unpaid,
      count: stats.count,
    }));
    
    // 获取学生列表用于班级统计
    let studentsSql = 'SELECT id, class_name FROM students';
    const studentsParams: string[] = [];
    if (className) {
      studentsSql += ' WHERE class_name = ?';
      studentsParams.push(className);
    }
    const students = db.prepare(studentsSql).all(...studentsParams) as Array<{
      id: number;
      class_name: string;
    }>;
    
    // 按班级统计
    const classMap = new Map<string, { total: number; paid: number; unpaid: number; studentCount: number }>();
    students.forEach(student => {
      const studentFees = fees.filter(f => f.student_id === student.id);
      const total = studentFees.reduce((sum, f) => sum + f.amount, 0);
      const paid = studentFees.filter(f => f.status === 1).reduce((sum, f) => sum + f.amount, 0);
      const unpaid = studentFees.filter(f => f.status === 0).reduce((sum, f) => sum + f.amount, 0);
      
      const existing = classMap.get(student.class_name) || { total: 0, paid: 0, unpaid: 0, studentCount: 0 };
      existing.total += total;
      existing.paid += paid;
      existing.unpaid += unpaid;
      existing.studentCount++;
      classMap.set(student.class_name, existing);
    });
    
    const classStats = Array.from(classMap.entries()).map(([className, stats]) => ({
      className,
      total: stats.total,
      paid: stats.paid,
      unpaid: stats.unpaid,
      studentCount: stats.studentCount,
    }));
    
    return NextResponse.json({
      data: {
        totalStudents,
        totalFees,
        paidFees,
        unpaidFees,
        paidCount,
        unpaidCount,
        feeTypeStats,
        classStats,
      }
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
