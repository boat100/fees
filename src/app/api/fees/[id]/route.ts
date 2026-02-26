import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { updateFeeSchema } from '@/storage/database/shared/schema';

// GET - 获取单条费用记录
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;
    
    const { data, error } = await client
      .from('fees')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching fee:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fee' },
      { status: 500 }
    );
  }
}

// PUT - 更新费用记录
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;
    const body = await request.json();
    
    // 验证输入
    const validatedData = updateFeeSchema.parse(body);
    
    // 转换字段名称为 snake_case
    const updateData: Record<string, unknown> = {};
    if (validatedData.feeType !== undefined) updateData.fee_type = validatedData.feeType;
    if (validatedData.amount !== undefined) updateData.amount = validatedData.amount;
    if (validatedData.status !== undefined) updateData.status = validatedData.status;
    if (validatedData.remark !== undefined) updateData.remark = validatedData.remark;
    updateData.updated_at = new Date().toISOString();
    
    const { data, error } = await client
      .from('fees')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error updating fee:', error);
    return NextResponse.json(
      { error: 'Failed to update fee' },
      { status: 500 }
    );
  }
}

// DELETE - 删除费用记录
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;
    
    const { error } = await client
      .from('fees')
      .delete()
      .eq('id', id);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting fee:', error);
    return NextResponse.json(
      { error: 'Failed to delete fee' },
      { status: 500 }
    );
  }
}
