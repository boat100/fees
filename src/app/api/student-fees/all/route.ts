import { NextResponse } from 'next/server';
import { db, initDatabase } from '@/lib/database';

// 初始化数据库
initDatabase();

// DELETE - 清空所有数据
export async function DELETE() {
  try {
    // 使用事务删除所有数据
    const transaction = db.transaction(() => {
      // 先删除所有交费记录
      db.prepare('DELETE FROM payment_records').run();
      
      // 再删除所有学生
      db.prepare('DELETE FROM student_fees').run();
    });
    
    transaction();
    
    return NextResponse.json({ 
      success: true,
      message: '所有数据已清空'
    });
  } catch (error) {
    console.error('Error deleting all data:', error);
    return NextResponse.json(
      { error: '清空数据失败' },
      { status: 500 }
    );
  }
}
