import client from './client';

// 订单状态枚举
export type OrderStatus = 'pending' | 'paid' | 'expired' | 'cancelled';

// 创建订单请求
export interface CreateOrderRequest {
  user_id: number;
  price_id: number;
  quantity?: number;
  coupon_code?: string;
}

// 订单响应
export interface OrderResponse {
  id: number;
  order_number: string;
  user_id: number;
  price_id: number;
  coupon_id?: number;
  status: OrderStatus;
  quantity: number;
  base_amount: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  description: string;
  expires_at: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
  
  // 关联数据
  price?: {
    id: number;
    amount_cents: number;
    currency: string;
    billing_interval: string;
    billing_interval_count: number;
    plan: {
      id: number;
      display_name: string;
      product: {
        id: number;
        name: string;
        description: string;
      };
    };
  };
  coupon?: {
    id: number;
    code: string;
    discount_type: string;
    discount_value: number;
  };
}

// 订单API类
export class OrderAPI {
  // 创建订单
  async createOrder(data: CreateOrderRequest): Promise<OrderResponse> {
    const response = await client.post('/api/v1/orders', data);
    return response.data.data;
  }

  // 获取订单详情
  async getOrder(orderId: number): Promise<OrderResponse> {
    const response = await client.get(`/api/v1/orders/${orderId}`);
    return response.data.data;
  }

  // 根据订单号获取订单
  async getOrderByNumber(orderNumber: string): Promise<OrderResponse> {
    const response = await client.get(`/api/v1/orders/number/${orderNumber}`);
    return response.data.data;
  }

  // 获取用户订单列表
  async listOrders(limit?: number): Promise<OrderResponse[]> {
    const params = limit ? { limit } : {};
    const response = await client.get('/api/v1/orders', { params });
    return response.data.data;
  }
}

// 导出API实例
export const orderAPI = new OrderAPI();

// 导出便捷函数
export const createOrder = (data: CreateOrderRequest) => orderAPI.createOrder(data);
export const getOrder = (orderId: number) => orderAPI.getOrder(orderId);
export const getOrderByNumber = (orderNumber: string) => orderAPI.getOrderByNumber(orderNumber);
export const listOrders = (limit?: number) => orderAPI.listOrders(limit); 