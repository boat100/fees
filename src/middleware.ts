import { NextRequest, NextResponse } from 'next/server';

// 不需要登录验证的路径
const publicPaths = ['/login', '/api/auth/login', '/api/auth/check'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 检查是否是公共路径
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  
  // 检查是否是静态资源
  const isStaticAsset = pathname.startsWith('/_next') || 
                        pathname.startsWith('/favicon') ||
                        pathname.includes('.');

  if (isPublicPath || isStaticAsset) {
    return NextResponse.next();
  }

  // 对于 API 请求，严格验证认证
  if (pathname.startsWith('/api/')) {
    let isLoggedIn = false;
    
    // 方式1：从 request.cookies 读取
    const authToken = request.cookies.get('auth_token');
    if (authToken?.value === 'authenticated') {
      isLoggedIn = true;
    }
    
    // 方式2：从 cookie header 直接解析
    if (!isLoggedIn) {
      const cookieHeader = request.headers.get('cookie') || '';
      if (cookieHeader.includes('auth_token=authenticated')) {
        isLoggedIn = true;
      }
    }
    
    // 方式3：从 URL 参数读取 token
    if (!isLoggedIn) {
      const tokenParam = request.nextUrl.searchParams.get('token');
      if (tokenParam === 'authenticated') {
        isLoggedIn = true;
      }
    }
    
    // 方式4：从自定义 header 读取
    if (!isLoggedIn) {
      const authHeader = request.headers.get('x-auth-token');
      if (authHeader === 'authenticated') {
        isLoggedIn = true;
      }
    }
    
    if (!isLoggedIn) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    
    return NextResponse.next();
  }

  // 对于页面请求，放行让前端 JavaScript 处理认证
  // 前端会检查 localStorage 并在需要时跳转到登录页
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径除了:
     * - _next/static (静态文件)
     * - _next/image (图片优化文件)
     * - favicon.ico (网站图标)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
