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
      
      // 不在这里处理跳转，让 ProtectedRoute 和 AuthContext 处理认证状态
      // 这样可以避免与 React Router 的冲突
    }
    return Promise.reject(error)
  }
)

export default client 