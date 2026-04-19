import React, { useEffect, useState } from 'react'
import { uiAlert, uiConfirm } from '@contexts/DialogContext'
import { useNavigate } from 'react-router-dom'
import {
  KeyIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  TagIcon,
  ShieldCheckIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import TenantLayout from '@features/tenant/components/TenantLayout'
import { PInput, PSelect, PTextarea, PButton, PSkeleton, PBadge, PPageHeader, PManagedTableSection, PManagementFilterCard } from '@ui'
import { PManagementPageContainer } from '@ui'
import { type PTableColumn, type PTableAction } from '@ui/PTable'
import useDebounce from '@hooks/useDebounce'
import useLocalStorage from '@hooks/useLocalStorage'
import usePagination from '@hooks/usePagination'
import useManagedPaginationBar from '@hooks/useManagedPaginationBar'
import {
  getTenantPermissions,
  createTenantPermission,
  updateTenantPermission,
  deleteTenantPermission,
  getTenantPermissionCategories,
  type TenantPermission,
  type CreateTenantPermissionRequest
} from '@api/tenant/tenantPermission'
import { ROUTES } from '@constants'
import { useI18n } from '@shared/i18n'

export default function TenantPermissionManagement() {
  const navigate = useNavigate()
  const { t, locale } = useI18n()
  
  const [permissions, setPermissions] = useState<TenantPermission[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const [selectedCategory, setSelectedCategory] = useLocalStorage<string>('tenant.permissions.selectedCategory', '')
  const [pageSize] = useLocalStorage<number>('tenant.permissions.pageSize', 20)

  const { pagination, setPage, setTotal, resetPage } = usePagination({ pageSize })

  const paginationBar = useManagedPaginationBar({
    currentPage: pagination.current,
    pageSize: pagination.pageSize,
    totalItems: pagination.total,
    onPageChange: setPage,
    summary: ({ start, end, total }) => t('tenantRoleManagement.pagination.summary', { start, end, total }),
    pageInfo: ({ currentPage, totalPages }) => t('tenantRoleManagement.pagination.pageInfo', { current: currentPage, total: totalPages }),
  })

  // 
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingPermission, setEditingPermission] = useState<TenantPermission | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  // 
  const [formData, setFormData] = useState<CreateTenantPermissionRequest>({
    code: '',
    name: '',
    description: '',
    category: ''
  })

  useEffect(() => {
    fetchPermissions()
    fetchCategories()
  }, [pagination.current, pagination.pageSize, debouncedSearchTerm, selectedCategory])

  useEffect(() => {
    resetPage()
  }, [debouncedSearchTerm, selectedCategory, resetPage])

  const fetchPermissions = async () => {
    try {
      setLoading(true)
      const response = await getTenantPermissions({
        page: pagination.current,
        page_size: pagination.pageSize,
        search: debouncedSearchTerm,
        category: selectedCategory || undefined
      })
      setPermissions(response.data.data.permissions || [])
      setTotal(response.data.data.pagination.total)
      setError('')
    } catch (err: any) {
      console.error(t('tenantPermissionManagement.logs.loadPermissionsFailed'), err)
      setError(err.response?.data?.error || t('tenantPermissionManagement.errors.loadPermissionsFailed'))
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await getTenantPermissionCategories()
      setCategories(response.data.data.categories || [])
    } catch (err: any) {
      console.error(t('tenantPermissionManagement.logs.loadCategoriesFailed'), err)
    }
  }

  const handleCreatePermission = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      category: ''
    })
    setEditingPermission(null)
    setShowCreateModal(true)
  }

  const handleEditPermission = (permission: TenantPermission) => {
    setFormData({
      code: permission.code,
      name: permission.name,
      description: permission.description,
      category: permission.category
    })
    setEditingPermission(permission)
    setShowEditModal(true)
  }

  const handleDeletePermission = async (permission: TenantPermission) => {
    if (!await uiConfirm(t('tenantPermissionManagement.confirm.deletePermission', { name: permission.name }))) {
      return
    }

    try {
      await deleteTenantPermission(permission.id)
      await fetchPermissions()
      uiAlert(t('tenantPermissionManagement.success.deleteSuccess'))
    } catch (err: any) {
      console.error(t('tenantPermissionManagement.logs.deleteFailed'), err)
      uiAlert(err.response?.data?.error || t('tenantPermissionManagement.errors.deleteFailed'))
    }
  }

  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      
      if (editingPermission) {
        // 
        await updateTenantPermission(editingPermission.id, formData)
        uiAlert(t('tenantPermissionManagement.success.updateSuccess'))
        setShowEditModal(false)
      } else {
        // 
        await createTenantPermission(formData)
        uiAlert(t('tenantPermissionManagement.success.createSuccess'))
        setShowCreateModal(false)
      }
      
      await fetchPermissions()
      await fetchCategories()
    } catch (err: any) {
      console.error(t('tenantPermissionManagement.logs.saveFailed'), err)
      uiAlert(err.response?.data?.error || t('tenantPermissionManagement.errors.saveFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const columns: PTableColumn<TenantPermission>[] = [
    {
      title: t('tenantPermissionManagement.table.code'),
      key: 'code',
      render: (permission) => (
        <div className="font-mono text-sm text-blue-600">{permission.code}</div>
      )
    },
    {
      title: t('tenantPermissionManagement.table.name'),
      key: 'name',
      render: (permission) => (
        <div className="font-medium text-gray-900">{permission.name}</div>
      )
    },
    {
      title: t('tenantPermissionManagement.table.category'),
      key: 'category',
      render: (permission) => (
        <PBadge variant="info" icon={<TagIcon className="h-3 w-3" />}>{permission.category}</PBadge>
      )
    },
    {
      title: t('tenantPermissionManagement.table.description'),
      key: 'description',
      render: (permission) => (
        <div className="text-sm text-gray-600 max-w-md truncate">
          {permission.description || '-'}
        </div>
      )
    },
    {
      title: t('tenantPermissionManagement.table.createdAt'),
      key: 'created_at',
      sortable: true,
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      align: 'right',
      render: (permission) => (
        <div className="text-sm text-gray-500">
          {new Date(permission.created_at).toLocaleString(locale)}
        </div>
      )
    }
  ]

  const actions: PTableAction<TenantPermission>[] = [
    {
      key: 'edit',
      label: t('tenantPermissionManagement.actions.edit'),
      onClick: handleEditPermission,
      icon: <PencilIcon className="h-4 w-4" />
    },
    {
      key: 'delete',
      label: t('tenantPermissionManagement.actions.delete'),
      onClick: handleDeletePermission,
      icon: <TrashIcon className="h-4 w-4" />,
      variant: 'danger'
    }
  ]

  if (error && permissions.length === 0) {
    return (
      <TenantLayout title={t('tenantPermissionManagement.layoutTitle')}>
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3" />
              <div className="flex-1">
                <h3 className="text-lg font-medium text-red-900">{t('tenantPermissionManagement.state.loadFailed')}</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
              <PButton onClick={() => { setError(''); fetchPermissions(); }}>{t('tenantPermissionManagement.actions.retry')}</PButton>
            </div>
          </div>
        </div>
      </TenantLayout>
    )
  }

  return (
    <TenantLayout title={t('tenantPermissionManagement.layoutTitle')}>
      <PManagementPageContainer
        header={
          <PPageHeader
            title={t('tenantPermissionManagement.header.title')}
            description={t('tenantPermissionManagement.header.description')}
            icon={<KeyIcon className="h-8 w-8 text-blue-600" />}
            actions={
              <div className="flex space-x-3">
                <PButton variant="secondary" onClick={() => navigate(ROUTES.tenant.roles)} leftIcon={<ShieldCheckIcon className="h-4 w-4" />}>{t('tenantPermissionManagement.actions.roleManagement')}</PButton>
                <PButton onClick={handleCreatePermission} leftIcon={<PlusIcon className="h-4 w-4" />}>{t('tenantPermissionManagement.actions.createPermission')}</PButton>
              </div>
            }
          />
        }
        filter={
          <PManagementFilterCard
            searchValue={searchTerm}
            onSearchChange={(value) => {
              setSearchTerm(value)
              setPage(1)
            }}
            searchPlaceholder={t('tenantPermissionManagement.search.placeholder')}
            rightContentClassName="lg:w-64"
            rightContent={
              <div className="relative">
                <FunnelIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <PSelect
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory((e.target as HTMLSelectElement).value)
                    setPage(1)
                  }}
                  className="pl-10"
                >
                  <option value="">{t('tenantPermissionManagement.search.allCategories')}</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </PSelect>
              </div>
            }
          />
        }
      >
        <PManagedTableSection<TenantPermission>
          data={permissions}
          columns={columns}
          actions={actions}
          rowKey={(row) => String(row.id)}
          loading={loading}
          emptyText={searchTerm || selectedCategory ? t('tenantPermissionManagement.empty.filtered') : t('tenantPermissionManagement.empty.noData')}
          emptyContent={!searchTerm && !selectedCategory ? (
            <PButton onClick={handleCreatePermission} leftIcon={<PlusIcon className="h-4 w-4" />}>
              {t('tenantPermissionManagement.actions.createPermission')}
            </PButton>
          ) : undefined}
          size="md"
          striped
          defaultSort={{ key: 'created_at', order: 'desc' }}
          pagination={paginationBar}
        />
      </PManagementPageContainer>

      {/*  */}
      {showCreateModal && (
        <PermissionModal
          title={t('tenantPermissionManagement.modal.createTitle')}
          formData={formData}
          setFormData={setFormData}
          submitting={submitting}
          onSubmit={handleSubmit}
          onClose={() => setShowCreateModal(false)}
          categories={categories}
        />
      )}

      {/*  */}
      {showEditModal && (
        <PermissionModal
          title={t('tenantPermissionManagement.modal.editTitle')}
          formData={formData}
          setFormData={setFormData}
          submitting={submitting}
          onSubmit={handleSubmit}
          onClose={() => setShowEditModal(false)}
          isEdit={true}
          categories={categories}
        />
      )}
    </TenantLayout>
  )
}

