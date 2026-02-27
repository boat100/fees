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

  // 检查登录状态 - 同时检查 request.cookies 和 cookie header
  const authToken = request.cookies.get('auth_token');
  
  // 备用方案：从 cookie header 直接解析
  const cookieHeader = request.headers.get('cookie') || '';
  const hasAuthToken = cookieHeader.includes('auth_token=authenticated');
  
  if ((!authToken || authToken.value !== 'authenticated') && !hasAuthToken) {
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
