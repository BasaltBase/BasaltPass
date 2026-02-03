import axios from 'axios'
import { getAccessToken, clearAccessToken } from '../utils/auth'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:8080',
  withCredentials: true,
})

// 是否正在刷新token的标志
let isRefreshing = false
// 等待刷新完成的请求队列
let failedQueue: Array<{
  resolve: (value?: any) => void
  reject: (error?: any) => void
}> = []

// 处理队列中的请求
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
    } else {
      resolve(token)
    }
  })
  
  failedQueue = []
}

client.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }

  // Scope header: user/tenant/admin (defaults to user)
  config.headers = config.headers || {}
  const scope = (import.meta as any).env?.VITE_AUTH_SCOPE || 'user'
  ;(config.headers as any)['X-Auth-Scope'] = scope
  
  return config
})

// 响应拦截器 - 处理401错误和自动刷新token
client.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      const url: string = originalRequest?.url || ''
      // 跳过认证相关接口的刷新逻辑，直接把错误抛给调用方（避免死循环/卡住登录）
      const isAuthEndpoint = url.includes('/api/v1/auth/login')
        || url.includes('/api/v1/auth/verify-2fa')
        || url.includes('/api/v1/auth/refresh')
      if (isAuthEndpoint) {
        return Promise.reject(error)
      }
      if (isRefreshing) {
        // 如果正在刷新token，将请求加入队列
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          originalRequest.headers.Authorization = 'Bearer ' + token
          return client(originalRequest)
        }).catch(err => {
          return Promise.reject(err)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // 尝试刷新token
        const response = await client.post('/api/v1/auth/refresh')
        const { access_token } = response.data
        
        // 更新本地存储的token
        localStorage.setItem('access_token', access_token)
        
        // 处理队列中的请求
        processQueue(null, access_token)
        
        // 重试原请求
        originalRequest.headers.Authorization = 'Bearer ' + access_token
        return client(originalRequest)
        
      } catch (refreshError) {
        // 刷新失败，清除token并处理队列
        processQueue(refreshError, null)
        clearAccessToken()
        
        // 如果是在非登录页面，跳转到登录页
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
        
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }
    
    return Promise.reject(error)
  }
)

export default client 