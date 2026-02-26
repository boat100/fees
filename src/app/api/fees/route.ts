import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { insertFeeSchema } from '@/storage/database/shared/schema';

// GET - 获取费用列表
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    const studentId = searchParams.get('studentId');
    const status = searchParams.get('status');
    const feeType = searchParams.get('feeType');
    
    let query = client
      .from('fees')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (studentId) {
      query = query.eq('student_id', studentId);
    }
    
    if (status !== null) {
      query = query.eq('status', status === 'true');
    }
    
    if (feeType) {
      query = query.eq('fee_type', feeType);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching fees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fees' },
      { status: 500 }
    );
  }
}

// POST - 新增费用记录
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    
    // 验证输入
    const validatedData = insertFeeSchema.parse(body);
    
    // 转换字段名称为 snake_case
    const feeData = {
      student_id: validatedData.studentId,
      fee_type: validatedData.feeType,
      amount: validatedData.amount,
      status: validatedData.status ?? false,
      remark: validatedData.remark,
    };
    
    const { data, error } = await client
      .from('fees')
      .insert(feeData)
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Error creating fee:', error);
    return NextResponse.json(
      { error: 'Failed to create fee' },
      { status: 500 }
    );
  }
}
