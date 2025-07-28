import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscriptionAPI, Product, Price, CheckoutResponse } from '../../../api/subscription';

const SubscriptionCheckout: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedPrice, setSelectedPrice] = useState<Price | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [couponCode, setCouponCode] = useState<string>('');
  const [couponValid, setCouponValid] = useState<boolean | null>(null);
  const [checkoutResponse, setCheckoutResponse] = useState<CheckoutResponse | null>(null);
  const [step, setStep] = useState<'select' | 'checkout' | 'success'>('select');
  const navigate = useNavigate();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await subscriptionAPI.getProducts();
      setProducts(response.data || []);
    } catch (error) {
      console.error('加载产品失败:', error);
    }
  };

  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponValid(null);
      return;
    }

    try {
      await subscriptionAPI.validateCoupon(couponCode);
      setCouponValid(true);
    } catch (error) {
      setCouponValid(false);
    }
  };

  const handleCheckout = async () => {
    if (!selectedPrice) {
      alert('请选择一个价格');
      return;
    }

    setLoading(true);
    try {
      const response = await subscriptionAPI.quickCheckout({
        price_id: selectedPrice.id,
        quantity: quantity,
        coupon_code: couponCode || undefined,
      });

      setCheckoutResponse(response);
      setStep('checkout');

      // 如果有支付会话，跳转到支付页面
      if (response.payment_session) {
        window.open(subscriptionAPI.getPaymentCheckoutUrl(response.payment_session.stripe_session_id), '_blank');
      } else {
        // 免费订阅，直接显示成功
        setStep('success');
      }

    } catch (error: any) {
      alert('创建订阅失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    if (!selectedPrice) return 0;
    
    const baseAmount = selectedPrice.amount_cents * quantity;
    // 这里可以添加优惠券折扣计算逻辑
    return baseAmount;
  };

  const formatAmount = (amountCents: number) => {
    return subscriptionAPI.formatAmount(amountCents);
  };

  const renderProductSelection = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">选择订阅套餐</h2>
      
      {products.map((product) => (
        <div key={product.id} className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{product.name}</h3>
          <p className="text-gray-600 mb-4">{product.description}</p>
          
          {product.plans?.map((plan) => (
            <div key={plan.id} className="mb-4">
              <h4 className="text-lg font-medium text-gray-800 mb-2">{plan.display_name}</h4>
              
              {/* 显示套餐功能 */}
              {plan.features && plan.features.length > 0 && (
                <div className="mb-3">
                  <h5 className="text-sm font-medium text-gray-700 mb-1">功能特性：</h5>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {plan.features.map((feature) => (
                      <li key={feature.id} className="flex items-center">
                        <span className="text-green-500 mr-2">✓</span>
                        {feature.feature_key}: {feature.feature_value}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* 显示价格选项 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plan.prices?.map((price) => (
                  <div
                    key={price.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedPrice?.id === price.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedPrice(price)}
                  >
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {formatAmount(price.amount_cents)} {price.currency}
                      </div>
                      <div className="text-sm text-gray-600">
                        {subscriptionAPI.formatBillingPeriod(price.billing_period, price.billing_interval)}
                      </div>
                      {price.trial_days && price.trial_days > 0 && (
                        <div className="text-sm text-green-600 mt-1">
                          {price.trial_days}天免费试用
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* 数量选择 */}
      {selectedPrice && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            数量
          </label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            className="w-24 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      )}

      {/* 优惠券 */}
      {selectedPrice && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            优惠券代码（可选）
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              onBlur={validateCoupon}
              className={`flex-1 p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                couponValid === false ? 'border-red-500' : 
                couponValid === true ? 'border-green-500' : 'border-gray-300'
              }`}
              placeholder="输入优惠券代码"
            />
            <button
              onClick={validateCoupon}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-blue-700"
            >
              验证
            </button>
          </div>
          {couponValid === false && (
            <p className="text-red-600 text-sm mt-1">优惠券无效或已过期</p>
          )}
          {couponValid === true && (
            <p className="text-green-600 text-sm mt-1">优惠券有效</p>
          )}
        </div>
      )}

      {/* 总计和结账按钮 */}
      {selectedPrice && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-medium text-gray-900">总计</span>
            <span className="text-2xl font-bold text-gray-900">
              {formatAmount(calculateTotal())} {selectedPrice.currency}
            </span>
          </div>
          
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '创建中...' : '创建订阅'}
          </button>
        </div>
      )}
    </div>
  );

  const renderCheckoutResult = () => (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">订阅创建成功</h2>
        
        {checkoutResponse && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">订阅信息</h3>
              <div className="space-y-2 text-sm">
                <p><strong>订阅ID:</strong> {checkoutResponse.subscription.id}</p>
                <p><strong>状态:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    checkoutResponse.subscription.status === 'active' ? 'bg-green-100 text-green-800' :
                    checkoutResponse.subscription.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {subscriptionAPI.formatSubscriptionStatus(checkoutResponse.subscription.status).text}
                  </span>
                </p>
                <p><strong>开始时间:</strong> {new Date(checkoutResponse.subscription.start_at).toLocaleString()}</p>
                <p><strong>当前周期:</strong> {new Date(checkoutResponse.subscription.current_period_start).toLocaleDateString()} - {new Date(checkoutResponse.subscription.current_period_end).toLocaleDateString()}</p>
              </div>
            </div>

            {checkoutResponse.payment_session && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">支付信息</h3>
                <p className="text-sm text-yellow-800 mb-3">
                  支付页面已在新窗口打开，请完成支付以激活订阅。
                </p>
                <button
                  onClick={() => window.open(subscriptionAPI.getPaymentCheckoutUrl(checkoutResponse.payment_session.stripe_session_id), '_blank')}
                  className="bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700"
                >
                  重新打开支付页面
                </button>
              </div>
            )}

            {checkoutResponse.stripe_response && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  📋 Stripe API 模拟响应
                </h3>
                <div className="space-y-2 text-sm">
                  <p><strong>请求URL:</strong> <code className="bg-gray-200 px-2 py-1 rounded">{checkoutResponse.stripe_response.request_url}</code></p>
                  <p><strong>时间戳:</strong> {new Date(checkoutResponse.stripe_response.timestamp).toLocaleString()}</p>
                </div>
                
                <details className="mt-4">
                  <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                    查看详细响应数据
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-800 text-green-400 rounded text-xs overflow-x-auto">
                    {JSON.stringify(checkoutResponse.stripe_response, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200 flex gap-4">
          <button
            onClick={() => navigate('/subscriptions')}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
          >
            查看我的订阅
          </button>
          <button
            onClick={() => {
              setStep('select');
              setCheckoutResponse(null);
              setSelectedPrice(null);
            }}
            className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
          >
            创建另一个订阅
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">订阅服务</h1>
          <p className="mt-2 text-gray-600">选择适合您的订阅套餐</p>
        </div>

        {step === 'select' && renderProductSelection()}
        {(step === 'checkout' || step === 'success') && renderCheckoutResult()}
      </div>
    </div>
  );
};

export default SubscriptionCheckout; 