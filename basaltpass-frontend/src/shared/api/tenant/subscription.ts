import client from '../client';

// 租户订阅管理API

// ==================== 产品管理 ====================

export interface TenantProduct {
  ID: number;
  TenantID?: number;
  Code: string;
  Name: string;
  Description: string;
  Metadata: Record<string, any>;
  EffectiveAt: string | null;
  DeprecatedAt: string | null;
  CreatedAt: string;
  UpdatedAt: string;
  DeletedAt?: string | null;
  Plans: TenantPlan[];
}

export interface CreateTenantProductRequest {
  code: string;
  name: string;
  description?: string;
  metadata?: Record<string, any>;
  effective_at?: string;
}

export interface UpdateTenantProductRequest {
  name?: string;
  description?: string;
  metadata?: Record<string, any>;
}

// ==================== 套餐管理 ====================

export interface TenantPlan {
  ID: number;
  TenantID?: number;
  ProductID: number;
  Code: string;
  DisplayName: string;
  PlanVersion: number;
  Metadata: Record<string, any>;
  EffectiveAt: string | null;
  DeprecatedAt: string | null;
  CreatedAt: string;
  UpdatedAt: string;
  DeletedAt?: string | null;
  Product: TenantProduct;
  Features: TenantPlanFeature[];
  Prices: TenantPrice[];
}

export interface TenantPlanFeature {
  ID: number;
  PlanID: number;
  FeatureKey: string;
  ValueNumeric?: number;
  ValueText?: string;
  Unit?: string;
  IsUnlimited: boolean;
  Metadata: Record<string, any>;
  CreatedAt: string;
  UpdatedAt: string;
  DeletedAt?: string | null;
}

export interface CreateTenantPlanRequest {
  product_id: number;
  code: string;
  display_name: string;
  plan_version?: number;
  metadata?: Record<string, any>;
  effective_at?: string;
}

export interface UpdateTenantPlanRequest {
  display_name?: string;
  metadata?: Record<string, any>;
}

// ==================== 定价管理 ====================

export interface TenantPrice {
  ID: number;
  TenantID?: number;
  PlanID: number;
  Currency: string;
  AmountCents: number;
  BillingPeriod: string;
  BillingInterval: number;
  TrialDays?: number;
  UsageType: string;
  BillingScheme: Record<string, any>;
  EffectiveAt: string | null;
  DeprecatedAt: string | null;
  Metadata: Record<string, any>;
  CreatedAt: string;
  UpdatedAt: string;
  DeletedAt?: string | null;
  Plan: TenantPlan;
}

export interface CreateTenantPriceRequest {
  plan_id: number;
  currency: string;
  amount_cents: number;
  billing_period: string;
  billing_interval?: number;
  trial_days?: number;
  usage_type: string;
  billing_scheme?: Record<string, any>;
  effective_at?: string;
  metadata?: Record<string, any>;
}

export interface UpdateTenantPriceRequest {
  amount_cents?: number;
  currency?: string;
  trial_days?: number;
  metadata?: Record<string, any>;
}

// ==================== 订阅管理 ====================

export interface Subscription {
  ID: number;
  TenantID?: number;
  UserID: number;
  CurrentPriceID: number;
  NextPriceID?: number | null;
  Status: string;
  StartAt: string;
  CurrentPeriodStart: string;
  CurrentPeriodEnd: string;
  CancelAt?: string | null;
  CanceledAt?: string | null;
  Quantity?: number;
  CouponID?: number | null;
  GatewaySubscriptionID?: string | null;
  Metadata: Record<string, any>;
  CreatedAt: string;
  UpdatedAt: string;
  DeletedAt?: string | null;
  CurrentPrice: TenantPrice;
  NextPrice?: TenantPrice | null;
  Coupon?: TenantCoupon | null;
  User?: any; // 用户信息，通常不完整
  Items?: any[] | null;
  Events?: any[] | null;
  Invoices?: any[] | null;
}

export interface CreateTenantSubscriptionRequest {
  user_id: number;
  price_id: number;
  quantity?: number;
  coupon_id?: number;
  metadata?: Record<string, any>;
}

