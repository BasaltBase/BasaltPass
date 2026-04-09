import client from '../client';

// translated
export interface Product {
  id: number;
  code: string;
  name: string;
  description: string;
  metadata: Record<string, any>;
  effective_at: string;
  deprecated_at: string | null;
  created_at: string;
  updated_at: string;
  plans: Plan[];
}

export interface Plan {
  id: number;
  product_id: number;
  code: string;
  display_name: string;
  plan_version: number;
  metadata: Record<string, any>;
  effective_at: string;
  deprecated_at: string | null;
  created_at: string;
  updated_at: string;
  features: PlanFeature[];
  prices: Price[];
}

export interface PlanFeature {
  id: number;
  plan_id: number;
  feature_key: string;
  feature_value: string;
  feature_type: string;
  created_at: string;
  updated_at: string;
}

export interface Price {
  id: number;
  plan_id: number;
  currency: string;
  amount_cents: number;
  billing_period: string;
  billing_interval: number;
  trial_days: number | null;
  metadata: Record<string, any>;
  effective_at: string;
  deprecated_at: string | null;
  created_at: string;
  updated_at: string;
  plan: Plan;
}

export interface Coupon {
  id: number;
  code: string;
  name: string;
  discount_type: string;
  discount_value: number;
  duration: string;
  duration_in_cycles: number | null;
  max_redemptions: number | null;
  redeemed_count: number;
  expires_at: string | null;
  is_active: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// subscriptiontranslated
export interface Subscription {
  id: number;
  user_id: number;
  status: string;
  current_price_id: number;
  next_price_id: number | null;
  coupon_id: number | null;
  start_at: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at: string | null;
  canceled_at: string | null;
  gateway_subscription_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  current_price?: Price;
  next_price?: Price;
  coupon?: Coupon;
}

// Checkouttranslated
export interface CheckoutRequest {
  user_id: number;
  price_id: number;
  quantity?: number;
  coupon_code?: string;
  success_url: string;
  cancel_url: string;
}

export interface QuickCheckoutRequest {
  price_id: number;
  quantity?: number;
  coupon_code?: string;
}

export interface CheckoutResponse {
  subscription: Subscription;
  invoice: any;
  payment: any;
  payment_session: any;
  stripe_response: any;
}

// APItranslated
class SubscriptionAPI {
  // gettranslatedlist
  async getProducts() {
    const response = await client.get('/api/v1/products');
    return response.data;
  }

  // gettranslateddetails
  async getProduct(id: number) {
    const response = await client.get(`/api/v1/products/${id}`);
    return response.data;
  }

  // gettranslatedlist
  async getPlans() {
    const response = await client.get('/api/v1/plans');
    return response.data;
  }

  // gettranslateddetails
  async getPlan(id: number) {
    const response = await client.get(`/api/v1/plans/${id}`);
    return response.data;
  }

  // gettranslateddetails
  async getPrice(id: number) {
    const response = await client.get(`/api/v1/prices/${id}`);
    return response.data;
  }

  // translated
  async validateCoupon(code: string) {
    const response = await client.get(`/api/v1/coupons/${code}/validate`);
    return response.data;
  }

  // getusersubscriptionlist
  async getSubscriptions() {
    const response = await client.get('/api/v1/subscriptions');
    return response.data;
  }

  // getsubscriptiondetails
  async getSubscription(id: number) {
    const response = await client.get(`/api/v1/subscriptions/${id}`);
    return response.data;
  }

  // cancelsubscription
  async cancelSubscription(id: number, reason?: string) {
    const response = await client.put(`/api/v1/subscriptions/${id}/cancel`, {
      reason
    });
    return response.data;
  }

  // createsubscriptiontranslated
  async createCheckout(data: CheckoutRequest): Promise<CheckoutResponse> {
    const response = await client.post('/api/v1/subscriptions/checkout', data);
    return response.data.data;
  }

  // translated
  async quickCheckout(data: QuickCheckoutRequest): Promise<CheckoutResponse> {
    const response = await client.post('/api/v1/subscriptions/quick-checkout', data);
    return response.data.data;
  }

  // translated（translated）
  formatAmount(amountCents: number): string {
    return (amountCents / 100).toFixed(2);
  }

  // translated
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

