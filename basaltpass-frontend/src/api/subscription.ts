import client from './client'

// ================= 产品 & 套餐 =================
export const listProducts = () => client.get('/api/v1/products')
export const getProduct = (id: number) => client.get(`/api/v1/products/${id}`)
export const listPlans = (params?: { product_id?: number }) => client.get('/api/v1/plans', { params })
export const getPlan = (id: number) => client.get(`/api/v1/plans/${id}`)
export const getPrice = (id: number) => client.get(`/api/v1/prices/${id}`)

// ================= 优惠券 =================
export const validateCoupon = (code: string) => client.get(`/api/v1/coupons/${code}/validate`)

// ================= 订阅 =================
export const createSubscription = (data: any) => client.post('/api/v1/subscriptions', data)
export const listSubscriptions = () => client.get('/api/v1/subscriptions')
export const getSubscription = (id: number) => client.get(`/api/v1/subscriptions/${id}`)
export const cancelSubscription = (id: number, data?: any) => client.put(`/api/v1/subscriptions/${id}/cancel`, data)

// ================= 管理员接口 =================
export const adminListSubscriptions = (params?: any) => client.get('/api/v1/admin/subscriptions', { params })
export const adminCancelSubscription = (id: number, data?: any) => client.put(`/api/v1/admin/subscriptions/${id}/cancel`, data)

// 管理员产品管理
export const adminListProducts = (params?: any) => client.get('/api/v1/admin/products', { params })
export const adminGetProduct = (id: number) => client.get(`/api/v1/admin/products/${id}`)
export const adminCreateProduct = (data: any) => client.post('/api/v1/admin/products', data)
export const adminUpdateProduct = (id: number, data: any) => client.put(`/api/v1/admin/products/${id}`, data)
export const adminDeleteProduct = (id: number) => client.delete(`/api/v1/admin/products/${id}`)

// 管理员套餐管理
export const adminListPlans = (params?: any) => client.get('/api/v1/admin/plans', { params })
export const adminGetPlan = (id: number) => client.get(`/api/v1/admin/plans/${id}`)
export const adminCreatePlan = (data: any) => client.post('/api/v1/admin/plans', data)
export const adminUpdatePlan = (id: number, data: any) => client.put(`/api/v1/admin/plans/${id}`, data)
export const adminDeletePlan = (id: number) => client.delete(`/api/v1/admin/plans/${id}`)

// 管理员定价管理
export const adminListPrices = (params?: any) => client.get('/api/v1/admin/prices', { params })
export const adminGetPrice = (id: number) => client.get(`/api/v1/admin/prices/${id}`)
export const adminCreatePrice = (data: any) => client.post('/api/v1/admin/prices', data)
export const adminUpdatePrice = (id: number, data: any) => client.put(`/api/v1/admin/prices/${id}`, data)
export const adminDeletePrice = (id: number) => client.delete(`/api/v1/admin/prices/${id}`)

// 管理员优惠券管理
export const adminListCoupons = (params?: any) => client.get('/api/v1/admin/coupons', { params })
export const adminGetCoupon = (code: string) => client.get(`/api/v1/admin/coupons/${code}`)
export const adminCreateCoupon = (data: any) => client.post('/api/v1/admin/coupons', data)
export const adminUpdateCoupon = (code: string, data: any) => client.put(`/api/v1/admin/coupons/${code}`, data)
export const adminDeleteCoupon = (code: string) => client.delete(`/api/v1/admin/coupons/${code}`)

// ================= 使用记录 =================
export const createUsageRecord = (data: any) => client.post('/api/v1/usage/records', data) 