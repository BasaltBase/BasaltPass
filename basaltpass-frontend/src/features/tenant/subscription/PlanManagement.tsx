import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
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
import { useI18n } from '@shared/i18n'
import { PInput, PSelect, PButton, PTextarea, PSkeleton, PBadge, Modal, PPageHeader } from '@ui';
import PTable, { PTableColumn, PTableAction } from '@ui/PTable';
import useDebounce from '@hooks/useDebounce';

interface PlanManagementProps {}

const PlanManagement: React.FC<PlanManagementProps> = () => {
  const { t } = useI18n()
  const [plans, setPlans] = useState<tenantSubscriptionAPI.TenantPlan[]>([]);
  const [products, setProducts] = useState<tenantSubscriptionAPI.TenantProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 200);
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
    const matchesSearch = plan.DisplayName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                         plan.Code.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
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
    if (!await uiConfirm(t('tenantSubscriptionPlanManagement.confirm.deletePlanByName', { name: planName }))) {
      return;
    }

    try {
      await tenantSubscriptionAPI.deleteTenantPlan(planId);
      uiAlert(t('tenantSubscriptionPlanManagement.alerts.deleteSuccess'));
      fetchData();
    } catch (error: any) {
      console.error('Failed to delete plan:', error);
      uiAlert(`${t('tenantSubscriptionPlanManagement.alerts.deleteFailed')}: ${error.response?.data?.error || error.message}`);
    }
  };

  const getProductName = (productId: number) => {
    const product = products.find(p => p.ID === productId);
    return product ? product.Name : t('tenantSubscriptionPlanManagement.fields.unknownProduct');
  };

  if (loading) {
    return (
      <TenantLayout title={t('tenantSubscriptionPlanManagement.layoutTitle')}>
        <div className="py-6">
          <PSkeleton.Management />
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout title={t('tenantSubscriptionPlanManagement.layoutTitle')}>
      <div className="space-y-6">
        <PPageHeader
          title={t('tenantSubscriptionPlanManagement.header.title')}
          description={t('tenantSubscriptionPlanManagement.header.description')}
          icon={<RocketLaunchIcon className="h-8 w-8 text-indigo-600" />}
          actions={<PButton type="button" onClick={handleCreatePlan} leftIcon={<PlusIcon className="h-5 w-5" />}>{t('tenantSubscriptionPlanManagement.actions.createPlan')}</PButton>}
        />

        {/*  */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PInput
              icon={<MagnifyingGlassIcon className="h-5 w-5" />}
              type="text"
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              placeholder={t('tenantSubscriptionPlanManagement.search.placeholder')}
            />
            <PSelect
              value={selectedProduct}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedProduct(e.target.value)}
            >
              <option value="all">{t('tenantSubscriptionPlanManagement.search.allProducts')}</option>
              {products.map((product) => (
                <option key={product.ID} value={product.ID.toString()}>
                  {product.Name}
                </option>
              ))}
            </PSelect>
          </div>
        </div>

        {/* （） */}
        {(() => {
          const columns: PTableColumn<tenantSubscriptionAPI.TenantPlan>[] = [
            {
              key: 'name',
              title: t('tenantSubscriptionPlanManagement.table.plan'),
              render: (row) => (
                <div className="flex items-center">
                  <RocketLaunchIcon className="h-5 w-5 text-blue-600" />
                  <span className="ml-2 text-blue-600 font-medium">{row.DisplayName}</span>
                  <PBadge variant="info" className="ml-2">v{row.PlanVersion}</PBadge>
                </div>
              )
            },
            {
              key: 'product',
              title: t('tenantSubscriptionPlanManagement.table.product'),
              render: (row) => <span className="text-gray-700">{getProductName(row.ProductID)}</span>
            },
            { key: 'code', title: t('tenantSubscriptionPlanManagement.table.code'), dataIndex: 'Code' as any },
            {
              key: 'features',
              title: t('tenantSubscriptionPlanManagement.table.features'),
              render: (row) => <span>{row.Features?.length || 0}</span>
            },
            {
              key: 'prices',
              title: t('tenantSubscriptionPlanManagement.table.prices'),
              render: (row) => <span>{row.Prices?.length || 0}</span>
            }
          ];

          const actions: PTableAction<tenantSubscriptionAPI.TenantPlan>[] = [
            {
              key: 'edit',
              label: t('tenantSubscriptionPlanManagement.actions.edit'),
              icon: <PencilIcon className="h-4 w-4" />,
              variant: 'secondary',
              size: 'sm',
              onClick: (row) => handleEditPlan(row)
            },
            {
              key: 'delete',
              label: t('tenantSubscriptionPlanManagement.actions.delete'),
              icon: <TrashIcon className="h-4 w-4" />,
              variant: 'danger',
              size: 'sm',
              confirm: t('tenantSubscriptionPlanManagement.confirm.deletePlan'),
              onClick: (row) => handleDeletePlan(row.ID, row.DisplayName)
            }
          ];

          return (
            <PTable
              columns={columns}
              data={filteredPlans}
              rowKey={(row) => row.ID}
              actions={actions}
              emptyText={t('tenantSubscriptionPlanManagement.empty.noPlans')}
              emptyContent={
                <PButton type="button" onClick={handleCreatePlan} leftIcon={<PlusIcon className="h-5 w-5" />}>{t('tenantSubscriptionPlanManagement.actions.createPlan')}</PButton>
              }
              striped
              size="md"
            />
          );
        })()}
      </div>

      {/* / */}
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

// 
const CreatePlanModal: React.FC<{
  plan?: tenantSubscriptionAPI.TenantPlan | null;
  products: tenantSubscriptionAPI.TenantProduct[];
  onClose: () => void;
  onSuccess: () => void;
}> = ({ plan, products, onClose, onSuccess }) => {
  const { t } = useI18n()
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
        uiAlert(t('tenantSubscriptionPlanManagement.alerts.invalidMetadata'));
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
      uiAlert(`${t('tenantSubscriptionPlanManagement.alerts.saveFailed')}: ${error.response?.data?.error || error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={plan ? t('tenantSubscriptionPlanManagement.modal.editTitle') : t('tenantSubscriptionPlanManagement.modal.createTitle')} widthClass="max-w-2xl">
        <div className="mt-3">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenantSubscriptionPlanManagement.modal.productLabel')}
                </label>
                <PSelect
                  required
                  disabled={!!plan}
                  value={formData.product_id}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, product_id: e.target.value })}
                >
                  <option value="">{t('tenantSubscriptionPlanManagement.modal.selectProduct')}</option>
                  {products.map((product) => (
                    <option key={product.ID} value={product.ID.toString()}>
                      {product.Name}
                    </option>
                  ))}
                </PSelect>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenantSubscriptionPlanManagement.modal.codeLabel')}
                </label>
                <PInput
                  type="text"
                  required
                  disabled={!!plan}
                  value={formData.code}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, code: e.target.value })}
                  placeholder={t('tenantSubscriptionPlanManagement.modal.codePlaceholder')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenantSubscriptionPlanManagement.modal.nameLabel')}
                </label>
                <PInput
                  type="text"
                  required
                  value={formData.display_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder={t('tenantSubscriptionPlanManagement.modal.namePlaceholder')}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenantSubscriptionPlanManagement.modal.versionLabel')}
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
                {t('tenantSubscriptionPlanManagement.modal.metadataLabel')}
              </label>
              <PTextarea
                rows={6}
                value={formData.metadata}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, metadata: e.target.value })}
                placeholder={t('tenantSubscriptionPlanManagement.modal.metadataPlaceholder')}
                className="font-mono text-sm"
              />
              <p className="mt-1 text-sm text-gray-500">
                {t('tenantSubscriptionPlanManagement.modal.metadataHint')}
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <PButton type="button" variant="secondary" onClick={onClose} disabled={submitting}>
                {t('tenantSubscriptionPlanManagement.actions.cancel')}
              </PButton>
              <PButton type="submit" loading={submitting}>
                {plan ? t('tenantSubscriptionPlanManagement.actions.update') : t('tenantSubscriptionPlanManagement.actions.create')}
              </PButton>
            </div>
          </form>
        </div>
    </Modal>
  );
};

export default PlanManagement;