  // translatedsubscriptionstatus
  formatSubscriptionStatus(status: string): { text: string; color: string } {
    const statusMap: Record<string, { text: string; color: string }> = {
      pending: { text: 'translatedpayment', color: 'orange' },
      trialing: { text: 'translated', color: 'blue' },
      active: { text: 'alreadytranslated', color: 'green' },
      paused: { text: 'alreadytranslated', color: 'gray' },
      canceled: { text: 'alreadycancel', color: 'red' },
      overdue: { text: 'translated', color: 'red' }
    };

    return statusMap[status] || { text: status, color: 'gray' };
  }

  // getpaymenttranslatedURL
  getPaymentCheckoutUrl(sessionId: string): string {
  return `/api/v1/payment/checkout/${sessionId}`;
  }

  // managementtranslatedAPI
  
  // managementtranslated - gettranslatedlist
  async adminListProducts(params?: { tenant_id?: number; page?: number; page_size?: number; code?: string; is_active?: boolean; }) {
    const response = await client.get('/api/v1/admin/products', { params });
    return response.data;
  }

  // managementtranslated - createtranslated
  async adminCreateProduct(data: any) {
    const response = await client.post('/api/v1/admin/products', data);
    return response.data;
  }

  // managementtranslated - updatetranslated
  async adminUpdateProduct(id: number, data: any) {
    const response = await client.put(`/api/v1/admin/products/${id}`, data);
    return response.data;
  }

  // managementtranslated - deletetranslated
  async adminDeleteProduct(id: number) {
    const response = await client.delete(`/api/v1/admin/products/${id}`);
    return response.data;
  }

  // managementtranslated - gettranslatedlist  
  async adminListPlans(params?: { tenant_id?: number; page?: number; page_size?: number; product_id?: number; code?: string; is_active?: boolean; }) {
    const response = await client.get('/api/v1/admin/plans', { params });
    return response.data;
  }

  // managementtranslated - createtranslated
  async adminCreatePlan(data: any) {
    const response = await client.post('/api/v1/admin/plans', data);
    return response.data;
  }

  // managementtranslated - updatetranslated
  async adminUpdatePlan(id: number, data: any) {
    const response = await client.put(`/api/v1/admin/plans/${id}`, data);
    return response.data;
  }

  // managementtranslated - deletetranslated
  async adminDeletePlan(id: number) {
    const response = await client.delete(`/api/v1/admin/plans/${id}`);
    return response.data;
  }

  // managementtranslated - gettranslatedlist
  async adminListPrices(params?: { tenant_id?: number; page?: number; page_size?: number; plan_id?: number; currency?: string; usage_type?: string; is_active?: boolean; }) {
    const response = await client.get('/api/v1/admin/prices', { params });
    return response.data;
  }

  // managementtranslated - createtranslated
  async adminCreatePrice(data: any) {
    const response = await client.post('/api/v1/admin/prices', data);
    return response.data;
  }

  // managementtranslated - updatetranslated
  async adminUpdatePrice(id: number, data: any) {
    const response = await client.put(`/api/v1/admin/prices/${id}`, data);
    return response.data;
  }

  // managementtranslated - deletetranslated
  async adminDeletePrice(id: number) {
    const response = await client.delete(`/api/v1/admin/prices/${id}`);
    return response.data;
  }

  // managementtranslated - gettranslatedlist
  async adminListCoupons() {
    const response = await client.get('/api/v1/admin/coupons');
    return response.data;
  }

  // tenant - gettranslatedlist
  async tenantListCoupons() {
    const response = await client.get('/api/v1/tenant/subscription/coupons');
    return response.data;
  }

  // managementtranslated - createtranslated
  async adminCreateCoupon(data: any) {
    const response = await client.post('/api/v1/admin/coupons', data);
    return response.data;
  }

  // tenant - createtranslated
  async tenantCreateCoupon(data: any) {
    const response = await client.post('/api/v1/tenant/subscription/coupons', data);
    return response.data;
  }

  // managementtranslated - updatetranslated
  async adminUpdateCoupon(code: string, data: any) {
    const response = await client.put(`/api/v1/admin/coupons/${code}`, data);
    return response.data;
  }

  // tenant - updatetranslated
  async tenantUpdateCoupon(code: string, data: any) {
    const response = await client.put(`/api/v1/tenant/subscription/coupons/${code}`, data);
    return response.data;
  }