export interface CancelTenantSubscriptionRequest {
  cancel_at?: string;
  reason?: string;
}

// ==================== 优惠券管理 ====================

export interface TenantCoupon {
  ID: number;
  Code: string;
  Name: string;
  DiscountType: 'percent' | 'fixed';
  DiscountValue: number;
  Duration: 'once' | 'repeating' | 'forever';
  DurationInCycles?: number;
  MaxRedemptions?: number;
  RedeemedCount: number;
  ExpiresAt?: string;
  IsActive: boolean;
  Metadata: Record<string, any>;
  CreatedAt: string;
  UpdatedAt: string;
  DeletedAt?: string | null;
  TenantID?: number;
  Subscriptions?: any;
}

export interface CreateTenantCouponRequest {
  code: string;
  name?: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  duration?: 'once' | 'repeating' | 'forever';
  duration_in_cycles?: number;
  max_redemptions?: number;
  expires_at?: string;
  is_active?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateTenantCouponRequest {
  name?: string;
  discount_value?: number;
  max_redemptions?: number;
  expires_at?: string;
  is_active?: boolean;
  metadata?: Record<string, any>;
}

// ==================== 账单管理 ====================

export interface TenantInvoice {
  id: number;
  tenant_id?: number;
  user_id: number;
  subscription_id?: number;
  status: string;
  currency: string;
  total_cents: number;
  due_at?: string;
  posted_at?: string;
  paid_at?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateTenantInvoiceRequest {
  user_id: number;
  subscription_id?: number;
  currency: string;
  total_cents: number;
  due_at?: string;
  metadata?: Record<string, any>;
}

// ==================== 统计信息 ====================

export interface TenantSubscriptionStats {
  total_subscriptions: number;
  active_subscriptions: number;
  canceled_subscriptions: number;
  paused_subscriptions: number;
  total_users: number;
  monthly_revenue_cents: number;
}

// ==================== API 客户端类 ====================

class TenantSubscriptionAPI {
  // ========== 产品管理 ==========

  // 租户管理员：创建产品
  async createProduct(data: CreateTenantProductRequest): Promise<TenantProduct> {
    const response = await client.post('/api/v1/tenant/subscription/products', data);
    return response.data.data;
  }

  // 获取产品详情（管理员或普通用户）
  async getProduct(id: number): Promise<TenantProduct> {
    const response = await client.get(`/api/v1/tenant/subscription/products/${id}`);
    return response.data.data;
  }

  // 租户管理员：获取产品详情
  async adminGetProduct(id: number): Promise<TenantProduct> {
    const response = await client.get(`/api/v1/tenant/subscription/products/${id}`);
    return response.data.data;
  }

  // 列出产品（管理员或普通用户）
  async listProducts(params?: {
    page?: number;
    page_size?: number;
    code?: string;
  }) {
    const response = await client.get('/api/v1/tenant/subscription/products', { params });
    return response.data;
  }

  // 租户管理员：列出产品
  async adminListProducts(params?: {
    page?: number;
    page_size?: number;
    code?: string;
  }) {
    const response = await client.get('/api/v1/tenant/subscription/products', { params });
    return response.data;
  }

  // 租户管理员：更新产品
  async updateProduct(id: number, data: UpdateTenantProductRequest): Promise<TenantProduct> {
    const response = await client.put(`/api/v1/tenant/subscription/products/${id}`, data);
    return response.data.data;
  }

  // 租户管理员：删除产品
  async deleteProduct(id: number): Promise<void> {
    await client.delete(`/api/v1/tenant/subscription/products/${id}`);
  }

  // ========== 套餐管理 ==========

  // 租户管理员：创建套餐
  async createPlan(data: CreateTenantPlanRequest): Promise<TenantPlan> {
    const response = await client.post('/api/v1/tenant/subscription/plans', data);
    return response.data.data;
  }

  // 获取套餐详情（管理员或普通用户）
  async getPlan(id: number): Promise<TenantPlan> {
    const response = await client.get(`/api/v1/tenant/subscription/plans/${id}`);
    return response.data.data;
  }

