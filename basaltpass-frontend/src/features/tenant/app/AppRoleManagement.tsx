import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ShieldCheckIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  KeyIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import TenantLayout from '@features/tenant/components/TenantLayout'
import { tenantAppApi } from '@api/tenant/tenantApp'
import { userPermissionsApi, type Permission, type Role } from '@api/tenant/appPermissions'
import useDebounce from '@hooks/useDebounce'
import { PSkeleton, PPageHeader, PEmptyState, PButton, PInput, PTextarea, PBadge } from '@ui'
import { useI18n } from '@shared/i18n'

export default function AppRoleManagement() {
  const { t, locale } = useI18n()
  const { id: appId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const [app, setApp] = useState<any>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 200)
  
  // 
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  // 
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    permission_ids: [] as number[]
  })

  useEffect(() => {
    if (appId) {
      fetchAppData()
      fetchRolesAndPermissions()
    }
  }, [appId])

  const fetchAppData = async () => {
    if (!appId) return
    
    try {
      const response = await tenantAppApi.getTenantApp(appId)
      setApp(response.data)
    } catch (err: any) {
      console.error(t('tenantAppRoleManagement.logs.fetchAppFailed'), err)
      setError(err.response?.data?.error || t('tenantAppRoleManagement.errors.fetchAppFailed'))
    }
  }

  const fetchRolesAndPermissions = async () => {
    if (!appId) return
    
    try {
      setLoading(true)
      const [rolesRes, permissionsRes] = await Promise.all([
        userPermissionsApi.getAppRoles(appId),
        userPermissionsApi.getAppPermissions(appId)
      ])
      setRoles(rolesRes.roles || [])
      setPermissions(permissionsRes.permissions || [])
    } catch (err: any) {
      console.error(t('tenantAppRoleManagement.logs.fetchRolesAndPermissionsFailed'), err)
      setError(err.response?.data?.error || t('tenantAppRoleManagement.errors.fetchRolesAndPermissionsFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRole = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      permission_ids: []
    })
    setEditingRole(null)
    setShowCreateModal(true)
  }

  const handleEditRole = (role: Role) => {
    setFormData({
      code: role.code,
      name: role.name,
      description: role.description || '',
      permission_ids: role.permissions?.map(p => p.id) || []
    })
    setEditingRole(role)
    setShowEditModal(true)
  }

  const handleDeleteRole = async (role: Role) => {
    if (!appId) return
    
    if (!await uiConfirm(t('tenantAppRoleManagement.confirmDelete', { name: role.name }))) {
      return
    }

    try {
      await userPermissionsApi.deleteRole(appId, role.id)
      await fetchRolesAndPermissions()
      uiAlert(t('tenantAppRoleManagement.success.deleteSuccess'))
    } catch (err: any) {
      console.error(t('tenantAppRoleManagement.logs.deleteFailed'), err)
      uiAlert(err.response?.data?.error || t('tenantAppRoleManagement.errors.deleteFailed'))
    }
  }

  const handleSubmit = async () => {
    if (!appId) return
    
    try {
      setSubmitting(true)
      
      if (editingRole) {
        // 
        await userPermissionsApi.updateRole(appId, editingRole.id, {
          name: formData.name,
          description: formData.description,
          permission_ids: formData.permission_ids
        })
        uiAlert(t('tenantAppRoleManagement.success.updateSuccess'))
        setShowEditModal(false)
      } else {
        // 
        await userPermissionsApi.createRole(appId, formData)
        uiAlert(t('tenantAppRoleManagement.success.createSuccess'))
        setShowCreateModal(false)
      }
      
      await fetchRolesAndPermissions()
    } catch (err: any) {
      console.error(t('tenantAppRoleManagement.logs.saveFailed'), err)
      uiAlert(err.response?.data?.error || t('tenantAppRoleManagement.errors.saveFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const filteredRoles = roles.filter(role =>
    debouncedSearchTerm === '' ||
    role.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
    role.code.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
    (role.description && role.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
  )

  const getPermissionsByCategory = () => {
    const categories: { [key: string]: Permission[] } = {}
    permissions.forEach(permission => {
      if (!categories[permission.category]) {
        categories[permission.category] = []
      }
      categories[permission.category].push(permission)
    })
    return categories
  }

  if (loading) {
    return (
      <TenantLayout title={t('tenantAppRoleManagement.layoutTitle')}>
        <div className="py-6">
          <PSkeleton.Management />
        </div>
      </TenantLayout>
    )
  }

  if (error) {
    return (
      <TenantLayout title={t('tenantAppRoleManagement.layoutTitle')}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{error}</h3>
            <div className="mt-6">
              <PButton onClick={() => { setError(''); fetchRolesAndPermissions() }}>{t('tenantAppRoleManagement.actions.retry')}</PButton>
            </div>
          </div>
        </div>
      </TenantLayout>
    )
  }

  return (
    <TenantLayout title={t('tenantAppRoleManagement.layoutTitle')}>
      <div className="space-y-6">
        {/*  */}
        <PPageHeader
          title={t('tenantAppRoleManagement.title')}
          description={t('tenantAppRoleManagement.description', { name: app?.name || '-' })}
          icon={<ShieldCheckIcon className="h-8 w-8 text-green-600" />}
          actions={
            <div className="flex space-x-3">
              <PButton variant="secondary" onClick={() => navigate(`/tenant/apps/${appId}/permissions`)} leftIcon={<KeyIcon className="h-4 w-4" />}>{t('tenantAppRoleManagement.actions.permissionManagement')}</PButton>
              <PButton variant="secondary" onClick={() => navigate(`/tenant/apps/${appId}/users`)}>{t('tenantAppRoleManagement.actions.userManagement')}</PButton>
              <PButton onClick={handleCreateRole} leftIcon={<PlusIcon className="h-4 w-4" />}>{t('tenantAppRoleManagement.actions.createRole')}</PButton>
            </div>
          }
        />

        {/*  */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('tenantAppRoleManagement.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/*  */}
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {t('tenantAppRoleManagement.list.title', { count: filteredRoles.length })}
              </h3>
            </div>

            {filteredRoles.length === 0 ? (
              <PEmptyState
                icon={ShieldCheckIcon}
                title={t('tenantAppRoleManagement.empty.title')}
                description={searchTerm ? t('tenantAppRoleManagement.empty.searchNoResult') : t('tenantAppRoleManagement.empty.noRole')}
              >
                {!searchTerm && (
                  <PButton onClick={handleCreateRole} leftIcon={<PlusIcon className="h-4 w-4" />}>{t('tenantAppRoleManagement.actions.createRole')}</PButton>
                )}
              </PEmptyState>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredRoles.map((role) => (
                  <div key={role.id} className="bg-gray-50 rounded-lg p-6 border">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <ShieldCheckIcon className="h-8 w-8 text-green-600 mr-3" />
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">{role.name}</h4>
                          <p className="text-sm text-gray-500">{t('tenantAppRoleManagement.fields.code')}: {role.code}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <PButton
                          onClick={() => handleEditRole(role)}
                          variant="ghost"
                          size="sm"
                          className="px-2 text-blue-600 hover:text-blue-800"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </PButton>
                        <PButton
                          onClick={() => handleDeleteRole(role)}
                          variant="ghost"
                          size="sm"
                          className="px-2 text-red-600 hover:text-red-800"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </PButton>
                      </div>
                    </div>

                    {role.description && (
                      <p className="text-sm text-gray-600 mb-4">{role.description}</p>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-blue-600">
                        <KeyIcon className="h-4 w-4 mr-1" />
                        {t('tenantAppRoleManagement.fields.permissionCount', { count: role.permissions?.length || 0 })}
                      </div>
                      <div className="text-gray-500">
                        {new Date(role.created_at).toLocaleDateString(locale)}
                      </div>
                    </div>

                    {role.permissions && role.permissions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {role.permissions.slice(0, 3).map((permission) => (
                          <PBadge key={permission.id} variant="info">{permission.name}</PBadge>
                        ))}
                        {role.permissions.length > 3 && (
                          <PBadge variant="default">{t('tenantAppRoleManagement.fields.moreCount', { count: role.permissions.length - 3 })}</PBadge>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/*  */}
      {showCreateModal && (
        <RoleModal
          title={t('tenantAppRoleManagement.modal.createTitle')}
          formData={formData}
          setFormData={setFormData}
          permissions={permissions}
          submitting={submitting}
          onSubmit={handleSubmit}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/*  */}
      {showEditModal && (
        <RoleModal
          title={t('tenantAppRoleManagement.modal.editTitle')}
          formData={formData}
          setFormData={setFormData}
          permissions={permissions}
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
const RoleModal: React.FC<{
  title: string
  formData: any
  setFormData: (data: any) => void
  permissions: Permission[]
  submitting: boolean
  onSubmit: () => void
  onClose: () => void
  isEdit?: boolean
}> = ({ title, formData, setFormData, permissions, submitting, onSubmit, onClose, isEdit = false }) => {
  const { t } = useI18n()
  const getPermissionsByCategory = () => {
    const categories: { [key: string]: Permission[] } = {}
    permissions.forEach(permission => {
      if (!categories[permission.category]) {
        categories[permission.category] = []
      }
      categories[permission.category].push(permission)
    })
    return categories
  }

  return (
    <div className="fixed inset-0 !m-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto w-full max-w-4xl rounded-2xl border bg-white p-5 shadow-xl">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenantAppRoleManagement.fields.roleCodeRequired')}
                </label>
                <PInput
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: (e.target as HTMLInputElement).value })}
                  disabled={isEdit}
                  placeholder={t('tenantAppRoleManagement.placeholders.roleCode')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('tenantAppRoleManagement.fields.roleNameRequired')}
                </label>
                <PInput
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: (e.target as HTMLInputElement).value })}
                  placeholder={t('tenantAppRoleManagement.placeholders.roleName')}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('tenantAppRoleManagement.fields.roleDescription')}
              </label>
              <PTextarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: (e.target as HTMLTextAreaElement).value })}
                rows={3}
                placeholder={t('tenantAppRoleManagement.placeholders.roleDescription')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t('tenantAppRoleManagement.fields.permissionAssignment', { count: formData.permission_ids.length })}
              </label>
              <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-200 p-4">
                {Object.entries(getPermissionsByCategory()).map(([category, categoryPermissions]) => (
                  <div key={category} className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                      <KeyIcon className="h-4 w-4 mr-2 text-blue-600" />
                      {category}
                    </h4>
                    <div className="space-y-2 ml-6">
                      {categoryPermissions.map((permission) => (
                        <label key={permission.id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.permission_ids.includes(permission.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  permission_ids: [...formData.permission_ids, permission.id]
                                })
                              } else {
                                setFormData({
                                  ...formData,
                                  permission_ids: formData.permission_ids.filter((id: number) => id !== permission.id)
                                })
                              }
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {permission.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {permission.description}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <PButton type="button" variant="secondary" onClick={onClose} disabled={submitting}>{t('tenantAppRoleManagement.actions.cancel')}</PButton>
              <PButton type="submit" loading={submitting}>{isEdit ? t('tenantAppRoleManagement.actions.update') : t('tenantAppRoleManagement.actions.create')}</PButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
