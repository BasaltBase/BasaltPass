import client from '../client'

export const listUsers = (q = '') => client.get('/api/v1/admin/users', { params: { q } })
export const banUser = (id: number, banned: boolean) => client.post(`/api/v1/admin/user/${id}/ban`, { banned })
export const listLogs = () => client.get('/api/v1/admin/logs')
export const listWallets = (status = '') => client.get('/api/v1/admin/wallets', { params: { status } })
export const approveTx = (id: number, status: 'success' | 'fail') => client.post(`/api/v1/admin/tx/${id}/approve`, { status })

// 仪表板统计数据
export const getDashboardStats = () => client.get('/api/v1/admin/dashboard/stats')
export const getRecentActivities = () => client.get('/api/v1/admin/dashboard/activities') 