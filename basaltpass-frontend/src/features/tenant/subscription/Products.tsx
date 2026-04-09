import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import TenantLayout from '@features/tenant/components/TenantLayout'
import { PInput, PButton, PTextarea, Modal, PPageHeader } from '@ui'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

import {
  tenantSubscriptionAPI,
  TenantProduct,
  CreateTenantProductRequest,
  UpdateTenantProductRequest,
} from '@api/tenant/subscription'
import { ROUTES } from '@constants'
import { useI18n } from '@shared/i18n'

export default function TenantProducts() {
  const { t, locale } = useI18n()
  const [searchParams] = useSearchParams()
  const [products, setProducts] = useState<TenantProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<TenantProduct | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TenantProduct | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [formData, setFormData] = useState<CreateTenantProductRequest>({
    code: '',
    name: '',
    description: '',
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
      const data = await tenantSubscriptionAPI.adminListProducts()
      setProducts(data.data || [])
    } catch (error) {
      console.error(t('tenantSubscriptionProducts.logs.loadFailed'), error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingProduct) {
        await tenantSubscriptionAPI.updateProduct(editingProduct.ID, formData as UpdateTenantProductRequest)
      } else {
        await tenantSubscriptionAPI.createProduct(formData)
      }
      setShowModal(false)
      setEditingProduct(null)
      resetForm()
      fetchData()
    } catch (error) {
      console.error(t('tenantSubscriptionProducts.logs.operationFailed'), error)
    }
  }

  const handleEdit = (product: TenantProduct) => {
    setEditingProduct(product)
    setFormData({
      code: product.Code,
      name: product.Name,
      description: product.Description,
      metadata: product.Metadata || {},
    })
    setShowModal(true)
  }

  const handleDeleteClick = (product: TenantProduct) => {
    setDeleteTarget(product)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    
    try {
      setDeleting(true)
      await tenantSubscriptionAPI.deleteProduct(deleteTarget.ID)
      await fetchData()
      setShowDeleteModal(false)
      setDeleteTarget(null)
    } catch (error) {
      console.error(t('tenantSubscriptionProducts.logs.deleteFailed'), error)
    } finally {
      setDeleting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      metadata: {},
    })
  }

  if (loading) {
    return (
      <TenantLayout title={t('tenantSubscriptionProducts.layoutTitle')}>
        <div className="animate-pulse">
          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            <ul className="divide-y divide-gray-200">
              {[1, 2, 3].map((i) => (
                <li key={i} className="px-4 py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="h-8 w-16 bg-gray-200 rounded"></div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </TenantLayout>
    )
  }

  return (
    <TenantLayout title={t('tenantSubscriptionProducts.layoutTitle')}>
      <div>
        <PPageHeader
          title={t('tenantSubscriptionProducts.title')}
          description={t('tenantSubscriptionProducts.description')}
          actions={
            <PButton onClick={() => setShowModal(true)} leftIcon={<PlusIcon className="h-5 w-5" />}>
              {t('tenantSubscriptionProducts.actions.createProduct')}
            </PButton>
          }
        />

        {/*  */}
        <div className="mb-6 overflow-hidden rounded-xl bg-white shadow-sm">
          <ul className="divide-y divide-gray-200">
            {products.length > 0 ? (
              products.map((product) => (
                <li key={product.ID}>
                  <div className="px-4 py-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-600 truncate">
                            {product.Name}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            {t('tenantSubscriptionProducts.fields.code')}: {product.Code} | 
                            {t('tenantSubscriptionProducts.fields.planCount')}: {product.Plans?.length || 0}
                          </p>
                          {product.Description && (
                            <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                              {product.Description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <PButton
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(product)}
                        className="text-blue-600 hover:text-blue-800"
                        title={t('tenantSubscriptionProducts.actions.editProduct')}
                      >
                        <PencilIcon className="h-5 w-5" />
                      </PButton>
                      <PButton
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(product)}
                        className="text-red-600 hover:text-red-700"
                        title={t('tenantSubscriptionProducts.actions.deleteProduct')}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </PButton>
                    </div>
                  </div>
                </li>
              ))
            ) : (
              <li className="px-4 py-12 text-center text-gray-500">
                <div className="text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">{t('tenantSubscriptionProducts.empty.title')}</h3>
                  <p className="mt-1 text-sm text-gray-500">{t('tenantSubscriptionProducts.empty.description')}</p>
                  <div className="mt-6">
                    <PButton onClick={() => setShowModal(true)}>
                      <span className="inline-flex items-center gap-2">
                        <PlusIcon className="h-5 w-5" /> {t('tenantSubscriptionProducts.actions.createProduct')}
                      </span>
                    </PButton>
                  </div>
                </div>
              </li>
            )}
          </ul>
        </div>

      {/* / */}
      {showModal && (
        <Modal
          open={showModal}
          onClose={() => {
            setShowModal(false)
            setEditingProduct(null)
            resetForm()
          }}
          title={editingProduct ? t('tenantSubscriptionProducts.actions.editProduct') : t('tenantSubscriptionProducts.actions.createProduct')}
          widthClass="max-w-md"
        >
              {/*  */}
              {/*  */}
                <form onSubmit={handleSubmit}>
                  {/*  */}
                  <div className="mb-6">
                    <PInput
                      label={<span>{t('tenantSubscriptionProducts.fields.productCode')} <span className="text-red-500">*</span></span>}
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder={t('tenantSubscriptionProducts.placeholders.productCode')}
                      disabled={!!editingProduct}
                    />
                    {editingProduct && (
                      <p className="mt-2 rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-700">
                        {t('tenantSubscriptionProducts.hints.codeImmutable')}
                      </p>
                    )}
                  </div>

                  {/*  */}
                  <div className="mb-6">
                    <PInput
                      label={<span>{t('tenantSubscriptionProducts.fields.productName')} <span className="text-red-500">*</span></span>}
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t('tenantSubscriptionProducts.placeholders.productName')}
                    />
                  </div>

                  {/*  */}
                  <div className="mb-8">
                    <PTextarea
                      label={t('tenantSubscriptionProducts.fields.productDescription')}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={4}
                      placeholder={t('tenantSubscriptionProducts.placeholders.productDescription')}
                    />
                  </div>

                  {/*  */}
                  <div className="flex justify-end gap-3">
                    <PButton
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setShowModal(false)
                        setEditingProduct(null)
                        resetForm()
                      }}
                    >
                      {t('tenantSubscriptionProducts.actions.cancel')}
                    </PButton>
                    <PButton type="submit">
                      {editingProduct ? t('tenantSubscriptionProducts.actions.saveChanges') : t('tenantSubscriptionProducts.actions.createProduct')}
                    </PButton>
                  </div>
                </form>
        </Modal>
        )}

      {/*  */}
      {showDeleteModal && deleteTarget && (
        <Modal
          open={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false)
            setDeleteTarget(null)
          }}
          title={t('tenantSubscriptionProducts.deleteModal.title')}
          widthClass="max-w-md"
        >
              <div className="mt-3 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    {t('tenantSubscriptionProducts.deleteModal.confirmMessage', { name: deleteTarget.Name })}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('tenantSubscriptionProducts.deleteModal.warning')}
                  </p>
                </div>
                <div className="flex justify-center gap-3 mt-4">
                  <PButton
                    onClick={() => {
                      setShowDeleteModal(false)
                      setDeleteTarget(null)
                    }}
                    disabled={deleting}
                    variant="secondary"
                  >
                    {t('tenantSubscriptionProducts.actions.cancel')}
                  </PButton>
                  <PButton
                    onClick={handleDeleteConfirm}
                    loading={deleting}
                    variant="danger"
                  >
                    {t('tenantSubscriptionProducts.actions.confirmDelete')}
                  </PButton>
                </div>
              </div>
        </Modal>
        )}
      </div>
    </TenantLayout>
  )
}
