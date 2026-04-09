import client from '../client';

// tenantsubscriptionmanagementAPI

// ==================== translatedmanagement ====================

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

// ==================== translatedmanagement ====================

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

// ==================== translatedmanagement ====================

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

// ==================== subscriptionmanagement ====================

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
  User?: any; // userinfo，translated
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

// ==================== translatedmanagement ====================

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

// ==================== translatedmanagement ====================

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

// ==================== translatedinfo ====================

export interface TenantSubscriptionStats {
  total_subscriptions: number;
  active_subscriptions: number;
  canceled_subscriptions: number;
  paused_subscriptions: number;
  total_users: number;
  monthly_revenue_cents: number;
}

// ==================== API translated ====================

class TenantSubscriptionAPI {
  // ========== translatedmanagement ==========

  // tenantmanagementtranslated：createtranslated
  async createProduct(data: CreateTenantProductRequest): Promise<TenantProduct> {
    const response = await client.post('/api/v1/tenant/subscription/products', data);
    return response.data.data;
  }

  // gettranslateddetails（managementtranslatedortranslateduser）
  async getProduct(id: number): Promise<TenantProduct> {
    const response = await client.get(`/api/v1/tenant/subscription/products/${id}`);
    return response.data.data;
  }

  // tenantmanagementtranslated：gettranslateddetails
  async adminGetProduct(id: number): Promise<TenantProduct> {
    const response = await client.get(`/api/v1/tenant/subscription/products/${id}`);
    return response.data.data;
  }

  // translated（managementtranslatedortranslateduser）
  async listProducts(params?: {
    page?: number;
    page_size?: number;
    code?: string;
  }) {
    const response = await client.get('/api/v1/tenant/subscription/products', { params });
    return response.data;
  }

  // tenantmanagementtranslated：translated
  async adminListProducts(params?: {
    page?: number;
    page_size?: number;
    code?: string;
  }) {
    const response = await client.get('/api/v1/tenant/subscription/products', { params });
    return response.data;
  }

  // tenantmanagementtranslated：updatetranslated
  async updateProduct(id: number, data: UpdateTenantProductRequest): Promise<TenantProduct> {
    const response = await client.put(`/api/v1/tenant/subscription/products/${id}`, data);
    return response.data.data;
  }

  // tenantmanagementtranslated：deletetranslated
  async deleteProduct(id: number): Promise<void> {
    await client.delete(`/api/v1/tenant/subscription/products/${id}`);
  }

  // ========== translatedmanagement ==========

  // tenantmanagementtranslated：createtranslated
  async createPlan(data: CreateTenantPlanRequest): Promise<TenantPlan> {
    const response = await client.post('/api/v1/tenant/subscription/plans', data);
    return response.data.data;
  }

  // gettranslateddetails（managementtranslatedortranslateduser）
  async getPlan(id: number): Promise<TenantPlan> {
    const response = await client.get(`/api/v1/tenant/subscription/plans/${id}`);
    return response.data.data;
  }

  // tenantmanagementtranslated：gettranslateddetails
  async adminGetPlan(id: number): Promise<TenantPlan> {
    const response = await client.get(`/api/v1/tenant/subscription/plans/${id}`);
    return response.data.data;
  }

  // translated（managementtranslatedortranslateduser）
  async listPlans(params?: {
    page?: number;
    page_size?: number;
    product_id?: number;
    code?: string;
  }) {
    const response = await client.get('/api/v1/tenant/subscription/plans', { params });
    return response.data;
  }

  // tenantmanagementtranslated：translated
  async adminListPlans(params?: {
    page?: number;
    page_size?: number;
    product_id?: number;
    code?: string;
  }) {
    const response = await client.get('/api/v1/tenant/subscription/plans', { params });
    return response.data;
  }

  // tenantmanagementtranslated：updatetranslated
  async updatePlan(id: number, data: UpdateTenantPlanRequest): Promise<TenantPlan> {
    const response = await client.put(`/api/v1/tenant/subscription/plans/${id}`, data);
    return response.data.data;
  }

