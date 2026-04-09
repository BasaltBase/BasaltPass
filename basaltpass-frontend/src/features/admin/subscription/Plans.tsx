import React, { useState, useEffect, useMemo } from 'react'
import { adminListPlans, adminCreatePlan, adminUpdatePlan, adminDeletePlan, adminListProducts } from '@api/subscription/subscription'
import { Plan, Product } from '@types/domain/subscription'
import { ExclamationTriangleIcon, PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline'
import AdminLayout from '@features/admin/components/AdminLayout'
import { adminTenantApi, AdminTenantResponse } from '@api/admin/tenant'
import PSelect from '@ui/PSelect'
import PButton from '@ui/PButton'
import PInput from '@ui/PInput'
import PTextarea from '@ui/PTextarea'
import PCheckbox from '@ui/PCheckbox'
import PTable, { PTableColumn, PTableAction } from '@ui/PTable'
import { useI18n } from '@shared/i18n'

export default function AdminPlans() {
  const { t } = useI18n()
  const [plans, setPlans] = useState<Plan[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [tenants, setTenants] = useState<AdminTenantResponse[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(20)
  const [total, setTotal] = useState<number>(0)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [formData, setFormData] = useState({
    product_id: '',
    code: '',
    display_name: '',
    description: '',
    plan_version: 1,
    is_active: true
  })

  useEffect(() => {
    fetchTenants()
    fetchData()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [selectedTenantId])

  useEffect(() => {
    fetchData()
  }, [selectedTenantId, page, pageSize])

  const fetchTenants = async () => {
    try {
      const res = await adminTenantApi.getTenantList({ page: 1, limit: 1000 })
      setTenants(res.tenants || [])
    } catch (e) {
      console.error(t('adminSubscriptionPlans.logs.fetchTenantsFailed'), e)
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
  const params: any = {}
      if (selectedTenantId) params.tenant_id = parseInt(selectedTenantId)
  params.page = page
  params.page_size = pageSize
      const [plansRes, productsRes] = await Promise.all([
        adminListPlans(params),
        adminListProducts(params)
      ])
      const extractPager = (body: any) => {
        const p = body?.data ?? body?.Data ?? body
        const list = Array.isArray(p?.data)
          ? p.data
          : Array.isArray(p?.Data)
          ? p.Data
          : Array.isArray(body?.data?.data)
          ? body.data.data
          : Array.isArray(body?.data?.Data)
          ? body.data.Data
          : []
        const total = p?.total ?? p?.Total ?? body?.data?.total ?? 0
        const pageVal = p?.page ?? p?.Page ?? body?.data?.page ?? 1
        const pageSizeVal = p?.page_size ?? p?.PageSize ?? body?.data?.page_size ?? 20
        const totalPagesVal = p?.total_pages ?? p?.TotalPages ?? body?.data?.total_pages ?? Math.ceil((total || 0) / (pageSizeVal || 1))
        return { list, total, page: pageVal, pageSize: pageSizeVal, totalPages: totalPagesVal }
      }

      const plansPager = extractPager(plansRes)
      setPlans(plansPager.list)
      setTotal(plansPager.total)
      setTotalPages(plansPager.totalPages)

      const productsPager = extractPager(productsRes)
      setProducts(productsPager.list)
    } catch (error) {
      console.error(t('adminSubscriptionPlans.logs.fetchDataFailed'), error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const submitData = {
        ...formData,
        product_id: parseInt(formData.product_id)
      }
      
      if (editingPlan) {
        await adminUpdatePlan(editingPlan.ID, submitData)
      } else {
        await adminCreatePlan(submitData)
      }
      setShowModal(false)
      setEditingPlan(null)
      setFormData({
        product_id: '',
        code: '',
        display_name: '',
        description: '',
        plan_version: 1,
        is_active: true
      })
      fetchData()
    } catch (error) {
      console.error(t('adminSubscriptionPlans.logs.operationFailed'), error)
    }
  }

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan)
    setFormData({
      product_id: plan.ProductID?.toString() || '',
      code: plan.Code || '',
      display_name: plan.DisplayName,
      description: plan.Description || '',
      plan_version: plan.PlanVersion,
      is_active: true
    })
    setShowModal(true)
  }

  const handleDeleteClick = (plan: Plan) => {
    setDeleteTarget(plan)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    
    try {
      setDeleting(true)
      await adminDeletePlan(deleteTarget.ID)
      await fetchData()
      setShowDeleteModal(false)
      setDeleteTarget(null)
    } catch (error) {
      console.error(t('adminSubscriptionPlans.logs.deleteFailed'), error)
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteModal(false)
    setDeleteTarget(null)
  }

  const getProductName = (productId: number) => {
    const product = products.find(p => p.ID === productId)
    return product ? product.Name : t('adminSubscriptionPlans.common.unknownProduct')
  }

  const tenantMap = useMemo(() => {
    const m = new Map<number, AdminTenantResponse>()
    tenants.forEach(tenantItem => m.set(tenantItem.id, tenantItem))
    return m
  }, [tenants])

  const renderTenantInfo = (tenantId?: number) => {
    if (!tenantId) return <span className="text-gray-400">{t('adminSubscriptionPlans.tenant.systemLevel')}</span>
    const tenant = tenantMap.get(tenantId)
    if (!tenant) return <span className="text-gray-400">{t('adminSubscriptionPlans.tenant.tenantId', { id: tenantId })}</span>
    return (
      <span>
        {t('adminSubscriptionPlans.tenant.summary', { name: tenant.name, code: tenant.code, plan: tenant.plan, status: tenant.status })}
      </span>
    )
  }

  if (loading) {
    return (
      <AdminLayout title={t('adminSubscriptionPlans.layoutTitle')}>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">{t('adminSubscriptionPlans.common.loading')}</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title={t('adminSubscriptionPlans.layoutTitle')}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">{t('adminSubscriptionPlans.title')}</h1>
          <div className="flex items-center space-x-3">
            <PSelect
              value={selectedTenantId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedTenantId(e.target.value)}
            >
              <option value="">{t('adminSubscriptionPlans.filters.allTenants')}</option>
              {tenants.map(tenantItem => (
                <option key={tenantItem.id} value={tenantItem.id}>{tenantItem.name} ({tenantItem.code})</option>
              ))}
            </PSelect>
            <PButton type="button" onClick={() => setShowModal(true)} leftIcon={<PlusIcon className="h-5 w-5" />}>{t('adminSubscriptionPlans.actions.createPlan')}</PButton>
          </div>
        </div>
        {(() => {
          const columns: PTableColumn<Plan>[] = [
            { key: 'name', title: t('adminSubscriptionPlans.table.name'), dataIndex: 'DisplayName' as any },
            { key: 'product', title: t('adminSubscriptionPlans.table.product'), render: (row) => getProductName(row.ProductID || 0) },
            { key: 'version', title: t('adminSubscriptionPlans.table.version'), render: (row) => `v${row.PlanVersion}` },
            { key: 'desc', title: t('adminSubscriptionPlans.table.description'), render: (row) => row.Description || '-' },
            { key: 'tenant', title: t('adminSubscriptionPlans.table.tenant'), render: (row) => renderTenantInfo(row.TenantID as unknown as number) },
          ]

          const actions: PTableAction<Plan>[] = [
            { key: 'edit', label: t('adminSubscriptionPlans.actions.edit'), icon: <PencilIcon className="h-4 w-4" />, variant: 'secondary', size: 'sm', onClick: (row) => handleEdit(row) },
            { key: 'delete', label: t('adminSubscriptionPlans.actions.delete'), icon: <TrashIcon className="h-4 w-4" />, variant: 'danger', size: 'sm', confirm: t('adminSubscriptionPlans.confirm.deletePlan'), onClick: (row) => handleDeleteClick(row) },
          ]

          return (
            <PTable
              columns={columns}
              data={plans}
              rowKey={(row) => row.ID}
              actions={actions}
              emptyText={t('adminSubscriptionPlans.empty.noPlans')}
              striped
            />
          )
        })()}

        <div className="flex items-center justify-between py-3">
          <div className="text-sm text-gray-600">{t('adminSubscriptionPlans.pagination.summary', { total, page, totalPages })}</div>
          <div className="flex items-center space-x-2">
            <PButton type="button" variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>{t('adminSubscriptionPlans.pagination.prev')}</PButton>
            <PButton type="button" variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>{t('adminSubscriptionPlans.pagination.next')}</PButton>
            <PSelect value={pageSize} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setPageSize(parseInt(e.target.value)); setPage(1) }}>
              <option value={10}>{t('adminSubscriptionPlans.pagination.pageSize', { size: 10 })}</option>
              <option value={20}>{t('adminSubscriptionPlans.pagination.pageSize', { size: 20 })}</option>
              <option value={50}>{t('adminSubscriptionPlans.pagination.pageSize', { size: 50 })}</option>
            </PSelect>
          </div>
        </div>

      {showModal && (
        <div className="fixed inset-0 !m-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-10">
          <div className="w-3/4 max-w-4xl rounded-2xl border bg-white p-6 shadow-xl">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-6">
                {editingPlan ? t('adminSubscriptionPlans.modal.editTitle') : t('adminSubscriptionPlans.modal.createTitle')}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminSubscriptionPlans.form.product')}</label>
                    <PSelect
                      required
                      value={formData.product_id}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, product_id: e.target.value })}
                    >
                      <option value="">{t('adminSubscriptionPlans.form.selectProduct')}</option>
                      {products.map((product) => (
                        <option key={product.ID} value={product.ID}>
                          {product.Name}
                        </option>
                      ))}
                    </PSelect>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminSubscriptionPlans.form.code')}</label>
                    <PInput
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, code: e.target.value })}
                      placeholder={t('adminSubscriptionPlans.form.codePlaceholder')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminSubscriptionPlans.form.name')}</label>
                    <PInput
                      type="text"
                      required
                      value={formData.display_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, display_name: e.target.value })}
                      placeholder={t('adminSubscriptionPlans.form.namePlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminSubscriptionPlans.form.version')}</label>
                    <PInput
                      type="number"
                      min={1}
                      required
                      value={formData.plan_version}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, plan_version: parseInt(e.target.value) })}
                      placeholder={t('adminSubscriptionPlans.form.versionPlaceholder')}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminSubscriptionPlans.form.description')}</label>
                  <PTextarea
                    value={formData.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    placeholder={t('adminSubscriptionPlans.form.descriptionPlaceholder')}
                  />
                </div>

                <div className="flex items-center">
                  <PCheckbox
                    checked={formData.is_active}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, is_active: e.target.checked })}
                  >
                    {t('adminSubscriptionPlans.form.activeStatus')}
                  </PCheckbox>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <PButton
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowModal(false)
                      setEditingPlan(null)
                      setFormData({
                        product_id: '',
                        code: '',
                        display_name: '',
                        description: '',
                        plan_version: 1,
                        is_active: true
                      })
                    }}
                  >
                    {t('adminSubscriptionPlans.actions.cancel')}
                  </PButton>
                  <PButton type="submit">
                    {editingPlan ? t('adminSubscriptionPlans.actions.update') : t('adminSubscriptionPlans.actions.create')}
                  </PButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 !m-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto w-96 rounded-2xl border bg-white p-5 shadow-xl">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">
                {t('adminSubscriptionPlans.deleteModal.title')}
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  {t('adminSubscriptionPlans.deleteModal.confirmText')}
                </p>
                <div className="mt-3 rounded-lg bg-gray-50 p-3">
                  <p className="text-sm font-medium text-gray-900">
                    {deleteTarget.DisplayName}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('adminSubscriptionPlans.deleteModal.product', { name: getProductName(deleteTarget.ProductID || 0) })}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('adminSubscriptionPlans.deleteModal.version', { version: deleteTarget.PlanVersion })}
                  </p>
                  {deleteTarget.Description && (
                    <p className="text-sm text-gray-500 mt-1">
                      {deleteTarget.Description}
                    </p>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  {t('adminSubscriptionPlans.deleteModal.warning')}
                </p>
              </div>
              <div className="flex justify-center space-x-3 mt-4">
                <PButton type="button" variant="secondary" onClick={handleDeleteCancel} disabled={deleting}>{t('adminSubscriptionPlans.actions.cancel')}</PButton>
                <PButton type="button" variant="danger" onClick={handleDeleteConfirm} disabled={deleting}>{deleting ? t('adminSubscriptionPlans.deleteModal.deleting') : t('adminSubscriptionPlans.deleteModal.confirmDelete')}</PButton>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  )
}
