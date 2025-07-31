import React, { useState, useEffect } from 'react';
import TenantLayout from '@/components/TenantLayout';
import { 
  RocketLaunchIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import * as tenantSubscriptionAPI from '@/api/tenantSubscription';

interface PlanManagementProps {}

const PlanManagement: React.FC<PlanManagementProps> = () => {
  const [plans, setPlans] = useState<tenantSubscriptionAPI.TenantPlan[]>([]);
  const [products, setProducts] = useState<tenantSubscriptionAPI.TenantProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<tenantSubscriptionAPI.TenantPlan | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansResponse, productsResponse] = await Promise.all([
        tenantSubscriptionAPI.listTenantPlans({ page: 1, page_size: 100 }),
        tenantSubscriptionAPI.listTenantProducts({ page: 1, page_size: 100 })
      ]);
      
      setPlans(plansResponse.data || []);
      setProducts(productsResponse.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlans = plans.filter(plan => {
    const matchesSearch = plan.DisplayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plan.Code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProduct = selectedProduct === 'all' || plan.ProductID.toString() === selectedProduct;
    return matchesSearch && matchesProduct;
  });

  const handleCreatePlan = () => {
    setEditingPlan(null);
    setShowCreateModal(true);
  };

  const handleEditPlan = (plan: tenantSubscriptionAPI.TenantPlan) => {
    setEditingPlan(plan);
    setShowCreateModal(true);
  };

  const handleDeletePlan = async (planId: number, planName: string) => {
    if (!confirm(`确定要删除套餐"${planName}"吗？这将同时删除相关的定价配置。`)) {
      return;
    }

    try {
      await tenantSubscriptionAPI.deleteTenantPlan(planId);
      alert('套餐删除成功');
      fetchData();
    } catch (error: any) {
      console.error('Failed to delete plan:', error);
      alert(`删除套餐失败: ${error.response?.data?.error || error.message}`);
    }
  };

  const getProductName = (productId: number) => {
    const product = products.find(p => p.ID === productId);
    return product ? product.Name : '未知产品';
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
            <h1 className="text-2xl font-semibold text-gray-900">套餐管理</h1>
            <p className="mt-2 text-sm text-gray-700">
              管理产品的订阅套餐和功能配置
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button
              type="button"
              onClick={handleCreatePlan}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              创建套餐
            </button>
          </div>
        </div>

        {/* 筛选和搜索栏 */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="搜索套餐名称或代码..."
              />
            </div>
            <div>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="all">所有产品</option>
                {products.map((product) => (
                  <option key={product.ID} value={product.ID.toString()}>
                    {product.Name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 套餐列表 */}
        {filteredPlans.length === 0 ? (
          <div className="text-center py-12 bg-white shadow rounded-lg">
            <RocketLaunchIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">暂无套餐</h3>
            <p className="mt-1 text-sm text-gray-500">
              开始创建第一个订阅套餐。
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={handleCreatePlan}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                创建套餐
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {filteredPlans.map((plan) => (
                <li key={plan.ID}>
                  <div className="px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center flex-1">
                      <div className="flex-shrink-0">
                        <RocketLaunchIcon className="h-8 w-8 text-blue-600" />
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-blue-600 truncate">
                            {plan.DisplayName}
                          </p>
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            v{plan.PlanVersion}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <span>产品: {getProductName(plan.ProductID)}</span>
                          <span className="mx-2">•</span>
                          <span>代码: {plan.Code}</span>
                          {plan.Features && plan.Features.length > 0 && (
                            <>
                              <span className="mx-2">•</span>
                              <span>{plan.Features.length} 个功能</span>
                            </>
                          )}
                          {plan.Prices && plan.Prices.length > 0 && (
                            <>
                              <span className="mx-2">•</span>
                              <span>{plan.Prices.length} 个定价方案</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditPlan(plan)}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <PencilIcon className="h-4 w-4 mr-1" />
                        编辑
                      </button>
                      <button
                        onClick={() => handleDeletePlan(plan.ID, plan.DisplayName)}
                        className="inline-flex items-center px-3 py-1 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <TrashIcon className="h-4 w-4 mr-1" />
                        删除
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 创建/编辑套餐模态框 */}
      {showCreateModal && (
        <CreatePlanModal
          plan={editingPlan}
          products={products}
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

// 创建套餐模态框组件
const CreatePlanModal: React.FC<{
  plan?: tenantSubscriptionAPI.TenantPlan | null;
  products: tenantSubscriptionAPI.TenantProduct[];
  onClose: () => void;
  onSuccess: () => void;
}> = ({ plan, products, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    product_id: plan?.ProductID.toString() || '',
    code: plan?.Code || '',
    display_name: plan?.DisplayName || '',
    plan_version: plan?.PlanVersion || 1,
    metadata: JSON.stringify(plan?.Metadata || {}, null, 2)
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
      
      const submitData: tenantSubscriptionAPI.CreateTenantPlanRequest = {
        product_id: parseInt(formData.product_id),
        code: formData.code,
        display_name: formData.display_name,
        plan_version: formData.plan_version,
        metadata: metadata
      };

      if (plan) {
        await tenantSubscriptionAPI.updateTenantPlan(plan.ID, {
          display_name: formData.display_name,
          metadata: metadata
        });
      } else {
        await tenantSubscriptionAPI.createTenantPlan(submitData);
      }
      
      onSuccess();
    } catch (error: any) {
      console.error('Failed to save plan:', error);
      alert(`保存套餐失败: ${error.response?.data?.error || error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-6">
            {plan ? '编辑套餐' : '创建套餐'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  所属产品 *
                </label>
                <select
                  required
                  disabled={!!plan} // 编辑时不允许修改产品
                  value={formData.product_id}
                  onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                >
                  <option value="">选择产品</option>
                  {products.map((product) => (
                    <option key={product.ID} value={product.ID.toString()}>
                      {product.Name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  套餐代码 *
                </label>
                <input
                  type="text"
                  required
                  disabled={!!plan} // 编辑时不允许修改代码
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  placeholder="输入套餐代码"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  套餐名称 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="输入套餐名称"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  版本号 *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  disabled={!!plan} // 编辑时不允许修改版本号
                  value={formData.plan_version}
                  onChange={(e) => setFormData({ ...formData, plan_version: parseInt(e.target.value) })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                元数据 (JSON格式)
              </label>
              <textarea
                rows={6}
                value={formData.metadata}
                onChange={(e) => setFormData({ ...formData, metadata: e.target.value })}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                placeholder='{"description": "套餐描述", "features": []}'
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
                {submitting ? '保存中...' : (plan ? '更新' : '创建')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PlanManagement;
