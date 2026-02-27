import { cookies, headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// 管理员账户配置
const ADMIN_ACCOUNT = {
  username: 'admin',
  password: 'adminFF',
};

// 检查登录凭据
export function validateCredentials(username: string, password: string): boolean {
  return username === ADMIN_ACCOUNT.username && password === ADMIN_ACCOUNT.password;
}

// 设置登录 cookie
export async function setAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  // 判断是否是 HTTPS 环境
  const headersList = await headers();
  const protocol = headersList.get('x-forwarded-proto') || 'http';
  const isSecure = protocol === 'https' || process.env.NODE_ENV === 'production';
  
  cookieStore.set('auth_token', 'authenticated', {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

// 清除登录 cookie
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('auth_token');
}

// 检查是否已登录
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token');
  
  if (token?.value === 'authenticated') {
    return true;
  }
  
  // 备用方案：从 header 直接读取
  const headersList = await headers();
  const cookieHeader = headersList.get('cookie') || '';
  return cookieHeader.includes('auth_token=authenticated');
}

// 获取当前用户信息
export async function getCurrentUser(): Promise<{ username: string } | null> {
  const authenticated = await isAuthenticated();
  if (authenticated) {
    return { username: ADMIN_ACCOUNT.username };
  }
  return null;
}

// 客户端检查登录状态
export async function checkAuthStatus(): Promise<{ authenticated: boolean; user?: { username: string } }> {
  try {
    const response = await fetch('/api/auth/check');
    if (response.ok) {
      const data = await response.json();
      return data;
    }
    return { authenticated: false };
  } catch {
    return { authenticated: false };
  }
}