  // 租户管理员：获取套餐详情
  async adminGetPlan(id: number): Promise<TenantPlan> {
    const response = await client.get(`/api/v1/tenant/subscription/plans/${id}`);
    return response.data.data;
  }

  // 列出套餐（管理员或普通用户）
  async listPlans(params?: {
    page?: number;
    page_size?: number;
    product_id?: number;
    code?: string;
  }) {
    const response = await client.get('/api/v1/tenant/subscription/plans', { params });
    return response.data;
  }

  // 租户管理员：列出套餐
  async adminListPlans(params?: {
    page?: number;
    page_size?: number;
    product_id?: number;
    code?: string;
  }) {
    const response = await client.get('/api/v1/tenant/subscription/plans', { params });
    return response.data;
  }

  // 租户管理员：更新套餐
  async updatePlan(id: number, data: UpdateTenantPlanRequest): Promise<TenantPlan> {
    const response = await client.put(`/api/v1/tenant/subscription/plans/${id}`, data);
    return response.data.data;
  }

  // 租户管理员：删除套餐
  async deletePlan(id: number): Promise<void> {
    await client.delete(`/api/v1/tenant/subscription/plans/${id}`);
  }

  // ========== 定价管理 ==========

  // 租户管理员：创建定价
  async createPrice(data: CreateTenantPriceRequest): Promise<TenantPrice> {
    const response = await client.post('/api/v1/tenant/subscription/prices', data);
    return response.data.data;
  }

  // 获取定价详情（管理员或普通用户）
  async getPrice(id: number): Promise<TenantPrice> {
    const response = await client.get(`/api/v1/tenant/subscription/prices/${id}`);
    return response.data.data;
  }

  // 租户管理员：获取定价详情
  async adminGetPrice(id: number): Promise<TenantPrice> {
    const response = await client.get(`/api/v1/tenant/subscription/prices/${id}`);
    return response.data.data;
  }

  // 列出定价（管理员或普通用户）
  async listPrices(params?: {
    page?: number;
    page_size?: number;
    plan_id?: number;
    currency?: string;
    usage_type?: string;
  }) {
    const response = await client.get('/api/v1/tenant/subscription/prices', { params });
    return response.data;
  }

  // 租户管理员：列出定价
  async adminListPrices(params?: {
    page?: number;
    page_size?: number;
    plan_id?: number;
    currency?: string;
    usage_type?: string;
  }) {
    const response = await client.get('/api/v1/tenant/subscription/prices', { params });
    return response.data;
  }

  // 租户管理员：更新定价
  async updatePrice(id: number, data: UpdateTenantPriceRequest): Promise<TenantPrice> {
    const response = await client.put(`/api/v1/tenant/subscription/prices/${id}`, data);
    return response.data.data;
  }

  // 租户管理员：删除定价
  async deletePrice(id: number): Promise<void> {
    await client.delete(`/api/v1/tenant/subscription/prices/${id}`);
  }

  // ========== 订阅管理 ==========

  // 租户管理员：创建订阅
  async createSubscription(data: CreateTenantSubscriptionRequest): Promise<Subscription> {
    const response = await client.post('/api/v1/tenant/subscription/subscriptions', data);
    return response.data.data;
  }

  // 获取订阅详情（管理员或普通用户）
  async getSubscription(id: number): Promise<Subscription> {
    const response = await client.get(`/api/v1/tenant/subscription/subscriptions/${id}`);
    return response.data.data;
  }

  // 租户管理员：获取订阅详情
  async adminGetSubscription(id: number): Promise<Subscription> {
    const response = await client.get(`/api/v1/tenant/subscription/subscriptions/${id}`);
    return response.data.data;
  }

  // 列出订阅（管理员或普通用户）
  async listSubscriptions(params?: {
    page?: number;
    page_size?: number;
    user_id?: number;
    status?: string;
    price_id?: number;
  }) {
    const response = await client.get('/api/v1/tenant/subscription/subscriptions', { params });
    return response.data;
  }

  // 租户管理员：列出订阅
  async adminListSubscriptions(params?: {
    page?: number;
    page_size?: number;
    user_id?: number;
    status?: string;
    price_id?: number;
  }) {
    const response = await client.get('/api/v1/tenant/subscription/subscriptions', { params });
    return response.data;
  }