  // managementtranslated - deletetranslated
  async adminDeleteCoupon(code: string) {
    const response = await client.delete(`/api/v1/admin/coupons/${code}`);
    return response.data;
  }

  // tenant - deletetranslated
  async tenantDeleteCoupon(code: string) {
    const response = await client.delete(`/api/v1/tenant/subscription/coupons/${code}`);
    return response.data;
  }

  // managementtranslated - getsubscriptionlist
  async adminListSubscriptions(params?: { tenant_id?: number; page?: number; page_size?: number; user_id?: number; status?: string; price_id?: number; }) {
    const response = await client.get('/api/v1/admin/subscriptions', { params });
    return response.data;
  }

  // managementtranslated - getsubscriptiondetails
  async adminGetSubscription(id: number) {
    const response = await client.get(`/api/v1/admin/subscriptions/${id}`);
    return response.data;
  }

  // tenant - getsubscriptiondetails
  async tenantGetSubscription(id: number) {
    const response = await client.get(`/api/v1/tenant/subscription/${id}`);
    return response.data;
  }
  
  // managementtranslated - cancelsubscription
  async adminCancelSubscription(id: number, reason?: string) {
    const response = await client.put(`/api/v1/admin/subscriptions/${id}/cancel`, {
      reason
    });
    return response.data;
  }
}

export const subscriptionAPI = new SubscriptionAPI();

// translatedmanagementtranslatedAPItranslated
export const adminListProducts = (params?: { tenant_id?: number; page?: number; page_size?: number; code?: string; is_active?: boolean; }) => subscriptionAPI.adminListProducts(params);
export const adminCreateProduct = (data: any) => subscriptionAPI.adminCreateProduct(data);
export const adminUpdateProduct = (id: number, data: any) => subscriptionAPI.adminUpdateProduct(id, data);
export const adminDeleteProduct = (id: number) => subscriptionAPI.adminDeleteProduct(id);
export const adminListPlans = (params?: { tenant_id?: number; page?: number; page_size?: number; product_id?: number; code?: string; is_active?: boolean; }) => subscriptionAPI.adminListPlans(params);
export const adminCreatePlan = (data: any) => subscriptionAPI.adminCreatePlan(data);
export const adminUpdatePlan = (id: number, data: any) => subscriptionAPI.adminUpdatePlan(id, data);
export const adminDeletePlan = (id: number) => subscriptionAPI.adminDeletePlan(id);
export const adminListPrices = (params?: { tenant_id?: number; page?: number; page_size?: number; plan_id?: number; currency?: string; usage_type?: string; is_active?: boolean; }) => subscriptionAPI.adminListPrices(params);
export const adminCreatePrice = (data: any) => subscriptionAPI.adminCreatePrice(data);
export const adminUpdatePrice = (id: number, data: any) => subscriptionAPI.adminUpdatePrice(id, data);
export const adminDeletePrice = (id: number) => subscriptionAPI.adminDeletePrice(id);
export const adminListCoupons = () => subscriptionAPI.adminListCoupons();
export const adminCreateCoupon = (data: any) => subscriptionAPI.adminCreateCoupon(data);
export const adminUpdateCoupon = (code: string, data: any) => subscriptionAPI.adminUpdateCoupon(code, data);
export const adminDeleteCoupon = (code: string) => subscriptionAPI.adminDeleteCoupon(code);

// translatedusersubscriptiontranslated
export const listProducts = () => subscriptionAPI.getProducts();
export const listSubscriptions = () => subscriptionAPI.getSubscriptions();
export const getSubscription = (id: number) => subscriptionAPI.getSubscription(id);
export const cancelSubscription = (id: number, reason?: string) => subscriptionAPI.cancelSubscription(id, reason);

// translatedmanagementtranslatedsubscriptiontranslated
export const adminListSubscriptions = (params?: { tenant_id?: number; page?: number; page_size?: number; user_id?: number; status?: string; price_id?: number; }) => subscriptionAPI.adminListSubscriptions(params);
export const adminGetSubscription = (id: number) => subscriptionAPI.adminGetSubscription(id);
export const adminCancelSubscription = (id: number, reason?: string) => subscriptionAPI.adminCancelSubscription(id, reason);