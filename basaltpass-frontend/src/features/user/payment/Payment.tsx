import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import { useNavigate } from 'react-router-dom';
import { paymentAPI, CreatePaymentIntentRequest, PaymentIntent, MockStripeResponse } from '@api/subscription/payment/payment';
import { getBalance } from '@api/user/wallet';
import { PSelect, PInput, PButton, PAlert } from '@ui';
import { ROUTES } from '@constants';

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
      uiAlert('请输入有效的金额');
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
      
      uiAlert('支付意图创建成功！');
    } catch (error: any) {
      uiAlert('创建失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePaymentSession = async () => {
    if (!paymentIntent) {
      uiAlert('请先创建支付意图');
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
      uiAlert('支付会话创建成功！即将跳转到支付页面...');
      
      // 跳转到支付页面
      window.open(paymentAPI.getPaymentCheckoutUrl(response.session.StripeSessionID), '_blank');
      
    } catch (error: any) {
      uiAlert('创建支付会话失败: ' + error.message);
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
        <PAlert variant="info" title="当前余额">
          <p className="text-2xl font-bold">{formatAmount(balance)} {currency}</p>
        </PAlert>

        {/* 创建支付意图表单 */}
        <form onSubmit={handleCreatePaymentIntent} className="space-y-4 mb-6">
          <div>
            <PInput
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              min="0.01"
              label="充值金额"
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
            <PInput
              type="text"
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              label="备注（可选）"
              placeholder="请输入备注信息"
            />
          </div>

          <PButton
            type="submit"
            disabled={!amount}
            loading={loading}
            fullWidth
          >
            创建支付意图
          </PButton>
        </form>

        {/* 支付意图信息 */}
        {paymentIntent && (
          <PAlert variant="success" title="支付意图已创建">
            <div className="space-y-2 text-sm mb-4">
              <p><strong>ID:</strong> {paymentIntent.StripePaymentIntentID}</p>
              <p><strong>金额:</strong> {formatAmount(paymentIntent.Amount)} {paymentIntent.Currency}</p>
              <p><strong>状态:</strong> <span className="text-orange-600">{paymentIntent.Status}</span></p>
              <p><strong>描述:</strong> {paymentIntent.Description}</p>
              <p><strong>创建时间:</strong> {new Date(paymentIntent.CreatedAt).toLocaleString()}</p>
            </div>
            <PButton
              onClick={handleCreatePaymentSession}
              loading={loading}
            >
              创建支付会话
            </PButton>
          </PAlert>
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
          <PButton
            variant="ghost"
            onClick={() => navigate(ROUTES.user.wallet)}
          >
            ← 返回钱包
          </PButton>
        </div>
      </div>
    </div>
  );
};

export default Payment; 