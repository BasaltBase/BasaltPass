import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentAPI, CreatePaymentIntentRequest, PaymentIntent, MockStripeResponse } from '@api/subscription/payment/payment';
import { getBalance } from '@api/user/wallet';
import { PSelect } from '../../../components';

const Payment: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState('USD');
  const [description, setDescription] = useState('');
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null);
  const [stripeResponse, setStripeResponse] = useState<MockStripeResponse | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const navigate = useNavigate();

  useEffect(() => {
    loadBalance();
  }, [currency]);

  const loadBalance = async () => {
    try {
      const response = await getBalance(currency);
      setBalance(response.data.balance);
    } catch (error) {
      console.error('获取余额失败:', error);
    }
  };

  const handleCreatePaymentIntent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      alert('请输入有效的金额');
      return;
    }

    setLoading(true);
    try {
      const amountInCents = Math.round(parseFloat(amount) * 100); // 转换为分
      
      const request: CreatePaymentIntentRequest = {
        amount: amountInCents,
        currency,
        description: description || `钱包充值 ${amount} ${currency}`,
        payment_method_types: ['card'],
        confirmation_method: 'automatic',
        capture_method: 'automatic',
        metadata: {
          source: 'wallet_recharge',
          user_action: 'recharge'
        }
      };

      const response = await paymentAPI.createPaymentIntent(request);
      setPaymentIntent(response.payment_intent);
      setStripeResponse(response.stripe_mock_response);
      
      alert('支付意图创建成功！');
    } catch (error: any) {
      alert('创建失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePaymentSession = async () => {
    if (!paymentIntent) {
      alert('请先创建支付意图');
      return;
    }

    setLoading(true);
    try {
      const sessionRequest = {
        payment_intent_id: paymentIntent.ID,
        success_url: `${window.location.origin}/wallet?payment=success`,
        cancel_url: `${window.location.origin}/payment?payment=canceled`,
        user_email: ''
      };

      const response = await paymentAPI.createPaymentSession(sessionRequest);
      
      // 显示Stripe模拟响应
      alert('支付会话创建成功！即将跳转到支付页面...');
      
      // 跳转到支付页面
      window.open(paymentAPI.getPaymentCheckoutUrl(response.session.StripeSessionID), '_blank');
      
    } catch (error: any) {
      alert('创建支付会话失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number): string => {
    return (amount / 100).toFixed(2);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">钱包充值</h1>
        
        {/* 当前余额 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">当前余额</h2>
          <p className="text-2xl font-bold text-blue-600">
            {formatAmount(balance)} {currency}
          </p>
        </div>

        {/* 创建支付意图表单 */}
        <form onSubmit={handleCreatePaymentIntent} className="space-y-4 mb-6">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              充值金额
            </label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              min="0.01"
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="请输入充值金额"
              required
            />
          </div>

          <div>
            <PSelect
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              label="币种"
            >
              <option value="USD">USD - 美元</option>
              <option value="CNY">CNY - 人民币</option>
              <option value="EUR">EUR - 欧元</option>
            </PSelect>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              备注（可选）
            </label>
            <input
              type="text"
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="请输入备注信息"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !amount}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '创建中...' : '创建支付意图'}
          </button>
        </form>

        {/* 支付意图信息 */}
        {paymentIntent && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-green-900 mb-2">支付意图已创建</h3>
            <div className="space-y-2 text-sm">
              <p><strong>ID:</strong> {paymentIntent.StripePaymentIntentID}</p>
              <p><strong>金额:</strong> {formatAmount(paymentIntent.Amount)} {paymentIntent.Currency}</p>
              <p><strong>状态:</strong> <span className="text-orange-600">{paymentIntent.Status}</span></p>
              <p><strong>描述:</strong> {paymentIntent.Description}</p>
              <p><strong>创建时间:</strong> {new Date(paymentIntent.CreatedAt).toLocaleString()}</p>
            </div>
            
            <button
              onClick={handleCreatePaymentSession}
              disabled={loading}
              className="mt-4 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '创建中...' : '创建支付会话'}
            </button>
          </div>
        )}

        {/* Stripe模拟响应 */}
        {stripeResponse && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              📋 Stripe API 模拟响应
            </h3>
            <div className="space-y-2 text-sm">
              <p><strong>请求URL:</strong> <code className="bg-gray-200 px-2 py-1 rounded">{stripeResponse.request_url}</code></p>
              <p><strong>请求方法:</strong> <span className="text-blue-600">{stripeResponse.request_method}</span></p>
              <p><strong>时间戳:</strong> {new Date(stripeResponse.timestamp).toLocaleString()}</p>
            </div>
            
            <details className="mt-4">
              <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                查看详细响应数据
              </summary>
              <pre className="mt-2 p-3 bg-gray-800 text-green-400 rounded text-xs overflow-x-auto">
                {JSON.stringify(stripeResponse, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* 返回按钮 */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={() => navigate('/wallet')}
            className="text-blue-600 hover:text-blue-800 transition-colors"
          >
            ← 返回钱包
          </button>
        </div>
      </div>
    </div>
  );
};

export default Payment; 