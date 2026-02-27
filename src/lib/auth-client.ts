// 存储 token 的 key
const AUTH_TOKEN_KEY = 'school_fees_auth_token';

// 获取存储的 token
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

// 设置 token
export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

// 清除 token
export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

// 检查是否已登录
export function isAuthenticated(): boolean {
  return getAuthToken() === 'authenticated';
}

// 添加 token 到 URL 参数
export function addTokenToUrl(url: string): string {
  const token = getAuthToken();
  if (!token) return url;
  
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}token=${encodeURIComponent(token)}`;
}

// 添加 token 到 headers
export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['x-auth-token'] = token;
  }
  
  return headers;
}

// 带认证的 fetch
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  
  // 添加 token 到 URL
  const urlWithToken = addTokenToUrl(url);
  
  // 添加 token 到 headers
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('x-auth-token', token);
  }
  
  return fetch(urlWithToken, {
    ...options,
    headers,
  });
}
