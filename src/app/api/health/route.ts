import { NextResponse } from 'next/server';

/**
 * 健康检查端点 - 用于 Docker HEALTHCHECK
 * 返回简单的 200 OK 响应
 */
export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
}
