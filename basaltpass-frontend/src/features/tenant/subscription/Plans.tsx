import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import TenantLayout from '@features/tenant/components/TenantLayout'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

import {
  tenantSubscriptionAPI,
  TenantPlan,
  TenantProduct,
  CreateTenantPlanRequest,
  UpdateTenantPlanRequest,
} from '@api/tenant/subscription'
import { PInput, PSelect, PButton, PSkeleton, Modal, PPageHeader } from '@ui'
import PTable, { PTableColumn, PTableAction } from '@ui/PTable'
import { ROUTES } from '@constants'
import { useI18n } from '@shared/i18n'

export default function TenantPlans() {
  const { t, locale } = useI18n()
  const [searchParams] = useSearchParams()
  const [plans, setPlans] = useState<TenantPlan[]>([])
  const [products, setProducts] = useState<TenantProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState<TenantPlan | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TenantPlan | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [formData, setFormData] = useState<CreateTenantPlanRequest>({
    product_id: 0,
    code: '',
    display_name: '',
    plan_version: 1,
    metadata: {},
  })

  useEffect(() => {
    fetchData()
    
    // 
    if (searchParams.get('action') === 'create') {
      setShowModal(true)
    }
  }, [searchParams])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [plansRes, productsRes] = await Promise.all([
        tenantSubscriptionAPI.adminListPlans(),
        tenantSubscriptionAPI.adminListProducts()
      ])
      setPlans(plansRes.data || [])
      setProducts(productsRes.data || [])
    } catch (error) {
      console.error(t('tenantSubscriptionPlans.logs.loadFailed'), error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingPlan) {
        await tenantSubscriptionAPI.updatePlan(editingPlan.ID, formData as UpdateTenantPlanRequest)
      } else {
        await tenantSubscriptionAPI.createPlan(formData)
      }
      setShowModal(false)
      setEditingPlan(null)
      resetForm()
      fetchData()
    } catch (error) {
      console.error(t('tenantSubscriptionPlans.logs.operationFailed'), error)
    }
  }

  const handleEdit = (plan: TenantPlan) => {
    setEditingPlan(plan)
    setFormData({
      product_id: plan.ProductID,
      code: plan.Code,
      display_name: plan.DisplayName,
      plan_version: plan.PlanVersion,
      metadata: plan.Metadata || {},
    })
    setShowModal(true)
  }

  const handleDeleteClick = (plan: TenantPlan) => {
    setDeleteTarget(plan)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    
    try {
      setDeleting(true)
      await tenantSubscriptionAPI.deletePlan(deleteTarget.ID)
      await fetchData()
      setShowDeleteModal(false)
      setDeleteTarget(null)
    } catch (error) {
      console.error(t('tenantSubscriptionPlans.logs.deleteFailed'), error)
    } finally {
      setDeleting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      product_id: 0,
      code: '',
      display_name: '',
      plan_version: 1,
      metadata: {},
    })
  }

  const handleCancel = () => {
    setShowModal(false)
    setEditingPlan(null)
    resetForm()
  }

  const getProductName = (productId: number) => {
    const product = products.find(p => p.ID === productId)
    return product ? product.Name : t('tenantSubscriptionPlans.fields.productWithId', { id: productId })
  }

  if (loading) {
    return (
      <TenantLayout>
        <div className="py-6">
          <PSkeleton.Management />
        </div>
      </TenantLayout>
    )
  }

  return (
    <TenantLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/*  */}
          <PPageHeader
            title={t('tenantSubscriptionPlans.title')}
            description={t('tenantSubscriptionPlans.description')}
            actions={<PButton type="button" onClick={() => setShowModal(true)} leftIcon={<PlusIcon className="h-5 w-5" />}>{t('tenantSubscriptionPlans.actions.createPlan')}</PButton>}
          />

          {/* （） */}
          <div className="mt-8">
            {(() => {
              const columns: PTableColumn<TenantPlan>[] = [
                { key: 'name', title: t('tenantSubscriptionPlans.table.plan'), render: (row) => row.DisplayName },
                { key: 'code', title: t('tenantSubscriptionPlans.table.code'), dataIndex: 'Code' as any },
                { key: 'product', title: t('tenantSubscriptionPlans.table.product'), render: (row) => getProductName(row.ProductID) },
                { key: 'version', title: t('tenantSubscriptionPlans.table.version'), render: (row) => `v${row.PlanVersion}` },
                { key: 'prices', title: t('tenantSubscriptionPlans.table.priceCount'), render: (row) => row.Prices?.length || 0 },
                { key: 'created', title: t('tenantSubscriptionPlans.table.createdAt'), render: (row) => new Date(row.CreatedAt).toLocaleString(locale) },
              ];

              const actions: PTableAction<TenantPlan>[] = [
                { key: 'edit', label: t('tenantSubscriptionPlans.actions.edit'), icon: <PencilIcon className="h-4 w-4" />, variant: 'secondary', size: 'sm', onClick: (row) => handleEdit(row) },
                { key: 'delete', label: t('tenantSubscriptionPlans.actions.delete'), icon: <TrashIcon className="h-4 w-4" />, variant: 'danger', size: 'sm', confirm: t('tenantSubscriptionPlans.deleteModal.confirmAction'), onClick: (row) => handleDeleteClick(row) },
              ];

              return (
                <PTable
                  columns={columns}
                  data={plans}
                  rowKey={(row) => row.ID}
                  actions={actions}
                  emptyText={t('tenantSubscriptionPlans.empty.table')}
                  emptyContent={<PButton type="button" onClick={() => setShowModal(true)} leftIcon={<PlusIcon className="h-5 w-5" />}>{t('tenantSubscriptionPlans.actions.createPlan')}</PButton>}
                  striped
                  size="md"
                />
              );
            })()}
          </div>
        </div>
      </div>

      {/* / */}
      {showModal && (
        <Modal open={showModal} onClose={handleCancel} title={editingPlan ? t('tenantSubscriptionPlans.actions.editPlan') : t('tenantSubscriptionPlans.actions.createPlan')} widthClass="max-w-md">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              {editingPlan ? t('tenantSubscriptionPlans.actions.editPlan') : t('tenantSubscriptionPlans.actions.createPlan')}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <PSelect
                label={t('tenantSubscriptionPlans.fields.product')}
                value={formData.product_id}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, product_id: parseInt(e.target.value) })}
                required
                disabled={!!editingPlan}
              >
                <option value="">{t('tenantSubscriptionPlans.fields.selectProduct')}</option>
                {products.map((product) => (
                  <option key={product.ID} value={product.ID}>
                    {product.Name}
                  </option>
                ))}
              </PSelect>
              <PInput
                label={t('tenantSubscriptionPlans.fields.planCode')}
                type="text"
                value={formData.code}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, code: e.target.value })}
                required
                disabled={!!editingPlan}
              />
              <PInput
                label={t('tenantSubscriptionPlans.fields.planName')}
                type="text"
                value={formData.display_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, display_name: e.target.value })}
                required
              />
              <PInput
                label={t('tenantSubscriptionPlans.fields.planVersion')}
                type="number"
                value={formData.plan_version}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, plan_version: parseInt(e.target.value) })}
                min={1}
                required
                disabled={!!editingPlan}
              />
              <div className="flex justify-end space-x-3 pt-4">
                <PButton type="button" variant="secondary" onClick={handleCancel}>{t('tenantSubscriptionPlans.actions.cancel')}</PButton>
                <PButton type="submit">{editingPlan ? t('tenantSubscriptionPlans.actions.update') : t('tenantSubscriptionPlans.actions.create')}</PButton>
              </div>
            </form>
        </Modal>
      )}

      {/*  */}
      {showDeleteModal && deleteTarget && (
        <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} title={t('tenantSubscriptionPlans.deleteModal.title')} widthClass="max-w-md">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-center text-gray-900 mb-2">{t('tenantSubscriptionPlans.deleteModal.title')}</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              {t('tenantSubscriptionPlans.deleteModal.confirmMessage', { name: deleteTarget.DisplayName })}
            </p>
            <div className="flex justify-center space-x-3">
              <PButton
                type="button"
                variant="secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                {t('tenantSubscriptionPlans.actions.cancel')}
              </PButton>
              <PButton
                type="button"
                variant="danger"
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                {deleting ? t('tenantSubscriptionPlans.actions.deleting') : t('tenantSubscriptionPlans.actions.confirmDelete')}
              </PButton>
            </div>
        </Modal>
      )}
    </TenantLayout>
  )
}
