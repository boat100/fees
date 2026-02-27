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

  // 检查登录状态 - 多种方式验证
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
  
  // 方式3：从 URL 参数读取 token（用于多实例环境）
  if (!isLoggedIn) {
    const url = request.nextUrl;
    const tokenParam = url.searchParams.get('token');
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
    // 未登录，重定向到登录页
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

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
