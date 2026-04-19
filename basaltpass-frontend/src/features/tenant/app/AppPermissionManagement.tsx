import React, { useEffect, useMemo, useState } from 'react'
import { uiAlert, uiConfirm } from '@contexts/DialogContext'
import { useParams, useNavigate } from 'react-router-dom'
import {
  KeyIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  TagIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import TenantLayout from '@features/tenant/components/TenantLayout'
import useClientPagination from '@hooks/useClientPagination'
import useManagedPaginationBar from '@hooks/useManagedPaginationBar'
import { PSkeleton, PInput, PSelect, PTextarea, PButton, PPageHeader, PBadge, PManagementFilterCard, PManagedTableSection, PManagementPageContainer } from '@ui'
import { type PTableColumn, type PTableAction } from '@ui/PTable'
import { tenantAppApi } from '@api/tenant/tenantApp'
import userPermissionsApi, { type Permission } from '@api/tenant/appPermissions'
import useDebounce from '@hooks/useDebounce'
import { useI18n } from '@shared/i18n'

export default function AppPermissionManagement() {
  const { t, locale } = useI18n()
  const { id: appId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const pageSize = 20
  
  const [app, setApp] = useState<any>(null)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 200)
  const [selectedCategory, setSelectedCategory] = useState('')
  
  // 
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  // 
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    category: ''
  })

  useEffect(() => {
    if (appId) {
      fetchAppData()
      fetchPermissions()
    }
  }, [appId])

  const fetchAppData = async () => {
    if (!appId) return
    
    try {
      const response = await tenantAppApi.getTenantApp(appId)
      setApp(response.data)
    } catch (err: any) {
      console.error(t('tenantAppPermissionManagement.logs.fetchAppFailed'), err)
      setError(err.response?.data?.error || t('tenantAppPermissionManagement.errors.fetchAppFailed'))
    }
  }

  const fetchPermissions = async () => {
    if (!appId) return
    
    try {
      setLoading(true)
      const response = await userPermissionsApi.getAppPermissions(appId)
      setPermissions(response.permissions || [])
    } catch (err: any) {
      console.error(t('tenantAppPermissionManagement.logs.fetchPermissionsFailed'), err)
      setError(err.response?.data?.error || t('tenantAppPermissionManagement.errors.fetchPermissionsFailed'))
    } finally {
      setLoading(false)
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

  const handleEditPermission = (permission: Permission) => {
    setFormData({
      code: permission.code,
      name: permission.name,
      description: permission.description || '',
      category: permission.category
    })
    setEditingPermission(permission)
    setShowEditModal(true)
  }

  const handleDeletePermission = async (permission: Permission) => {
    if (!appId) return
    
    if (!await uiConfirm(t('tenantAppPermissionManagement.confirmDelete', { name: permission.name }))) {
      return
    }

    try {
      await userPermissionsApi.deletePermission(appId, permission.id)
      await fetchPermissions()
      uiAlert(t('tenantAppPermissionManagement.success.deleteSuccess'))
    } catch (err: any) {
      console.error(t('tenantAppPermissionManagement.logs.deleteFailed'), err)
      uiAlert(err.response?.data?.error || t('tenantAppPermissionManagement.errors.deleteFailed'))
    }
  }

  const handleSubmit = async () => {
    if (!appId) return
    
    try {
      setSubmitting(true)
      
      if (editingPermission) {
        // 
        await userPermissionsApi.updatePermission(appId, editingPermission.id, {
          name: formData.name,
          description: formData.description,
          category: formData.category
        })
        uiAlert(t('tenantAppPermissionManagement.success.updateSuccess'))
        setShowEditModal(false)
      } else {
        // 
        await userPermissionsApi.createPermission(appId, formData)
        uiAlert(t('tenantAppPermissionManagement.success.createSuccess'))
        setShowCreateModal(false)
      }
      
      await fetchPermissions()
    } catch (err: any) {
      console.error(t('tenantAppPermissionManagement.logs.saveFailed'), err)
      uiAlert(err.response?.data?.error || t('tenantAppPermissionManagement.errors.saveFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const categories = useMemo(() => {
    return Array.from(new Set(permissions.map(p => p.category))).sort()
  }, [permissions])

  // 
  const filteredPermissions = useMemo(() => {
    return permissions.filter(permission => {
      const matchesSearch = debouncedSearchTerm === '' ||
        permission.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        permission.code.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (permission.description && permission.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))

      const matchesCategory = selectedCategory === '' || permission.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [permissions, debouncedSearchTerm, selectedCategory])
  const {
    currentPage,
    pageItems: paginatedPermissions,
    totalItems,
    setPage,
    resetPage,
  } = useClientPagination(filteredPermissions, pageSize)

  const paginationBar = useManagedPaginationBar({
    currentPage,
    pageSize,
    totalItems,
    onPageChange: setPage,
    summary: ({ start, end, total }) => t('tenantRoleManagement.pagination.summary', { start, end, total }),
    pageInfo: ({ currentPage: page, totalPages }) => t('tenantRoleManagement.pagination.pageInfo', { current: page, total: totalPages }),
  })

  useEffect(() => {
    resetPage()
  }, [debouncedSearchTerm, selectedCategory, resetPage])

  const columns: PTableColumn<Permission>[] = [
    {
      key: 'code',
      title: t('tenantAppPermissionManagement.table.permissionCode'),
      sortable: true,
      render: (row) => <div className="font-mono text-sm text-blue-600">{row.code}</div>
    },
    {
      key: 'name',
      title: t('tenantAppPermissionManagement.table.permissionName'),
      sortable: true,
      render: (row) => <div className="font-medium text-gray-900">{row.name}</div>
    },
    {
      key: 'category',
      title: t('tenantAppPermissionManagement.table.category'),
      sortable: true,
      render: (row) => <PBadge variant="info" icon={<TagIcon className="h-3 w-3" />}>{row.category}</PBadge>
    },
    {
      key: 'description',
      title: t('tenantAppPermissionManagement.table.description'),
      render: (row) => <div className="max-w-xl truncate text-sm text-gray-600">{row.description || '-'}</div>
    },
    {
      key: 'created_at',
      title: t('tenantAppPermissionManagement.table.createdAt'),
      align: 'right',
      sortable: true,
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      render: (row) => new Date(row.created_at).toLocaleString(locale)
    }
  ]

  const actions: PTableAction<Permission>[] = [
    {
      key: 'edit',
      label: t('tenantAppPermissionManagement.actions.edit'),
      icon: <PencilIcon className="h-4 w-4" />,
      variant: 'secondary',
      onClick: (row) => handleEditPermission(row)
    },
    {
      key: 'delete',
      label: t('tenantAppPermissionManagement.actions.delete'),
      icon: <TrashIcon className="h-4 w-4" />,
      variant: 'danger',
      onClick: (row) => handleDeletePermission(row)
    }
  ]

  if (loading) {
    return (
      <TenantLayout title={t('tenantAppPermissionManagement.layoutTitle')}>
        <div className="py-6">
          <PSkeleton.Management />
        </div>
      </TenantLayout>
    )
  }

  if (error) {
    return (
      <TenantLayout title={t('tenantAppPermissionManagement.layoutTitle')}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{error}</h3>
            <div className="mt-6">
              <PButton onClick={() => { setError(''); fetchPermissions(); }}>{t('tenantAppPermissionManagement.actions.retry')}</PButton>
            </div>
          </div>
        </div>
      </TenantLayout>
    )
  }

  return (
    <TenantLayout title={t('tenantAppPermissionManagement.layoutTitle')}>
      <PManagementPageContainer
        header={
          <PPageHeader
            title={t('tenantAppPermissionManagement.title')}
            description={t('tenantAppPermissionManagement.description', { name: app?.name || '-' })}
            icon={<KeyIcon className="h-8 w-8 text-blue-600" />}
            actions={
              <div className="flex space-x-3">
                <PButton variant="secondary" onClick={() => navigate(`/tenant/apps/${appId}/roles`)}>{t('tenantAppPermissionManagement.actions.roleManagement')}</PButton>
                <PButton variant="secondary" onClick={() => navigate(`/tenant/apps/${appId}/users`)}>{t('tenantAppPermissionManagement.actions.userManagement')}</PButton>
                <PButton onClick={handleCreatePermission} leftIcon={<PlusIcon className="h-4 w-4" />}>{t('tenantAppPermissionManagement.actions.createPermission')}</PButton>
              </div>
            }
          />
        }
        filter={
          <PManagementFilterCard
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder={t('tenantAppPermissionManagement.searchPlaceholder')}
            rightContentClassName="lg:w-64"
            rightContent={
              <div className="relative">
                <FunnelIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <PSelect
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory((e.target as HTMLSelectElement).value)}
                  className="pl-10"
                >
                  <option value="">{t('tenantAppPermissionManagement.filters.allCategories')}</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </PSelect>
              </div>
            }
          />
        }
      >
        <PManagedTableSection<Permission>
          data={paginatedPermissions}
          columns={columns}
          actions={actions}
          rowKey={(row) => String(row.id)}
          loading={loading}
          emptyText={searchTerm || selectedCategory ? t('tenantAppPermissionManagement.empty.searchNoResult') : t('tenantAppPermissionManagement.empty.noPermission')}
          emptyContent={!searchTerm && !selectedCategory ? (
            <PButton onClick={handleCreatePermission} leftIcon={<PlusIcon className="h-4 w-4" />}>{t('tenantAppPermissionManagement.actions.createPermission')}</PButton>
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
          title={t('tenantAppPermissionManagement.modal.createTitle')}
          formData={formData}
          setFormData={setFormData}
          submitting={submitting}
          onSubmit={handleSubmit}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/*  */}
      {showEditModal && (
        <PermissionModal
          title={t('tenantAppPermissionManagement.modal.editTitle')}
          formData={formData}
          setFormData={setFormData}
          submitting={submitting}
          onSubmit={handleSubmit}
          onClose={() => setShowEditModal(false)}
          isEdit={true}
        />
      )}
    </TenantLayout>
  )
}

// 
const PermissionModal: React.FC<{
  title: string
  formData: {
    code: string
    name: string
    description: string
    category: string
  }
  setFormData: (data: { code: string; name: string; description: string; category: string }) => void
  submitting: boolean
  onSubmit: () => void
  onClose: () => void
  isEdit?: boolean
}> = ({ title, formData, setFormData, submitting, onSubmit, onClose, isEdit = false }) => {
  const { t } = useI18n()
  const commonCategories = [
    t('tenantAppPermissionManagement.commonCategories.userManagement'),
    t('tenantAppPermissionManagement.commonCategories.contentManagement'),
    t('tenantAppPermissionManagement.commonCategories.systemSettings'),
    t('tenantAppPermissionManagement.commonCategories.dataAnalytics'),
    t('tenantAppPermissionManagement.commonCategories.financeManagement'),
    t('tenantAppPermissionManagement.commonCategories.permissionManagement'),
    t('tenantAppPermissionManagement.commonCategories.auditLogs'),
    t('tenantAppPermissionManagement.commonCategories.notificationManagement')
  ]

  return (
    <div className="fixed inset-0 !m-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto w-full max-w-2xl rounded-2xl border bg-white p-5 shadow-xl">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <PButton variant="ghost" onClick={onClose}>
              <XMarkIcon className="h-6 w-6" />
            </PButton>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <PInput
                  label={t('tenantAppPermissionManagement.fields.permissionCodeRequired')}
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: (e.target as HTMLInputElement).value })}
                  disabled={isEdit}
                  placeholder={t('tenantAppPermissionManagement.placeholders.permissionCode')}
                />
              </div>

              <div>
                <PInput
                  label={t('tenantAppPermissionManagement.fields.permissionNameRequired')}
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: (e.target as HTMLInputElement).value })}
                  placeholder={t('tenantAppPermissionManagement.placeholders.permissionName')}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('tenantAppPermissionManagement.fields.permissionCategoryRequired')}
              </label>
              <div className="flex space-x-2">
                <PSelect
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: (e.target as HTMLSelectElement).value })}
                >
                  <option value="">{t('tenantAppPermissionManagement.fields.selectCategory')}</option>
                  {commonCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </PSelect>
                <PInput
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: (e.target as HTMLInputElement).value })}
                  placeholder={t('tenantAppPermissionManagement.placeholders.customCategory')}
                />
              </div>
            </div>

            <div>
              <PTextarea
                label={t('tenantAppPermissionManagement.fields.permissionDescription')}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: (e.target as HTMLTextAreaElement).value })}
                rows={3}
                placeholder={t('tenantAppPermissionManagement.placeholders.permissionDescription')}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <PButton
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={submitting}
              >
                {t('tenantAppPermissionManagement.actions.cancel')}
              </PButton>
              <PButton
                type="submit"
                loading={submitting}
              >
                {isEdit ? t('tenantAppPermissionManagement.actions.update') : t('tenantAppPermissionManagement.actions.create')}
              </PButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
