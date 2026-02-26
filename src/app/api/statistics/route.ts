import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET - 获取统计数据
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const className = searchParams.get('className');
    
    // 获取所有学生
    let studentsQuery = client.from('students').select('id, name, student_number, class_name');
    if (className) {
      studentsQuery = studentsQuery.eq('class_name', className);
    }
    const { data: students, error: studentsError } = await studentsQuery;
    
    if (studentsError) {
      return NextResponse.json({ error: studentsError.message }, { status: 500 });
    }
    
    // 获取所有费用
    let feesQuery = client.from('fees').select('*');
    if (className) {
      // 先获取该班级的学生ID
      const studentIds = students?.map(s => s.id) || [];
      if (studentIds.length > 0) {
        feesQuery = feesQuery.in('student_id', studentIds);
      } else {
        return NextResponse.json({
          data: {
            totalStudents: 0,
            totalFees: 0,
            paidFees: 0,
            unpaidFees: 0,
            paidCount: 0,
            unpaidCount: 0,
            feeTypeStats: [],
            classStats: [],
          }
        });
      }
    }
    const { data: fees, error: feesError } = await feesQuery;
    
    if (feesError) {
      return NextResponse.json({ error: feesError.message }, { status: 500 });
    }
    
    // 计算统计数据
    const totalStudents = students?.length || 0;
    const totalFees = fees?.reduce((sum, fee) => sum + parseFloat(fee.amount), 0) || 0;
    const paidFees = fees?.filter(f => f.status).reduce((sum, fee) => sum + parseFloat(fee.amount), 0) || 0;
    const unpaidFees = fees?.filter(f => !f.status).reduce((sum, fee) => sum + parseFloat(fee.amount), 0) || 0;
    const paidCount = fees?.filter(f => f.status).length || 0;
    const unpaidCount = fees?.filter(f => !f.status).length || 0;
    
    // 按费用类型统计
    const feeTypeMap = new Map<string, { total: number; paid: number; unpaid: number; count: number }>();
    fees?.forEach(fee => {
      const existing = feeTypeMap.get(fee.fee_type) || { total: 0, paid: 0, unpaid: 0, count: 0 };
      existing.total += parseFloat(fee.amount);
      existing.count++;
      if (fee.status) {
        existing.paid += parseFloat(fee.amount);
      } else {
        existing.unpaid += parseFloat(fee.amount);
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
    
    // 按班级统计
    const classMap = new Map<string, { total: number; paid: number; unpaid: number; studentCount: number }>();
    students?.forEach(student => {
      const studentFees = fees?.filter(f => f.student_id === student.id) || [];
      const total = studentFees.reduce((sum, f) => sum + parseFloat(f.amount), 0);
      const paid = studentFees.filter(f => f.status).reduce((sum, f) => sum + parseFloat(f.amount), 0);
      const unpaid = studentFees.filter(f => !f.status).reduce((sum, f) => sum + parseFloat(f.amount), 0);
      
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
