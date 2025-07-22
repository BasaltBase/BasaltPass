import client from './client';

const API_BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:8080';

export interface PaymentIntent {
  id: number;
  stripe_payment_intent_id: string;
  user_id: number;
  amount: number;
  currency: string;
  status: string;
  description: string;
  metadata: string;
  payment_method_types: string;
  client_secret: string;
  confirmation_method: string;
  capture_method: string;
  setup_future_usage: string;
  last_payment_error: string;
  next_action: string;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentSession {
  id: number;
  stripe_session_id: string;
  payment_intent_id: number;
  user_id: number;
  status: string;
  currency: string;
  amount: number;
  success_url: string;
  cancel_url: string;
  payment_url: string;
  customer_email: string;
  expires_at: string;
  completed_at: string | null;
  metadata: string;
  created_at: string;
  updated_at: string;
  payment_intent?: PaymentIntent;
}

export interface CreatePaymentIntentRequest {
  amount: number;
  currency: string;
  description?: string;
  payment_method_types?: string[];
  confirmation_method?: string;
  capture_method?: string;
  setup_future_usage?: string;
  metadata?: Record<string, any>;
}

export interface CreatePaymentSessionRequest {
  payment_intent_id: number;
  success_url: string;
  cancel_url: string;
  customer_email?: string;
}

export interface MockStripeResponse {
  request_url: string;
  request_method: string;
  request_headers: Record<string, string>;
  request_body: any;
  response: any;
  timestamp: string;
}

export interface CreatePaymentIntentResponse {
  payment_intent: PaymentIntent;
  stripe_mock_response: MockStripeResponse;
}

export interface CreatePaymentSessionResponse {
  session: PaymentSession;
  stripe_mock_response: MockStripeResponse;
}

export interface SimulatePaymentResponse {
  message: string;
  success: boolean;
  stripe_mock_response: MockStripeResponse;
}

export interface ListPaymentIntentsResponse {
  payment_intents: PaymentIntent[];
  count: number;
}

class PaymentAPI {
  // 创建支付意图
  async createPaymentIntent(data: CreatePaymentIntentRequest): Promise<CreatePaymentIntentResponse> {
    const response = await client.post('/api/v1/payment/intents', data);
    return response.data;
  }

  // 创建支付会话
  async createPaymentSession(data: CreatePaymentSessionRequest): Promise<CreatePaymentSessionResponse> {
    const response = await client.post('/api/v1/payment/sessions', data);
    return response.data;
  }

  // 获取支付意图
  async getPaymentIntent(id: number): Promise<PaymentIntent> {
    const response = await client.get(`/api/v1/payment/intents/${id}`);
    return response.data;
  }

  // 获取支付会话
  async getPaymentSession(sessionId: string): Promise<PaymentSession> {
    const response = await client.get(`/api/v1/payment/sessions/${sessionId}`);
    return response.data;
  }

  // 获取支付意图列表
  async listPaymentIntents(limit?: number): Promise<ListPaymentIntentsResponse> {
    const params: any = {};
    if (limit) {
      params.limit = limit;
    }

    const response = await client.get('/api/v1/payment/intents', { params });
    return response.data;
  }

  // 模拟支付
  async simulatePayment(sessionId: string, success: boolean = true): Promise<SimulatePaymentResponse> {
    const response = await client.post(`/api/v1/payment/simulate/${sessionId}`, { success });
    return response.data;
  }

  // 获取支付页面URL
  getPaymentCheckoutUrl(sessionId: string): string {
    return `/payment/checkout/${sessionId}`;
  }
}

export const paymentAPI = new PaymentAPI(); 