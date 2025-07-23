import axios from 'axios'
import { getAccessToken, clearAccessToken } from '../utils/auth'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:8080',
  withCredentials: true,
})

client.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器 - 处理401错误
client.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token失效，清除本地存储的token
      clearAccessToken()
      
      // 只有在非登录/注册页面且不是初始化认证检查时才跳转
      const currentPath = window.location.pathname
      const isAuthPage = currentPath === '/login' || currentPath === '/register'
      const isInitialCheck = error.config?.url?.includes('/api/v1/user/profile') && 
                           error.config?.method === 'get' && 
                           !isAuthPage
      
      if (!isAuthPage && !isInitialCheck) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default client 