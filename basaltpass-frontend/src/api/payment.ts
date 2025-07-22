import client from './client';

const API_BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:8080';

export interface PaymentIntent {
  ID: number;
  CreatedAt: string;
  UpdatedAt: string;
  DeletedAt: string | null;
  StripePaymentIntentID: string;
  UserID: number;
  Amount: number;
  Currency: string;
  Status: string;
  Description: string;
  Metadata: string;
  PaymentMethodTypes: string;
  ClientSecret: string;
  ConfirmationMethod: string;
  CaptureMethod: string;
  SetupFutureUsage: string;
  LastPaymentError: string;
  NextAction: string;
  ProcessedAt: string | null;
}

export interface PaymentSession {
  ID: number;
  CreatedAt: string;
  UpdatedAt: string;
  DeletedAt: string | null;
  StripeSessionID: string;
  PaymentIntentID: number;
  UserID: number;
  Status: string;
  Currency: string;
  Amount: number;
  SuccessURL: string;
  CancelURL: string;
  PaymentURL: string;
  CustomerEmail: string;
  ExpiresAt: string;
  CompletedAt: string | null;
  Metadata: string;
  PaymentIntent?: PaymentIntent;
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