import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import TenantLayout from '@features/tenant/components/TenantLayout';
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
import { useI18n } from '@shared/i18n'
import { PInput, PSelect, PButton, PTextarea, PSkeleton, Modal, PPageHeader } from '@ui';
import PTable, { PTableColumn, PTableAction } from '@ui/PTable';
import useDebounce from '@hooks/useDebounce';

interface PriceManagementProps {}

const PriceManagement: React.FC<PriceManagementProps> = () => {
  const { t, locale } = useI18n()
  const [prices, setPrices] = useState<tenantSubscriptionAPI.TenantPrice[]>([]);
  const [plans, setPlans] = useState<tenantSubscriptionAPI.TenantPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 200);
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
    return plan ? plan.DisplayName : t('tenantSubscriptionPriceManagement.fields.unknownPlan');
  };

  const filteredPrices = prices.filter(price => {
    const matchesSearch = getPlanName(price.PlanID).toLowerCase().includes(debouncedSearchTerm.toLowerCase());
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
    if (!await uiConfirm(t('tenantSubscriptionPriceManagement.confirm.deletePriceByPlan', { planName }))) {
      return;
    }

    try {
      await tenantSubscriptionAPI.deleteTenantPrice(priceId);
      uiAlert(t('tenantSubscriptionPriceManagement.alerts.deleteSuccess'));
      fetchData();
    } catch (error: any) {
      console.error('Failed to delete price:', error);
      uiAlert(`${t('tenantSubscriptionPriceManagement.alerts.deleteFailed')}: ${error.response?.data?.error || error.message}`);
    }
  };

  const formatPrice = (amountCents: number, currency: string) => {
    const amount = amountCents / 100;
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const formatBillingPeriod = (period: string, interval: number) => {
    const periodText = t(`tenantSubscriptionPriceManagement.period.${period}`);
    return interval === 1
      ? t('tenantSubscriptionPriceManagement.period.everySingle', { period: periodText })
      : t('tenantSubscriptionPriceManagement.period.everyMultiple', { interval, period: periodText });
  };

  const getUsageTypeText = (usageType: string) => {
    return t(`tenantSubscriptionPriceManagement.usageType.${usageType}`);
  };

  if (loading) {
    return (
      <TenantLayout title={t('tenantSubscriptionPriceManagement.layoutTitle')}>
        <div className="py-6">
          <PSkeleton.Management />
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout title={t('tenantSubscriptionPriceManagement.layoutTitle')}>
      <div className="space-y-6">
        <PPageHeader
          title={t('tenantSubscriptionPriceManagement.header.title')}
          description={t('tenantSubscriptionPriceManagement.header.description')}
          icon={<CurrencyDollarIcon className="h-8 w-8 text-indigo-600" />}
          actions={<PButton type="button" onClick={handleCreatePrice} leftIcon={<PlusIcon className="h-5 w-5" />}>{t('tenantSubscriptionPriceManagement.actions.createPrice')}</PButton>}
        />

        {/*  */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PInput
              icon={<MagnifyingGlassIcon className="h-5 w-5" />}
              type="text"
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              placeholder={t('tenantSubscriptionPriceManagement.search.placeholder')}
            />
            <PSelect
              value={selectedPlan}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedPlan(e.target.value)}
            >
              <option value="all">{t('tenantSubscriptionPriceManagement.search.allPlans')}</option>
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
              <option value="all">{t('tenantSubscriptionPriceManagement.search.allCurrencies')}</option>
              <option value="CNY">{t('tenantSubscriptionPriceManagement.currency.CNY')}</option>
              <option value="USD">{t('tenantSubscriptionPriceManagement.currency.USD')}</option>
              <option value="EUR">{t('tenantSubscriptionPriceManagement.currency.EUR')}</option>
            </PSelect>
          </div>
        </div>

        {/* （） */}
        {(() => {
          const columns: PTableColumn<tenantSubscriptionAPI.TenantPrice>[] = [
            { key: 'plan', title: t('tenantSubscriptionPriceManagement.table.plan'), render: (row) => getPlanName(row.PlanID) },
            { key: 'amount', title: t('tenantSubscriptionPriceManagement.table.price'), render: (row) => formatPrice(row.AmountCents, row.Currency) },
            { key: 'billing', title: t('tenantSubscriptionPriceManagement.table.billingPeriod'), render: (row) => formatBillingPeriod(row.BillingPeriod, row.BillingInterval) },
            { key: 'usage', title: t('tenantSubscriptionPriceManagement.table.usageType'), render: (row) => getUsageTypeText(row.UsageType) },
            { key: 'trial', title: t('tenantSubscriptionPriceManagement.table.trialPeriod'), render: (row) => (row.TrialDays ? t('tenantSubscriptionPriceManagement.fields.trialDays', { days: row.TrialDays }) : '-') },
            { key: 'created', title: t('tenantSubscriptionPriceManagement.table.createdAt'), render: (row) => new Date(row.CreatedAt).toLocaleDateString(locale) },
            {
              key: 'deprecated',
              title: t('tenantSubscriptionPriceManagement.table.status'),
              render: (row) => row.DeprecatedAt
                ? (<span className="inline-flex items-center text-red-600"><XCircleIcon className="h-4 w-4 mr-1" />{t('tenantSubscriptionPriceManagement.status.deprecated')}</span>)
                : (<span className="text-gray-600">{t('tenantSubscriptionPriceManagement.status.normal')}</span>)
            },
          ];

          const actions: PTableAction<tenantSubscriptionAPI.TenantPrice>[] = [
            { key: 'edit', label: t('tenantSubscriptionPriceManagement.actions.edit'), icon: <PencilIcon className="h-4 w-4" />, variant: 'secondary', size: 'sm', onClick: (row) => handleEditPrice(row) },
            {
              key: 'delete',
              label: t('tenantSubscriptionPriceManagement.actions.delete'),
              icon: <TrashIcon className="h-4 w-4" />,
              variant: 'danger',
              size: 'sm',
              confirm: t('tenantSubscriptionPriceManagement.confirm.deletePrice'),
              onClick: (row) => handleDeletePrice(row.ID, getPlanName(row.PlanID))
            },
          ];

          return (
            <PTable
              columns={columns}
              data={filteredPrices}
              rowKey={(row) => row.ID}
              actions={actions}
              emptyText={t('tenantSubscriptionPriceManagement.empty.noPrices')}
              emptyContent={<PButton type="button" onClick={handleCreatePrice} leftIcon={<PlusIcon className="h-5 w-5" />}>{t('tenantSubscriptionPriceManagement.actions.createPrice')}</PButton>}
              striped
              size="md"
            />
          );
        })()}
      </div>

      {/* / */}
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

// 
const CreatePriceModal: React.FC<{
  price?: tenantSubscriptionAPI.TenantPrice | null;
  plans: tenantSubscriptionAPI.TenantPlan[];
  onClose: () => void;
  onSuccess: () => void;
}> = ({ price, plans, onClose, onSuccess }) => {
  const { t } = useI18n()
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
        uiAlert(t('tenantSubscriptionPriceManagement.alerts.invalidMetadata'));
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
      uiAlert(`${t('tenantSubscriptionPriceManagement.alerts.saveFailed')}: ${error.response?.data?.error || error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={price ? t('tenantSubscriptionPriceManagement.modal.editTitle') : t('tenantSubscriptionPriceManagement.modal.createTitle')} widthClass="max-w-2xl">
        <div className="mt-3">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenantSubscriptionPriceManagement.modal.planLabel')}
                </label>
                <PSelect
                  required
                  disabled={!!price}
                  value={formData.plan_id}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, plan_id: e.target.value })}
                >
                  <option value="">{t('tenantSubscriptionPriceManagement.modal.selectPlan')}</option>
                  {plans.map((plan) => (
                    <option key={plan.ID} value={plan.ID.toString()}>
                      {plan.DisplayName}
                    </option>
                  ))}
                </PSelect>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenantSubscriptionPriceManagement.modal.currencyLabel')}
                </label>
                <PSelect
                  required
                  value={formData.currency}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, currency: e.target.value })}
                >
                  <option value="CNY">{t('tenantSubscriptionPriceManagement.currency.CNY')}</option>
                  <option value="USD">{t('tenantSubscriptionPriceManagement.currency.USD')}</option>
                  <option value="EUR">{t('tenantSubscriptionPriceManagement.currency.EUR')}</option>
                </PSelect>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenantSubscriptionPriceManagement.modal.priceLabel')}
                </label>
                <PInput
                  type="number"
                  step={0.01 as unknown as string}
                  min={0}
                  required
                  value={formData.amount_cents}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, amount_cents: e.target.value })}
                  placeholder={t('tenantSubscriptionPriceManagement.modal.pricePlaceholder')}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenantSubscriptionPriceManagement.modal.billingPeriodLabel')}
                </label>
                <PSelect
                  required
                  disabled={!!price}
                  value={formData.billing_period}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, billing_period: e.target.value })}
                >
                  <option value="day">{t('tenantSubscriptionPriceManagement.period.day')}</option>
                  <option value="week">{t('tenantSubscriptionPriceManagement.period.week')}</option>
                  <option value="month">{t('tenantSubscriptionPriceManagement.period.month')}</option>
                  <option value="year">{t('tenantSubscriptionPriceManagement.period.year')}</option>
                </PSelect>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenantSubscriptionPriceManagement.modal.billingIntervalLabel')}
                </label>
                <PInput
                  type="number"
                  min={1}
                  required
                  disabled={!!price}
                  value={formData.billing_interval}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, billing_interval: parseInt(e.target.value) })}
                  placeholder={t('tenantSubscriptionPriceManagement.modal.billingIntervalPlaceholder')}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenantSubscriptionPriceManagement.modal.usageTypeLabel')}
                </label>
                <PSelect
                  required
                  disabled={!!price}
                  value={formData.usage_type}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, usage_type: e.target.value })}
                >
                  <option value="license">{t('tenantSubscriptionPriceManagement.usageType.license')}</option>
                  <option value="metered">{t('tenantSubscriptionPriceManagement.usageType.metered')}</option>
                  <option value="tiered">{t('tenantSubscriptionPriceManagement.usageType.tiered')}</option>
                </PSelect>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('tenantSubscriptionPriceManagement.modal.trialDaysLabel')}
              </label>
              <PInput
                type="number"
                min={0}
                value={formData.trial_days}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, trial_days: e.target.value })}
                placeholder={t('tenantSubscriptionPriceManagement.modal.trialDaysPlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('tenantSubscriptionPriceManagement.modal.metadataLabel')}
              </label>
              <PTextarea
                rows={4}
                value={formData.metadata}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, metadata: e.target.value })}
                placeholder={t('tenantSubscriptionPriceManagement.modal.metadataPlaceholder')}
              />
              <p className="mt-1 text-sm text-gray-500">
                {t('tenantSubscriptionPriceManagement.modal.metadataHint')}
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <PButton type="button" variant="secondary" onClick={onClose} disabled={submitting}>{t('tenantSubscriptionPriceManagement.actions.cancel')}</PButton>
              <PButton type="submit" loading={submitting}>{submitting ? t('tenantSubscriptionPriceManagement.actions.saving') : (price ? t('tenantSubscriptionPriceManagement.actions.update') : t('tenantSubscriptionPriceManagement.actions.create'))}</PButton>
            </div>
          </form>
        </div>
    </Modal>
  );
};

export default PriceManagement;
