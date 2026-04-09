import React, { useState, useEffect, useMemo } from 'react'
import { adminListProducts, adminCreateProduct, adminUpdateProduct, adminDeleteProduct } from '@api/subscription/subscription'
import { Product } from '@types/domain/subscription'
import { Link } from 'react-router-dom'
import { ChevronRightIcon, ExclamationTriangleIcon, PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline'
import AdminLayout from '@features/admin/components/AdminLayout'
import { adminTenantApi, AdminTenantResponse } from '@api/admin/tenant'
import PSelect from '@ui/PSelect'
import PButton from '@ui/PButton'
import PInput from '@ui/PInput'
import PTextarea from '@ui/PTextarea'
import PCheckbox from '@ui/PCheckbox'
import PTable, { PTableColumn, PTableAction } from '@ui/PTable'
import { ROUTES } from '@constants'
import { useI18n } from '@shared/i18n'

export default function AdminProducts() {
  const { t } = useI18n()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [tenants, setTenants] = useState<AdminTenantResponse[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(20)
  const [total, setTotal] = useState<number>(0)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    is_active: true
  })

  useEffect(() => {
    fetchTenants()
    fetchProducts()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [selectedTenantId])

  useEffect(() => {
    fetchProducts()
  }, [selectedTenantId, page, pageSize])

  const fetchTenants = async () => {
    try {
      const res = await adminTenantApi.getTenantList({ page: 1, limit: 1000 })
      setTenants(res.tenants || [])
    } catch (e) {
      console.error(t('adminSubscriptionProducts.logs.fetchTenantsFailed'), e)
    }
  }

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (selectedTenantId) params.tenant_id = parseInt(selectedTenantId)
      params.page = page
      params.page_size = pageSize
      const res = await adminListProducts(params)
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
      const pager = extractPager(res)
      setProducts(pager.list)
      setTotal(pager.total)
      setTotalPages(pager.totalPages)
    } catch (error) {
      console.error(t('adminSubscriptionProducts.logs.fetchProductsFailed'), error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingProduct) {
        await adminUpdateProduct(editingProduct.ID, formData)
      } else {
        await adminCreateProduct(formData)
      }
      setShowModal(false)
      setEditingProduct(null)
      setFormData({ code: '', name: '', description: '', is_active: true })
      fetchProducts()
    } catch (error) {
      console.error(t('adminSubscriptionProducts.logs.operationFailed'), error)
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      code: product.Code,
      name: product.Name,
      description: product.Description || '',
      is_active: true
    })
    setShowModal(true)
  }

  const handleDeleteClick = (product: Product) => {
    setDeleteTarget(product)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    
    try {
      setDeleting(true)
      await adminDeleteProduct(deleteTarget.ID)
      await fetchProducts()
      setShowDeleteModal(false)
      setDeleteTarget(null)
    } catch (error) {
      console.error(t('adminSubscriptionProducts.logs.deleteFailed'), error)
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteModal(false)
    setDeleteTarget(null)
  }

  const tenantMap = useMemo(() => {
    const m = new Map<number, AdminTenantResponse>()
    tenants.forEach(t => m.set(t.id, t))
    return m
  }, [tenants])

  const renderTenantInfo = (tenantId?: number) => {
    if (!tenantId) return <span className="text-gray-400">{t('adminSubscriptionProducts.tenant.systemLevel')}</span>
    const tenant = tenantMap.get(tenantId)
    if (!tenant) return <span className="text-gray-400">{t('adminSubscriptionProducts.tenant.tenantId', { id: tenantId })}</span>
    return (
      <span>
        {t('adminSubscriptionProducts.tenant.summary', { name: tenant.name, code: tenant.code, plan: tenant.plan, status: tenant.status })}
      </span>
    )
  }

  if (loading) {
    return (
      <AdminLayout title={t('adminSubscriptionProducts.layoutTitle')}>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">{t('adminSubscriptionProducts.common.loading')}</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title={t('adminSubscriptionProducts.layoutTitle')}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">{t('adminSubscriptionProducts.title')}</h1>
          <div className="flex items-center space-x-3">
            <PSelect
              value={selectedTenantId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedTenantId(e.target.value)}
            >
              <option value="">{t('adminSubscriptionProducts.filters.allTenants')}</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
              ))}
            </PSelect>
            <PButton type="button" onClick={() => setShowModal(true)} leftIcon={<PlusIcon className="h-5 w-5" />}>{t('adminSubscriptionProducts.actions.createProduct')}</PButton>
          </div>
        </div>
        {(() => {
          const columns: PTableColumn<Product>[] = [
            { key: 'name', title: t('adminSubscriptionProducts.table.name'), dataIndex: 'Name' as any },
            { key: 'code', title: t('adminSubscriptionProducts.table.code'), dataIndex: 'Code' as any },
            { key: 'desc', title: t('adminSubscriptionProducts.table.description'), render: (row) => row.Description || '-' },
            { key: 'tenant', title: t('adminSubscriptionProducts.table.tenant'), render: (row) => renderTenantInfo(row.TenantID as unknown as number) },
          ]

          const actions: PTableAction<Product>[] = [
            { key: 'edit', label: t('adminSubscriptionProducts.actions.edit'), icon: <PencilIcon className="h-4 w-4" />, variant: 'secondary', size: 'sm', onClick: (row) => handleEdit(row) },
            { key: 'delete', label: t('adminSubscriptionProducts.actions.delete'), icon: <TrashIcon className="h-4 w-4" />, variant: 'danger', size: 'sm', confirm: t('adminSubscriptionProducts.confirm.deleteProduct'), onClick: (row) => handleDeleteClick(row) },
          ]

          return (
            <PTable
              columns={columns}
              data={products}
              rowKey={(row) => row.ID}
              actions={actions}
              emptyText={t('adminSubscriptionProducts.empty.noProducts')}
              striped
            />
          )
        })()}

        <div className="flex items-center justify-between py-3">
          <div className="text-sm text-gray-600">{t('adminSubscriptionProducts.pagination.summary', { total, page, totalPages })}</div>
          <div className="flex items-center space-x-2">
            <PButton
              type="button"
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >{t('adminSubscriptionProducts.pagination.prev')}</PButton>
            <PButton
              type="button"
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >{t('adminSubscriptionProducts.pagination.next')}</PButton>
            <PSelect
              value={pageSize}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setPageSize(parseInt(e.target.value)); setPage(1) }}
            >
              <option value={10}>{t('adminSubscriptionProducts.pagination.pageSize', { size: 10 })}</option>
              <option value={20}>{t('adminSubscriptionProducts.pagination.pageSize', { size: 20 })}</option>
              <option value={50}>{t('adminSubscriptionProducts.pagination.pageSize', { size: 50 })}</option>
            </PSelect>
          </div>
        </div>

      {showModal && (
        <div className="fixed inset-0 !m-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-10">
          <div className="w-3/4 max-w-4xl p-5 border shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-6">
                {editingProduct ? t('adminSubscriptionProducts.modal.editTitle') : t('adminSubscriptionProducts.modal.createTitle')}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminSubscriptionProducts.form.code')}</label>
                    <PInput
                      type="text"
                      required
                      disabled={!!editingProduct}
                      value={formData.code}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, code: e.target.value })}
                      placeholder={t('adminSubscriptionProducts.form.codePlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminSubscriptionProducts.form.name')}</label>
                    <PInput
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t('adminSubscriptionProducts.form.namePlaceholder')}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminSubscriptionProducts.form.description')}</label>
                  <PTextarea
                    value={formData.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    placeholder={t('adminSubscriptionProducts.form.descriptionPlaceholder')}
                  />
                </div>

                <div className="flex items-center">
                  <PCheckbox
                    checked={formData.is_active}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, is_active: e.target.checked })}
                  >
                    {t('adminSubscriptionProducts.form.activeStatus')}
                  </PCheckbox>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <PButton
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowModal(false)
                      setEditingProduct(null)
                      setFormData({ code: '', name: '', description: '', is_active: true })
                    }}
                  >
                    {t('adminSubscriptionProducts.actions.cancel')}
                  </PButton>
                  <PButton type="submit">
                    {editingProduct ? t('adminSubscriptionProducts.actions.update') : t('adminSubscriptionProducts.actions.create')}
                  </PButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 !m-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">
                {t('adminSubscriptionProducts.deleteModal.title')}
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  {t('adminSubscriptionProducts.deleteModal.confirmText')}
                </p>
                <div className="mt-3 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm font-medium text-gray-900">
                    {deleteTarget.Name}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('adminSubscriptionProducts.deleteModal.code', { code: deleteTarget.Code })}
                  </p>
                  {deleteTarget.Description && (
                    <p className="text-sm text-gray-500 mt-1">
                      {deleteTarget.Description}
                    </p>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  {t('adminSubscriptionProducts.deleteModal.warning')}
                </p>
              </div>
              <div className="flex justify-center space-x-3 mt-4">
                <PButton
                  type="button"
                  variant="secondary"
                  onClick={handleDeleteCancel}
                  disabled={deleting}
                >
                  {t('adminSubscriptionProducts.actions.cancel')}
                </PButton>
                <PButton
                  type="button"
                  variant="danger"
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                >
                  {deleting ? t('adminSubscriptionProducts.deleteModal.deleting') : t('adminSubscriptionProducts.deleteModal.confirmDelete')}
                </PButton>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  )
}