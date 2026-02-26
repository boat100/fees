import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { insertStudentSchema } from '@/storage/database/shared/schema';

// GET - 获取学生列表
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    const className = searchParams.get('className');
    const search = searchParams.get('search');
    
    let query = client
      .from('students')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (className) {
      query = query.eq('class_name', className);
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,student_number.ilike.%${search}%`);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    );
  }
}

// POST - 新增学生
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    
    // 验证输入
    const validatedData = insertStudentSchema.parse(body);
    
    // 转换字段名称为 snake_case
    const studentData = {
      name: validatedData.name,
      student_number: validatedData.studentNumber,
      class_name: validatedData.className,
      phone: validatedData.phone,
      email: validatedData.email,
    };
    
    const { data, error } = await client
      .from('students')
      .insert(studentData)
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Error creating student:', error);
    return NextResponse.json(
      { error: 'Failed to create student' },
      { status: 500 }
    );
  }
}
