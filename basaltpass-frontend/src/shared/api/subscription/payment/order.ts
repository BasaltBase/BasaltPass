import client from '../../client';

// orderstatustranslated
export type OrderStatus = 'pending' | 'paid' | 'expired' | 'cancelled';

// createorderrequest
export interface CreateOrderRequest {
  user_id: number;
  price_id: number;
  quantity?: number;
  coupon_code?: string;
}

// orderresponse
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
  
  // translated
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

// orderAPItranslated
export class OrderAPI {
  // createorder
  async createOrder(data: CreateOrderRequest): Promise<OrderResponse> {
    const response = await client.post('/api/v1/orders', data);
    return response.data.data;
  }

  // getorderdetails
  async getOrder(orderId: number, options?: { activate?: boolean }): Promise<OrderResponse> {
    const params = options?.activate ? { activate: 1 } : undefined;
    const response = await client.get(`/api/v1/orders/${orderId}`, { params });
    return response.data.data;
  }

  // translatedordertranslatedgetorder
  async getOrderByNumber(orderNumber: string): Promise<OrderResponse> {
    const response = await client.get(`/api/v1/orders/number/${orderNumber}`);
    return response.data.data;
  }

  // getuserorderlist
  async listOrders(limit?: number): Promise<OrderResponse[]> {
    const params = limit ? { limit } : {};
    const response = await client.get('/api/v1/orders', { params });
    return response.data.data;
  }
}

// translatedAPItranslated
export const orderAPI = new OrderAPI();

// translated
export const createOrder = (data: CreateOrderRequest) => orderAPI.createOrder(data);
export const getOrder = (orderId: number, options?: { activate?: boolean }) => orderAPI.getOrder(orderId, options);
export const getOrderByNumber = (orderNumber: string) => orderAPI.getOrderByNumber(orderNumber);
export const listOrders = (limit?: number) => orderAPI.listOrders(limit); 