import axios from 'axios'
import { getAccessToken } from '../utils/auth'

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

export default client 