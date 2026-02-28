import { NextResponse } from 'next/server';
import { db, initDatabase } from '@/lib/database';

// 初始化数据库
initDatabase();

// DELETE - 清空所有数据（包含收费和支出）
export async function DELETE() {
  try {
    // 使用事务删除所有数据
    const transaction = db.transaction(() => {
      // 删除收费相关数据
      // 先删除所有交费记录
      db.prepare('DELETE FROM payment_records').run();
      
      // 删除所有代办费扣除项目
      db.prepare('DELETE FROM agency_fee_items').run();
      
      // 再删除所有学生费用
      db.prepare('DELETE FROM student_fees').run();
      
      // 删除支出相关数据
      // 删除所有支出记录
      db.prepare('DELETE FROM expense_records').run();
    });
    
    transaction();
    
    return NextResponse.json({ 
      success: true,
      message: '所有数据已清空（包含收费和支出数据）'
    });
  } catch (error) {
    console.error('Error deleting all data:', error);
    return NextResponse.json(
      { error: '清空数据失败' },
      { status: 500 }
    );
  }
}
