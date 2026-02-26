import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { updateStudentSchema } from '@/storage/database/shared/schema';

// GET - 获取单个学生
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;
    
    const { data, error } = await client
      .from('students')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching student:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student' },
      { status: 500 }
    );
  }
}

// PUT - 更新学生信息
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;
    const body = await request.json();
    
    // 验证输入
    const validatedData = updateStudentSchema.parse(body);
    
    // 转换字段名称为 snake_case
    const updateData: Record<string, unknown> = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.studentNumber !== undefined) updateData.student_number = validatedData.studentNumber;
    if (validatedData.className !== undefined) updateData.class_name = validatedData.className;
    if (validatedData.phone !== undefined) updateData.phone = validatedData.phone;
    if (validatedData.email !== undefined) updateData.email = validatedData.email;
    updateData.updated_at = new Date().toISOString();
    
    const { data, error } = await client
      .from('students')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error updating student:', error);
    return NextResponse.json(
      { error: 'Failed to update student' },
      { status: 500 }
    );
  }
}

// DELETE - 删除学生
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;
    
    // 先删除该学生的所有费用记录
    const { error: feesError } = await client
      .from('fees')
      .delete()
      .eq('student_id', id);
    
    if (feesError) {
      console.error('Error deleting student fees:', feesError);
    }
    
    // 再删除学生
    const { error } = await client
      .from('students')
      .delete()
      .eq('id', id);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting student:', error);
    return NextResponse.json(
      { error: 'Failed to delete student' },
      { status: 500 }
    );
  }
}
