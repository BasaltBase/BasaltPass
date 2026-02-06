import React, { useState, useEffect } from 'react';
import TenantLayout from '@features/tenant/components/TenantLayout';
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
import * as tenantSubscriptionAPI from '@api/tenant/subscription';
import PInput from '@ui/PInput';
import PSelect from '@ui/PSelect';
import PButton from '@ui/PButton';
import PTextarea from '@ui/PTextarea';
import PTable, { PTableColumn, PTableAction } from '@ui/PTable';

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
      <TenantLayout title="套餐管理">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout title="套餐管理">
      <div className="space-y-6">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">套餐管理</h1>
            <p className="mt-2 text-sm text-gray-700">
              管理产品的订阅套餐和功能配置
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <PButton type="button" onClick={handleCreatePlan} leftIcon={<PlusIcon className="h-5 w-5" />}>创建套餐</PButton>
          </div>
        </div>

        {/* 筛选和搜索栏 */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PInput
              icon={<MagnifyingGlassIcon className="h-5 w-5" />}
              type="text"
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              placeholder="搜索套餐名称或代码..."
            />
            <PSelect
              value={selectedProduct}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedProduct(e.target.value)}
            >
              <option value="all">所有产品</option>
              {products.map((product) => (
                <option key={product.ID} value={product.ID.toString()}>
                  {product.Name}
                </option>
              ))}
            </PSelect>
          </div>
        </div>

        {/* 套餐列表（统一表格组件） */}
        {(() => {
          const columns: PTableColumn<tenantSubscriptionAPI.TenantPlan>[] = [
            {
              key: 'name',
              title: '套餐',
              render: (row) => (
                <div className="flex items-center">
                  <RocketLaunchIcon className="h-5 w-5 text-blue-600" />
                  <span className="ml-2 text-blue-600 font-medium">{row.DisplayName}</span>
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">v{row.PlanVersion}</span>
                </div>
              )
            },
            {
              key: 'product',
              title: '产品',
              render: (row) => <span className="text-gray-700">{getProductName(row.ProductID)}</span>
            },
            { key: 'code', title: '代码', dataIndex: 'Code' as any },
            {
              key: 'features',
              title: '功能数',
              render: (row) => <span>{row.Features?.length || 0}</span>
            },
            {
              key: 'prices',
              title: '定价数',
              render: (row) => <span>{row.Prices?.length || 0}</span>
            }
          ];

          const actions: PTableAction<tenantSubscriptionAPI.TenantPlan>[] = [
            {
              key: 'edit',
              label: '编辑',
              icon: <PencilIcon className="h-4 w-4" />,
              variant: 'secondary',
              size: 'sm',
              onClick: (row) => handleEditPlan(row)
            },
            {
              key: 'delete',
              label: '删除',
              icon: <TrashIcon className="h-4 w-4" />,
              variant: 'danger',
              size: 'sm',
              confirm: '确定要删除该套餐吗？这将同时删除相关的定价配置。',
              onClick: (row) => handleDeletePlan(row.ID, row.DisplayName)
            }
          ];

          return (
            <PTable
              columns={columns}
              data={filteredPlans}
              rowKey={(row) => row.ID}
              actions={actions}
              emptyText="暂无套餐"
              emptyContent={
                <PButton type="button" onClick={handleCreatePlan} leftIcon={<PlusIcon className="h-5 w-5" />}>创建套餐</PButton>
              }
              striped
              size="md"
            />
          );
        })()}
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
                <PSelect
                  required
                  disabled={!!plan}
                  value={formData.product_id}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, product_id: e.target.value })}
                >
                  <option value="">选择产品</option>
                  {products.map((product) => (
                    <option key={product.ID} value={product.ID.toString()}>
                      {product.Name}
                    </option>
                  ))}
                </PSelect>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  套餐代码 *
                </label>
                <PInput
                  type="text"
                  required
                  disabled={!!plan}
                  value={formData.code}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="输入套餐代码"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  套餐名称 *
                </label>
                <PInput
                  type="text"
                  required
                  value={formData.display_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="输入套餐名称"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  版本号 *
                </label>
                <PInput
                  type="number"
                  min={1}
                  required
                  disabled={!!plan}
                  value={formData.plan_version}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, plan_version: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                元数据 (JSON格式)
              </label>
              <PTextarea
                rows={6}
                value={formData.metadata}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, metadata: e.target.value })}
                placeholder='{"description": "套餐描述", "features": []}'
                className="font-mono text-sm"
              />
              <p className="mt-1 text-sm text-gray-500">
                请输入有效的JSON格式数据
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <PButton type="button" variant="secondary" onClick={onClose} disabled={submitting}>
                取消
              </PButton>
              <PButton type="submit" loading={submitting}>
                {plan ? '更新' : '创建'}
              </PButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PlanManagement;