  // tenantmanagementtranslated：deletetranslated
  async deletePlan(id: number): Promise<void> {
    await client.delete(`/api/v1/tenant/subscription/plans/${id}`);
  }

  // ========== translatedmanagement ==========

  // tenantmanagementtranslated：createtranslated
  async createPrice(data: CreateTenantPriceRequest): Promise<TenantPrice> {
    const response = await client.post('/api/v1/tenant/subscription/prices', data);
    return response.data.data;
  }

  // gettranslateddetails（managementtranslatedortranslateduser）
  async getPrice(id: number): Promise<TenantPrice> {
    const response = await client.get(`/api/v1/tenant/subscription/prices/${id}`);
    return response.data.data;
  }

  // tenantmanagementtranslated：gettranslateddetails
  async adminGetPrice(id: number): Promise<TenantPrice> {
    const response = await client.get(`/api/v1/tenant/subscription/prices/${id}`);
    return response.data.data;
  }

  // translated（managementtranslatedortranslateduser）
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

  // tenantmanagementtranslated：translated
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

  // tenantmanagementtranslated：updatetranslated
  async updatePrice(id: number, data: UpdateTenantPriceRequest): Promise<TenantPrice> {
    const response = await client.put(`/api/v1/tenant/subscription/prices/${id}`, data);
    return response.data.data;
  }

  // tenantmanagementtranslated：deletetranslated
  async deletePrice(id: number): Promise<void> {
    await client.delete(`/api/v1/tenant/subscription/prices/${id}`);
  }

  // ========== subscriptionmanagement ==========

  // tenantmanagementtranslated：createsubscription
  async createSubscription(data: CreateTenantSubscriptionRequest): Promise<Subscription> {
    const response = await client.post('/api/v1/tenant/subscription/subscriptions', data);
    return response.data.data;
  }

  // getsubscriptiondetails（managementtranslatedortranslateduser）
  async getSubscription(id: number): Promise<Subscription> {
    const response = await client.get(`/api/v1/tenant/subscription/subscriptions/${id}`);
    return response.data.data;
  }

  // tenantmanagementtranslated：getsubscriptiondetails
  async adminGetSubscription(id: number): Promise<Subscription> {
    const response = await client.get(`/api/v1/tenant/subscription/subscriptions/${id}`);
    return response.data.data;
  }

  // translatedsubscription（managementtranslatedortranslateduser）
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

  // tenantmanagementtranslated：translatedsubscription
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

  // tenantmanagementtranslated：cancelsubscription
  async cancelSubscription(id: number, data?: CancelTenantSubscriptionRequest): Promise<void> {
    await client.post(`/api/v1/tenant/subscription/subscriptions/${id}/cancel`, data || {});
  }

  // ========== translatedmanagement ==========

  // translated（managementtranslatedortranslateduser）
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

  // tenantmanagementtranslated：translated
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

  // tenantmanagementtranslated：createtranslated
  async createCoupon(data: CreateTenantCouponRequest): Promise<TenantCoupon> {
    const response = await client.post('/api/v1/tenant/subscription/coupons', data);
    return response.data.data;
  }

  // gettranslateddetails（managementtranslatedortranslateduser）
  async getCoupon(code: string): Promise<TenantCoupon> {
    const response = await client.get(`/api/v1/tenant/subscription/coupons/${code}`);
    return response.data.data;
  }

  // tenantmanagementtranslated：gettranslateddetails
  async adminGetCoupon(code: string): Promise<TenantCoupon> {
    const response = await client.get(`/api/v1/tenant/subscription/coupons/${code}`);
    return response.data.data;
  }

  // tenantmanagementtranslated：updatetranslated
  async updateCoupon(code: string, data: UpdateTenantCouponRequest): Promise<TenantCoupon> {
    const response = await client.put(`/api/v1/tenant/subscription/coupons/${code}`, data);
    return response.data.data;
  }

  // tenantmanagementtranslated：deletetranslated
  async deleteCoupon(code: string): Promise<void> {
    await client.delete(`/api/v1/tenant/subscription/coupons/${code}`);
  }

