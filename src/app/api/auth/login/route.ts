import { NextRequest, NextResponse } from 'next/server';
import { validateCredentials, setAuthCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: '请输入用户名和密码' },
        { status: 400 }
      );
    }

    if (validateCredentials(username, password)) {
      await setAuthCookie();
      return NextResponse.json({ 
        success: true, 
        message: '登录成功',
        user: { username } 
      });
    } else {
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: '登录失败，请重试' },
      { status: 500 }
    );
  }
}
