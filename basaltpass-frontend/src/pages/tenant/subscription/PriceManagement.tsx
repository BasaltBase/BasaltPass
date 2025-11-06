import React, { useState, useEffect } from 'react';
import TenantLayout from '@components/TenantLayout';
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
import PInput from '@components/PInput';
import PSelect from '@components/PSelect';
import PButton from '@components/PButton';
import PTextarea from '@components/PTextarea';
import PTable, { PTableColumn, PTableAction } from '@components/PTable';

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
      <TenantLayout title="定价管理">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout title="定价管理">
      <div className="space-y-6">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">定价管理</h1>
            <p className="mt-2 text-sm text-gray-700">
              管理套餐的价格方案和计费配置
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <PButton type="button" onClick={handleCreatePrice} leftIcon={<PlusIcon className="h-5 w-5" />}>创建定价</PButton>
          </div>
        </div>

        {/* 筛选和搜索栏 */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PInput
              icon={<MagnifyingGlassIcon className="h-5 w-5" />}
              type="text"
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              placeholder="搜索套餐名称..."
            />
            <PSelect
              value={selectedPlan}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedPlan(e.target.value)}
            >
              <option value="all">所有套餐</option>
              {plans.map((plan) => (
                <option key={plan.ID} value={plan.ID.toString()}>
                  {plan.DisplayName}
                </option>
              ))}
            </PSelect>
            <PSelect
              value={selectedCurrency}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedCurrency(e.target.value)}
            >
              <option value="all">所有币种</option>
              <option value="CNY">人民币 (CNY)</option>
              <option value="USD">美元 (USD)</option>
              <option value="EUR">欧元 (EUR)</option>
            </PSelect>
          </div>
        </div>

        {/* 定价列表（统一表格组件） */}
        {(() => {
          const columns: PTableColumn<tenantSubscriptionAPI.TenantPrice>[] = [
            { key: 'plan', title: '套餐', render: (row) => getPlanName(row.PlanID) },
            { key: 'amount', title: '价格', render: (row) => formatPrice(row.AmountCents, row.Currency) },
            { key: 'billing', title: '计费周期', render: (row) => formatBillingPeriod(row.BillingPeriod, row.BillingInterval) },
            { key: 'usage', title: '使用类型', render: (row) => getUsageTypeText(row.UsageType) },
            { key: 'trial', title: '试用期', render: (row) => (row.TrialDays ? `${row.TrialDays} 天` : '-') },
            { key: 'created', title: '创建时间', render: (row) => new Date(row.CreatedAt).toLocaleDateString() },
            { key: 'deprecated', title: '状态', render: (row) => row.DeprecatedAt ? (<span className="inline-flex items-center text-red-600"><XCircleIcon className="h-4 w-4 mr-1" />已废弃</span>) : (<span className="text-gray-600">正常</span>) },
          ];

          const actions: PTableAction<tenantSubscriptionAPI.TenantPrice>[] = [
            { key: 'edit', label: '编辑', icon: <PencilIcon className="h-4 w-4" />, variant: 'secondary', size: 'sm', onClick: (row) => handleEditPrice(row) },
            { key: 'delete', label: '删除', icon: <TrashIcon className="h-4 w-4" />, variant: 'danger', size: 'sm', confirm: '确定要删除该定价吗？', onClick: (row) => handleDeletePrice(row.ID, getPlanName(row.PlanID)) },
          ];

          return (
            <PTable
              columns={columns}
              data={filteredPrices}
              rowKey={(row) => row.ID}
              actions={actions}
              emptyText="暂无定价"
              emptyContent={<PButton type="button" onClick={handleCreatePrice} leftIcon={<PlusIcon className="h-5 w-5" />}>创建定价</PButton>}
              striped
              size="md"
            />
          );
        })()}
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
                <PSelect
                  required
                  disabled={!!price}
                  value={formData.plan_id}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, plan_id: e.target.value })}
                >
                  <option value="">选择套餐</option>
                  {plans.map((plan) => (
                    <option key={plan.ID} value={plan.ID.toString()}>
                      {plan.DisplayName}
                    </option>
                  ))}
                </PSelect>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  币种 *
                </label>
                <PSelect
                  required
                  value={formData.currency}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, currency: e.target.value })}
                >
                  <option value="CNY">人民币 (CNY)</option>
                  <option value="USD">美元 (USD)</option>
                  <option value="EUR">欧元 (EUR)</option>
                </PSelect>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  价格 *
                </label>
                <PInput
                  type="number"
                  step={0.01 as unknown as string}
                  min={0}
                  required
                  value={formData.amount_cents}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, amount_cents: e.target.value })}
                  placeholder="输入价格 (元)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  计费周期 *
                </label>
                <PSelect
                  required
                  disabled={!!price}
                  value={formData.billing_period}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, billing_period: e.target.value })}
                >
                  <option value="day">天</option>
                  <option value="week">周</option>
                  <option value="month">月</option>
                  <option value="year">年</option>
                </PSelect>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  计费间隔 *
                </label>
                <PInput
                  type="number"
                  min={1}
                  required
                  disabled={!!price}
                  value={formData.billing_interval}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, billing_interval: parseInt(e.target.value) })}
                  placeholder="间隔数量"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  使用类型 *
                </label>
                <PSelect
                  required
                  disabled={!!price}
                  value={formData.usage_type}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, usage_type: e.target.value })}
                >
                  <option value="license">按许可证</option>
                  <option value="metered">按使用量</option>
                  <option value="tiered">分层计费</option>
                </PSelect>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                试用天数
              </label>
              <PInput
                type="number"
                min={0}
                value={formData.trial_days}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, trial_days: e.target.value })}
                placeholder="留空表示无试用期"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                元数据 (JSON格式)
              </label>
              <PTextarea
                rows={4}
                value={formData.metadata}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, metadata: e.target.value })}
                placeholder='{"description": "定价描述"}'
              />
              <p className="mt-1 text-sm text-gray-500">
                请输入有效的JSON格式数据
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <PButton type="button" variant="secondary" onClick={onClose} disabled={submitting}>取消</PButton>
              <PButton type="submit" loading={submitting}>{submitting ? '保存中...' : (price ? '更新' : '创建')}</PButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PriceManagement;