  // 租户管理员：取消订阅
  async cancelSubscription(id: number, data?: CancelTenantSubscriptionRequest): Promise<void> {
    await client.post(`/api/v1/tenant/subscription/subscriptions/${id}/cancel`, data || {});
  }

  // ========== 优惠券管理 ==========

  // 列出优惠券（管理员或普通用户）
  async listCoupons(params?: {
    page?: number;
    page_size?: number;
    code?: string;
    discount_type?: string;
    is_active?: boolean;
  }) {
    const response = await client.get('/api/v1/tenant/subscription/coupons', { params });
    return response.data;
  }

  // 租户管理员：列出优惠券
  async adminListCoupons(params?: {
    page?: number;
    page_size?: number;
    code?: string;
    discount_type?: string;
    is_active?: boolean;
  }) {
    const response = await client.get('/api/v1/tenant/subscription/coupons', { params });
    return response.data;
  }

  // 租户管理员：创建优惠券
  async createCoupon(data: CreateTenantCouponRequest): Promise<TenantCoupon> {
    const response = await client.post('/api/v1/tenant/subscription/coupons', data);
    return response.data.data;
  }

  // 获取优惠券详情（管理员或普通用户）
  async getCoupon(code: string): Promise<TenantCoupon> {
    const response = await client.get(`/api/v1/tenant/subscription/coupons/${code}`);
    return response.data.data;
  }

  // 租户管理员：获取优惠券详情
  async adminGetCoupon(code: string): Promise<TenantCoupon> {
    const response = await client.get(`/api/v1/tenant/subscription/coupons/${code}`);
    return response.data.data;
  }

  // 租户管理员：更新优惠券
  async updateCoupon(code: string, data: UpdateTenantCouponRequest): Promise<TenantCoupon> {
    const response = await client.put(`/api/v1/tenant/subscription/coupons/${code}`, data);
    return response.data.data;
  }

  // 租户管理员：删除优惠券
  async deleteCoupon(code: string): Promise<void> {
    await client.delete(`/api/v1/tenant/subscription/coupons/${code}`);
  }

  // 验证优惠券（管理员或普通用户）
  async validateCoupon(code: string): Promise<{ valid: boolean; data?: TenantCoupon; error?: string }> {
    const response = await client.get(`/api/v1/tenant/subscription/coupons/${code}/validate`);
    return response.data;
  }

  // ========== 账单管理 ==========

  // 租户管理员：创建账单
  async createInvoice(data: CreateTenantInvoiceRequest): Promise<TenantInvoice> {
    const response = await client.post('/api/v1/tenant/subscription/invoices', data);
    return response.data.data;
  }

  // 列出账单（管理员或普通用户）
  async listInvoices(params?: {
    page?: number;
    page_size?: number;
    user_id?: number;
    subscription_id?: number;
    status?: string;
    currency?: string;
  }) {
    const response = await client.get('/api/v1/tenant/subscription/invoices', { params });
    return response.data;
  }

  // 租户管理员：列出账单
  async adminListInvoices(params?: {
    page?: number;
    page_size?: number;
    user_id?: number;
    subscription_id?: number;
    status?: string;
    currency?: string;
  }) {
    const response = await client.get('/api/v1/tenant/subscription/invoices', { params });
    return response.data;
  }

  // ========== 统计信息 ==========

  // 获取订阅统计（管理员或普通用户）
  async getSubscriptionStats(): Promise<TenantSubscriptionStats> {
    const response = await client.get('/api/v1/tenant/subscription/stats');
    return response.data.data;
  }

  // 租户管理员：获取订阅统计
  async adminGetSubscriptionStats(): Promise<TenantSubscriptionStats> {
    const response = await client.get('/api/v1/tenant/subscription/stats');
    return response.data.data;
  }

  // ========== 租户用户订阅查看（不需要管理员权限） ==========

  // 租户用户：获取租户下所有订阅列表
  async listTenantSubscriptions(params?: {
    page?: number;
    page_size?: number;
    user_id?: number;
    status?: string;
    price_id?: number;
  }) {
    const response = await client.get('/api/v1/tenant/subscriptions', { params });
    return response.data;
  }

