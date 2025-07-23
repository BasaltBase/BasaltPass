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
        currentPath: window.location.pathname
      })
    }
  },
  
  logRedirect: (from: string, to: string, reason: string) => {
    if (import.meta.env.DEV) {
      console.log(`[Auth Debug] Redirect: ${from} → ${to} (${reason})`)
    }
  }
} 