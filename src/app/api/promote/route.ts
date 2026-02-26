import { NextRequest, NextResponse } from 'next/server';
import { db, initDatabase } from '@/lib/database';

// 初始化数据库
initDatabase();

// GET - 获取升学预览信息
export async function GET() {
  try {
    // 获取所有班级
    const classes = db.prepare(`
      SELECT DISTINCT class_name FROM student_fees ORDER BY class_name
    `).all() as Array<{ class_name: string }>;
    
    // 识别六年级班级
    const grade6Classes = classes
      .map(c => c.class_name)
      .filter(name => /六年级|6年级|六[年]级/i.test(name));
    
    // 统计六年级学生数量
    let grade6StudentCount = 0;
    if (grade6Classes.length > 0) {
      const placeholders = grade6Classes.map(() => '?').join(',');
      const countResult = db.prepare(`
        SELECT COUNT(*) as count FROM student_fees WHERE class_name IN (${placeholders})
      `).get(...grade6Classes) as { count: number };
      grade6StudentCount = countResult.count;
    }
    
    // 计算升级后的班级名称
    const upgradeMap: Record<string, string> = {};
    classes.forEach(({ class_name }) => {
      const newName = upgradeClassName(class_name);
      upgradeMap[class_name] = newName;
    });
    
    return NextResponse.json({
      data: {
        classes: classes.map(c => c.class_name),
        grade6Classes,
        grade6StudentCount,
        upgradeMap,
      }
    });
  } catch (error) {
    console.error('Error getting promote preview:', error);
    return NextResponse.json(
      { error: '获取升学预览失败' },
      { status: 500 }
    );
  }
}

// POST - 执行升学操作
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { confirmed } = body;
    
    if (!confirmed) {
      return NextResponse.json(
        { error: '请确认备份后再执行升学操作' },
        { status: 400 }
      );
    }
    
    // 获取所有班级
    const classes = db.prepare(`
      SELECT DISTINCT class_name FROM student_fees ORDER BY class_name
    `).all() as Array<{ class_name: string }>;
    
    // 识别六年级班级
    const grade6Classes = classes
      .map(c => c.class_name)
      .filter(name => /六年级|6年级|六[年]级/i.test(name));
    
    const transaction = db.transaction(() => {
      // 1. 删除六年级学生及其交费记录
      if (grade6Classes.length > 0) {
        const placeholders = grade6Classes.map(() => '?').join(',');
        // 先获取六年级学生ID
        const grade6Students = db.prepare(`
          SELECT id FROM student_fees WHERE class_name IN (${placeholders})
        `).all(...grade6Classes) as Array<{ id: number }>;
        
        // 删除交费记录
        if (grade6Students.length > 0) {
          const idPlaceholders = grade6Students.map(() => '?').join(',');
          db.prepare(`DELETE FROM payment_records WHERE student_id IN (${idPlaceholders})`).run(...grade6Students.map(s => s.id));
        }
        
        // 删除学生
        db.prepare(`DELETE FROM student_fees WHERE class_name IN (${placeholders})`).run(...grade6Classes);
      }
      
      // 2. 升级其他班级
      classes.forEach(({ class_name }) => {
        // 跳过六年级
        if (grade6Classes.includes(class_name)) return;
        
        const newClassName = upgradeClassName(class_name);
        if (newClassName !== class_name) {
          db.prepare(`
            UPDATE student_fees SET class_name = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE class_name = ?
          `).run(newClassName, class_name);
          
          // 清空交费记录（新学年重新缴费）
          const students = db.prepare(`
            SELECT id FROM student_fees WHERE class_name = ?
          `).all(newClassName) as Array<{ id: number }>;
          
          students.forEach(({ id }) => {
            db.prepare('DELETE FROM payment_records WHERE student_id = ?').run(id);
          });
        }
      });
    });
    
    transaction();
    
    return NextResponse.json({
      success: true,
      message: '升学操作完成！六年级学生已删除，其他班级已升级。',
      summary: {
        deletedGrade6Classes: grade6Classes.length,
      }
    });
  } catch (error) {
    console.error('Error promoting students:', error);
    return NextResponse.json(
      { error: '升学操作失败' },
      { status: 500 }
    );
  }
}

// 班级名称升级函数
function upgradeClassName(className: string): string {
  // 匹配数字年级：一年级 -> 二年级, 1年级 -> 2年级
  const gradeMap: Record<string, string> = {
    '一': '二', '二': '三', '三': '四', '四': '五', '五': '六',
    '1': '2', '2': '3', '3': '4', '4': '5', '5': '6',
  };
  
  // 中文数字年级
  for (const [from, to] of Object.entries(gradeMap)) {
    if (className.includes(`${from}年级`) || className.includes(`${from}年级`)) {
      return className.replace(from, to);
    }
  }
  
  // 如果没有匹配到年级格式，保持不变
  return className;
}
