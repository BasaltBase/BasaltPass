import React, { useState, useEffect } from 'react';
import TenantLayout from '@/components/TenantLayout';
import { 
  CurrencyDollarIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import * as tenantSubscriptionAPI from '@api/tenant/subscription';

interface PriceManagementProps {}

const PriceManagement: React.FC<PriceManagementProps> = () => {
  const [prices, setPrices] = useState<tenantSubscriptionAPI.TenantPrice[]>([]);
  const [plans, setPlans] = useState<tenantSubscriptionAPI.TenantPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPrice, setEditingPrice] = useState<tenantSubscriptionAPI.TenantPrice | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>('all');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pricesResponse, plansResponse] = await Promise.all([
        tenantSubscriptionAPI.listTenantPrices({ page: 1, page_size: 100 }),
        tenantSubscriptionAPI.listTenantPlans({ page: 1, page_size: 100 })
      ]);
      
      setPrices(pricesResponse.data || []);
      setPlans(plansResponse.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlanName = (planId: number) => {
    const plan = plans.find(p => p.ID === planId);
    return plan ? plan.DisplayName : '未知套餐';
  };

  const filteredPrices = prices.filter(price => {
    const matchesSearch = getPlanName(price.PlanID).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = selectedPlan === 'all' || price.PlanID.toString() === selectedPlan;
    const matchesCurrency = selectedCurrency === 'all' || price.Currency === selectedCurrency;
    return matchesSearch && matchesPlan && matchesCurrency;
  });

  const handleCreatePrice = () => {
    setEditingPrice(null);
    setShowCreateModal(true);
  };

  const handleEditPrice = (price: tenantSubscriptionAPI.TenantPrice) => {
    setEditingPrice(price);
    setShowCreateModal(true);
  };

  const handleDeletePrice = async (priceId: number, planName: string) => {
    if (!confirm(`确定要删除"${planName}"的这个定价吗？`)) {
      return;
    }

    try {
      await tenantSubscriptionAPI.deleteTenantPrice(priceId);
      alert('定价删除成功');
      fetchData();
    } catch (error: any) {
      console.error('Failed to delete price:', error);
      alert(`删除定价失败: ${error.response?.data?.error || error.message}`);
    }
  };

  const formatPrice = (amountCents: number, currency: string) => {
    const amount = amountCents / 100;
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const formatBillingPeriod = (period: string, interval: number) => {
    const periodMap: Record<string, string> = {
      day: '天',
      week: '周',
      month: '月',
      year: '年'
    };

    const periodText = periodMap[period] || period;
    return interval === 1 ? `每${periodText}` : `每${interval}${periodText}`;
  };

  const getUsageTypeText = (usageType: string) => {
    const typeMap: Record<string, string> = {
      license: '按许可证',
      metered: '按使用量',
      tiered: '分层计费'
    };
    return typeMap[usageType] || usageType;
  };

  if (loading) {
    return (
      <TenantLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout>
      <div className="space-y-6">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">定价管理</h1>
            <p className="mt-2 text-sm text-gray-700">
              管理套餐的价格方案和计费配置
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button
              type="button"
              onClick={handleCreatePrice}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              创建定价
            </button>
          </div>
        </div>

        {/* 筛选和搜索栏 */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="搜索套餐名称..."
              />
            </div>
            <div>
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="all">所有套餐</option>
                {plans.map((plan) => (
                  <option key={plan.ID} value={plan.ID.toString()}>
                    {plan.DisplayName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="all">所有币种</option>
                <option value="CNY">人民币 (CNY)</option>
                <option value="USD">美元 (USD)</option>
                <option value="EUR">欧元 (EUR)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 定价列表 */}
        {filteredPrices.length === 0 ? (
          <div className="text-center py-12 bg-white shadow rounded-lg">
            <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">暂无定价</h3>
            <p className="mt-1 text-sm text-gray-500">
              开始为套餐创建定价方案。
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={handleCreatePrice}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                创建定价
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPrices.map((price) => (
              <div
                key={price.ID}
                className="bg-white overflow-hidden shadow rounded-lg border"
              >
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          {getPlanName(price.PlanID)}
                        </dt>
                        <dd>
                          <div className="text-lg font-medium text-gray-900">
                            {formatPrice(price.AmountCents, price.Currency)}
                          </div>
                        </dd>
                      </dl>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">计费周期：</span>
                      <span className="font-medium">
                        {formatBillingPeriod(price.BillingPeriod, price.BillingInterval)}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">使用类型：</span>
                      <span className="font-medium">{getUsageTypeText(price.UsageType)}</span>
                    </div>

                    {price.TrialDays && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">试用期：</span>
                        <span className="font-medium">{price.TrialDays} 天</span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">创建时间：</span>
                      <span className="font-medium">
                        {new Date(price.CreatedAt).toLocaleDateString()}
                      </span>
                    </div>

                    {price.DeprecatedAt && (
                      <div className="flex items-center mt-2">
                        <XCircleIcon className="h-4 w-4 text-red-500" />
                        <span className="ml-1 text-sm text-red-600">已废弃</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex space-x-2">
                    <button
                      onClick={() => handleEditPrice(price)}
                      className="flex-1 inline-flex justify-center items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      编辑
                    </button>
                    <button
                      onClick={() => handleDeletePrice(price.ID, getPlanName(price.PlanID))}
                      className="flex-1 inline-flex justify-center items-center px-3 py-1 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <TrashIcon className="h-4 w-4 mr-1" />
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 创建/编辑定价模态框 */}
      {showCreateModal && (
        <CreatePriceModal
          price={editingPrice}
          plans={plans}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchData();
          }}
        />
      )}
    </TenantLayout>
  );
};

// 创建定价模态框组件
const CreatePriceModal: React.FC<{
  price?: tenantSubscriptionAPI.TenantPrice | null;
  plans: tenantSubscriptionAPI.TenantPlan[];
  onClose: () => void;
  onSuccess: () => void;
}> = ({ price, plans, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    plan_id: price?.PlanID.toString() || '',
    currency: price?.Currency || 'CNY',
    amount_cents: price ? (price.AmountCents / 100).toString() : '',
    billing_period: price?.BillingPeriod || 'month',
    billing_interval: price?.BillingInterval || 1,
    trial_days: price?.TrialDays?.toString() || '',
    usage_type: price?.UsageType || 'license',
    metadata: JSON.stringify(price?.Metadata || {}, null, 2)
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      
      let metadata = {};
      try {
        metadata = JSON.parse(formData.metadata);
      } catch (e) {
        alert('元数据格式错误，请检查JSON格式');
        return;
      }
      
      const submitData: tenantSubscriptionAPI.CreateTenantPriceRequest = {
        plan_id: parseInt(formData.plan_id),
        currency: formData.currency,
        amount_cents: Math.round(parseFloat(formData.amount_cents) * 100),
        billing_period: formData.billing_period,
        billing_interval: formData.billing_interval,
        trial_days: formData.trial_days ? parseInt(formData.trial_days) : undefined,
        usage_type: formData.usage_type,
        metadata: metadata
      };

      if (price) {
        await tenantSubscriptionAPI.updateTenantPrice(price.ID, {
          amount_cents: submitData.amount_cents,
          currency: submitData.currency,
          trial_days: submitData.trial_days,
          metadata: submitData.metadata
        });
      } else {
        await tenantSubscriptionAPI.createTenantPrice(submitData);
      }
      
      onSuccess();
    } catch (error: any) {
      console.error('Failed to save price:', error);
      alert(`保存定价失败: ${error.response?.data?.error || error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-6">
            {price ? '编辑定价' : '创建定价'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  所属套餐 *
                </label>
                <select
                  required
                  disabled={!!price} // 编辑时不允许修改套餐
                  value={formData.plan_id}
                  onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                >
                  <option value="">选择套餐</option>
                  {plans.map((plan) => (
                    <option key={plan.ID} value={plan.ID.toString()}>
                      {plan.DisplayName}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  币种 *
                </label>
                <select
                  required
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="CNY">人民币 (CNY)</option>
                  <option value="USD">美元 (USD)</option>
                  <option value="EUR">欧元 (EUR)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  价格 *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.amount_cents}
                  onChange={(e) => setFormData({ ...formData, amount_cents: e.target.value })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="输入价格 (元)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  计费周期 *
                </label>
                <select
                  required
                  disabled={!!price} // 编辑时不允许修改计费周期
                  value={formData.billing_period}
                  onChange={(e) => setFormData({ ...formData, billing_period: e.target.value })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                >
                  <option value="day">天</option>
                  <option value="week">周</option>
                  <option value="month">月</option>
                  <option value="year">年</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  计费间隔 *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  disabled={!!price} // 编辑时不允许修改计费间隔
                  value={formData.billing_interval}
                  onChange={(e) => setFormData({ ...formData, billing_interval: parseInt(e.target.value) })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  placeholder="间隔数量"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  使用类型 *
                </label>
                <select
                  required
                  disabled={!!price} // 编辑时不允许修改使用类型
                  value={formData.usage_type}
                  onChange={(e) => setFormData({ ...formData, usage_type: e.target.value })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                >
                  <option value="license">按许可证</option>
                  <option value="metered">按使用量</option>
                  <option value="tiered">分层计费</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                试用天数
              </label>
              <input
                type="number"
                min="0"
                value={formData.trial_days}
                onChange={(e) => setFormData({ ...formData, trial_days: e.target.value })}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="留空表示无试用期"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                元数据 (JSON格式)
              </label>
              <textarea
                rows={4}
                value={formData.metadata}
                onChange={(e) => setFormData({ ...formData, metadata: e.target.value })}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                placeholder='{"description": "定价描述"}'
              />
              <p className="mt-1 text-sm text-gray-500">
                请输入有效的JSON格式数据
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 bg-gray-300 text-gray-700 text-base font-medium rounded-md shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {submitting ? '保存中...' : (price ? '更新' : '创建')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PriceManagement;