  // translated（managementtranslatedortranslateduser）
  async validateCoupon(code: string): Promise<{ valid: boolean; data?: TenantCoupon; error?: string }> {
    const response = await client.get(`/api/v1/tenant/subscription/coupons/${code}/validate`);
    return response.data;
  }

  // ========== translatedmanagement ==========

  // tenantmanagementtranslated：createtranslated
  async createInvoice(data: CreateTenantInvoiceRequest): Promise<TenantInvoice> {
    const response = await client.post('/api/v1/tenant/subscription/invoices', data);
    return response.data.data;
  }

  // translated（managementtranslatedortranslateduser）
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

  // tenantmanagementtranslated：translated
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

  // ========== translatedinfo ==========

  // getsubscriptiontranslated（managementtranslatedortranslateduser）
  async getSubscriptionStats(): Promise<TenantSubscriptionStats> {
    const response = await client.get('/api/v1/tenant/subscription/stats');
    return response.data.data;
  }

  // tenantmanagementtranslated：getsubscriptiontranslated
  async adminGetSubscriptionStats(): Promise<TenantSubscriptionStats> {
    const response = await client.get('/api/v1/tenant/subscription/stats');
    return response.data.data;
  }

  // ========== tenantusersubscriptiontranslated（translatedmanagementtranslatedpermission） ==========

  // tenantuser：gettenanttranslatedhassubscriptionlist
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

  // tenantuser：getsubscriptiondetails
  async getTenantSubscription(id: number): Promise<Subscription> {
    const response = await client.get(`/api/v1/tenant/subscriptions/${id}`);
    return response.data.data;
  }

  // ========== translated ==========

  formatPrice(amountCents: number, currency: string): string {
    const amount = amountCents / 100;
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  }

  formatBillingPeriod(period: string, interval: number): string {
    const periodMap: Record<string, string> = {
      day: 'translated',
      week: 'translated',
      month: 'translated',
      year: 'translated'
    };

    const periodText = periodMap[period] || period;
    return interval === 1 ? `translated${periodText}` : `translated${interval}${periodText}`;
  }

  formatSubscriptionStatus(status: string): { text: string; color: string } {
    const statusMap: Record<string, { text: string; color: string }> = {
      active: { text: 'translated', color: 'green' },
      canceled: { text: 'alreadycancel', color: 'red' },
      paused: { text: 'alreadytranslated', color: 'yellow' },
      past_due: { text: 'translated', color: 'orange' },
      unpaid: { text: 'notpayment', color: 'red' },
    };

    return statusMap[status] || { text: status, color: 'gray' };
  }

  formatInvoiceStatus(status: string): { text: string; color: string } {
    const statusMap: Record<string, { text: string; color: string }> = {
      draft: { text: 'translated', color: 'gray' },
      posted: { text: 'alreadytranslated', color: 'blue' },
      paid: { text: 'alreadypayment', color: 'green' },
      void: { text: 'alreadytranslated', color: 'red' },
      uncollectible: { text: 'nonetranslated', color: 'orange' },
    };

    return statusMap[status] || { text: status, color: 'gray' };
  }
}

// translatedAPItranslated
export const tenantSubscriptionAPI = new TenantSubscriptionAPI();

// translatedtenantusertranslated（translated）
export const {
  getProduct: getTenantProduct,
  listProducts: listTenantProducts,
  
  getPlan: getTenantPlan,
  listPlans: listTenantPlans,
  
  getPrice: getTenantPrice,
  listPrices: listTenantPrices,
  
  getSubscription: getTenantSubscription,
  listSubscriptions: listTenantSubscriptions,
  listTenantSubscriptions: listTenantUserSubscriptions, // translated：translatedtenantusertranslatedsubscriptionlist
  getTenantSubscription: getTenantUserSubscription, // translated：translatedtenantusertranslatedsubscriptiondetails
  
  listCoupons: listTenantCoupons,
  getCoupon: getTenantCoupon,
  validateCoupon: validateTenantCoupon,
  
  listInvoices: listTenantInvoices,
  
  getSubscriptionStats: getTenantSubscriptionStats,
} = tenantSubscriptionAPI;

// translatedtenantmanagementtranslated（translatedCRUD）
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
