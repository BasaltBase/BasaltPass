// JWT 解码工具函数
export function decodeJWT(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

// 从 JWT token 中获取租户 ID
export function getTenantIdFromToken(): string | null {
  const token = localStorage.getItem('access_token');
  if (!token) return null;
  
  const decoded = decodeJWT(token);
  return decoded?.tid ? decoded.tid.toString() : null;
}
