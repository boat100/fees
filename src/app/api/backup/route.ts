import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import fs from 'fs';
import path from 'path';

// 数据库文件路径
const dbPath = path.join(process.cwd(), 'data', 'school_fees.db');

// GET - 下载数据库备份
export async function GET() {
  try {
    // 检查数据库文件是否存在
    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ error: '数据库文件不存在' }, { status: 404 });
    }

    // 读取数据库文件
    const fileBuffer = fs.readFileSync(dbPath);
    
    // 生成备份文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `school_fees_backup_${timestamp}.db`;

    // 返回文件
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Backup failed:', error);
    return NextResponse.json({ error: '备份失败' }, { status: 500 });
  }
}

// POST - 恢复数据库
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '请选择备份文件' }, { status: 400 });
    }

    // 验证文件类型
    if (!file.name.endsWith('.db')) {
      return NextResponse.json({ error: '请选择 .db 格式的备份文件' }, { status: 400 });
    }

    // 读取上传的文件
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 验证是否为有效的SQLite数据库
    // SQLite数据库文件前16字节为 "SQLite format 3\x00"
    const header = buffer.slice(0, 16).toString('utf8');
    if (!header.startsWith('SQLite format 3')) {
      return NextResponse.json({ error: '无效的数据库文件格式' }, { status: 400 });
    }

    // 关闭当前数据库连接
    try {
      db.close();
    } catch {
      // 忽略关闭错误
    }

    // 备份当前数据库（以防恢复失败）
    const backupPath = `${dbPath}.bak`;
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
    }

    try {
      // 写入新的数据库文件
      fs.writeFileSync(dbPath, buffer);

      // 重新打开数据库连接
      // 由于db是模块级变量，需要重新赋值
      // 这里通过动态导入来重新初始化
      delete require.cache[require.resolve('@/lib/database')];

      return NextResponse.json({ 
        success: true, 
        message: '数据库恢复成功，请刷新页面以确保数据更新' 
      });
    } catch (writeError) {
      // 恢复失败，还原备份
      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, dbPath);
      }
      throw writeError;
    }
  } catch (error) {
    console.error('Restore failed:', error);
    return NextResponse.json({ error: '恢复失败，请检查文件是否有效' }, { status: 500 });
  }
}