  // 租户用户：获取订阅详情
  async getTenantSubscription(id: number): Promise<Subscription> {
    const response = await client.get(`/api/v1/tenant/subscriptions/${id}`);
    return response.data.data;
  }

  // ========== 辅助方法 ==========

  formatPrice(amountCents: number, currency: string): string {
    const amount = amountCents / 100;
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  }

  formatBillingPeriod(period: string, interval: number): string {
    const periodMap: Record<string, string> = {
      day: '天',
      week: '周',
      month: '月',
      year: '年'
    };

    const periodText = periodMap[period] || period;
    return interval === 1 ? `每${periodText}` : `每${interval}${periodText}`;
  }

  formatSubscriptionStatus(status: string): { text: string; color: string } {
    const statusMap: Record<string, { text: string; color: string }> = {
      active: { text: '活跃', color: 'green' },
      canceled: { text: '已取消', color: 'red' },
      paused: { text: '已暂停', color: 'yellow' },
      past_due: { text: '逾期', color: 'orange' },
      unpaid: { text: '未支付', color: 'red' },
    };

    return statusMap[status] || { text: status, color: 'gray' };
  }

  formatInvoiceStatus(status: string): { text: string; color: string } {
    const statusMap: Record<string, { text: string; color: string }> = {
      draft: { text: '草稿', color: 'gray' },
      posted: { text: '已发布', color: 'blue' },
      paid: { text: '已支付', color: 'green' },
      void: { text: '已作废', color: 'red' },
      uncollectible: { text: '无法收取', color: 'orange' },
    };

    return statusMap[status] || { text: status, color: 'gray' };
  }
}

// 导出API实例
export const tenantSubscriptionAPI = new TenantSubscriptionAPI();

// 导出普通租户用户访问的快捷函数（只读）
export const {
  getProduct: getTenantProduct,
  listProducts: listTenantProducts,
  
  getPlan: getTenantPlan,
  listPlans: listTenantPlans,
  
  getPrice: getTenantPrice,
  listPrices: listTenantPrices,
  
  getSubscription: getTenantSubscription,
  listSubscriptions: listTenantSubscriptions,
  listTenantSubscriptions: listTenantUserSubscriptions, // 新增：专门为租户用户提供的订阅列表
  getTenantSubscription: getTenantUserSubscription, // 新增：专门为租户用户提供的订阅详情
  
  listCoupons: listTenantCoupons,
  getCoupon: getTenantCoupon,
  validateCoupon: validateTenantCoupon,
  
  listInvoices: listTenantInvoices,
  
  getSubscriptionStats: getTenantSubscriptionStats,
} = tenantSubscriptionAPI;

// 导出租户管理员访问的快捷函数（完整CRUD）
export const {
  createProduct: createTenantProduct,
  adminGetProduct: adminGetTenantProduct,
  adminListProducts: adminListTenantProducts,
  updateProduct: updateTenantProduct,
  deleteProduct: deleteTenantProduct,
  
  createPlan: createTenantPlan,
  adminGetPlan: adminGetTenantPlan,
  adminListPlans: adminListTenantPlans,
  updatePlan: updateTenantPlan,
  deletePlan: deleteTenantPlan,
  
  createPrice: createTenantPrice,
  adminGetPrice: adminGetTenantPrice,
  adminListPrices: adminListTenantPrices,
  updatePrice: updateTenantPrice,
  deletePrice: deleteTenantPrice,
  
  createSubscription: createTenantSubscription,
  adminGetSubscription: adminGetTenantSubscription,
  adminListSubscriptions: adminListTenantSubscriptions,
  cancelSubscription: cancelTenantSubscription,
  
  adminListCoupons: adminListTenantCoupons,
  createCoupon: createTenantCoupon,
  adminGetCoupon: adminGetTenantCoupon,
  updateCoupon: updateTenantCoupon,
  deleteCoupon: deleteTenantCoupon,
  
  createInvoice: createTenantInvoice,
  adminListInvoices: adminListTenantInvoices,
  
  adminGetSubscriptionStats: adminGetTenantSubscriptionStats,
} = tenantSubscriptionAPI;