// 
const PermissionModal: React.FC<{
  title: string
  formData: CreateTenantPermissionRequest
  setFormData: (data: CreateTenantPermissionRequest) => void
  submitting: boolean
  onSubmit: () => void
  onClose: () => void
  isEdit?: boolean
  categories: string[]
}> = ({ title, formData, setFormData, submitting, onSubmit, onClose, isEdit = false, categories }) => {
  const { t } = useI18n()

  return (
    <div className="fixed inset-0 !m-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto w-full max-w-2xl rounded-2xl border bg-white p-5 shadow-xl">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <PButton
              variant="ghost"
              onClick={onClose}
            >
              <XMarkIcon className="h-6 w-6" />
            </PButton>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
            <div className="space-y-4">
              {/*  */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenantPermissionManagement.modal.codeLabel')} <span className="text-red-500">{t('tenantPermissionManagement.modal.required')}</span>
                </label>
                <PInput
                  type="text"
                  required
                  disabled={isEdit}
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: (e.target as HTMLInputElement).value })}
                  placeholder={t('tenantPermissionManagement.modal.codePlaceholder')}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {t('tenantPermissionManagement.modal.codeHint')}
                </p>
              </div>

              {/*  */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenantPermissionManagement.modal.nameLabel')} <span className="text-red-500">{t('tenantPermissionManagement.modal.required')}</span>
                </label>
                <PInput
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: (e.target as HTMLInputElement).value })}
                  placeholder={t('tenantPermissionManagement.modal.namePlaceholder')}
                />
              </div>

              {/*  */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenantPermissionManagement.modal.categoryLabel')} <span className="text-red-500">{t('tenantPermissionManagement.modal.required')}</span>
                </label>
                {categories.length > 0 ? (
                  <PSelect
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: (e.target as HTMLSelectElement).value })}
                  >
                    <option value="">{t('tenantPermissionManagement.modal.selectCategory')}</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="__new__">{t('tenantPermissionManagement.modal.newCategory')}</option>
                  </PSelect>
                ) : null}
                {(!categories.length || formData.category === '__new__') && (
                  <PInput
                    type="text"
                    required
                    value={formData.category === '__new__' ? '' : formData.category}
                    onChange={(e) => setFormData({ ...formData, category: (e.target as HTMLInputElement).value })}
                    placeholder={t('tenantPermissionManagement.modal.newCategoryPlaceholder')}
                    className="mt-2"
                  />
                )}
              </div>

              {/*  */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenantPermissionManagement.modal.descriptionLabel')}
                </label>
                <PTextarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: (e.target as HTMLTextAreaElement).value })}
                  placeholder={t('tenantPermissionManagement.modal.descriptionPlaceholder')}
                  rows={3}
                />
              </div>
            </div>

            {/*  */}
            <div className="mt-6 flex justify-end space-x-3">
              <PButton type="button" variant="secondary" onClick={onClose} disabled={submitting}>
                {t('tenantPermissionManagement.actions.cancel')}
              </PButton>
              <PButton type="submit" disabled={submitting}>
                {submitting ? t('tenantPermissionManagement.actions.submitting') : (isEdit ? t('tenantPermissionManagement.actions.update') : t('tenantPermissionManagement.actions.create'))}
              </PButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
