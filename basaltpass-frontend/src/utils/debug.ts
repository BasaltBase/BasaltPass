// 调试工具，用于输出认证状态信息
export const debugAuth = {
  log: (message: string, data?: any) => {
    if (import.meta.env.DEV) {
      console.log(`[Auth Debug] ${message}`, data || '')
    }
  },
  
  logState: (state: any) => {
    if (import.meta.env.DEV) {
      console.log('[Auth Debug] Current State:', {
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isLoading: state.isLoading,
        hasToken: !!localStorage.getItem('access_token'),
        tokenLength: localStorage.getItem('access_token')?.length || 0,
        currentPath: window.location.pathname,
        timestamp: new Date().toISOString()
      })
    }
  },
  
  logRedirect: (from: string, to: string, reason: string) => {
    if (import.meta.env.DEV) {
      console.log(`[Auth Debug] Redirect: ${from} → ${to} (${reason}) at ${new Date().toISOString()}`)
    }
  }
} 