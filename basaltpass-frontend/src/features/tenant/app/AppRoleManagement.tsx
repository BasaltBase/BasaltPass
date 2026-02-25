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

export default function AppRoleManagement() {
  const { id: appId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const [app, setApp] = useState<any>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 200)
  
  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  // 表单数据
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
      console.error('获取应用信息失败:', err)
      setError(err.response?.data?.error || '获取应用信息失败')
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
      console.error('获取角色和权限失败:', err)
      setError(err.response?.data?.error || '获取角色和权限失败')
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
    
    if (!await uiConfirm(`确定要删除角色"${role.name}"吗？这将会影响所有拥有此角色的用户。`)) {
      return
    }

    try {
      await userPermissionsApi.deleteRole(appId, role.id)
      await fetchRolesAndPermissions()
      uiAlert('角色删除成功')
    } catch (err: any) {
      console.error('删除角色失败:', err)
      uiAlert(err.response?.data?.error || '删除角色失败')
    }
  }

  const handleSubmit = async () => {
    if (!appId) return
    
    try {
      setSubmitting(true)
      
      if (editingRole) {
        // 更新角色
        await userPermissionsApi.updateRole(appId, editingRole.id, {
          name: formData.name,
          description: formData.description,
          permission_ids: formData.permission_ids
        })
        uiAlert('角色更新成功')
        setShowEditModal(false)
      } else {
        // 创建角色
        await userPermissionsApi.createRole(appId, formData)
        uiAlert('角色创建成功')
        setShowCreateModal(false)
      }
      
      await fetchRolesAndPermissions()
    } catch (err: any) {
      console.error('保存角色失败:', err)
      uiAlert(err.response?.data?.error || '保存角色失败')
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
      <TenantLayout title="角色管理">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">加载中...</p>
          </div>
        </div>
      </TenantLayout>
    )
  }

  if (error) {
    return (
      <TenantLayout title="角色管理">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{error}</h3>
            <div className="mt-6">
              <button
                onClick={() => {
                  setError('')
                  fetchRolesAndPermissions()
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                重试
              </button>
            </div>
          </div>
        </div>
      </TenantLayout>
    )
  }

  return (
    <TenantLayout title="角色管理">
      <div className="space-y-6">
        {/* 页面头部 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <ShieldCheckIcon className="h-8 w-8 mr-3 text-green-600" />
              角色管理
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              管理应用 "{app?.name}" 的角色和权限
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => navigate(`/tenant/apps/${appId}/permissions`)}
              className="inline-flex items-center px-4 py-2 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
            >
              <KeyIcon className="h-4 w-4 mr-2" />
              权限管理
            </button>
            <button
              onClick={() => navigate(`/tenant/apps/${appId}/users`)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              用户管理
            </button>
            <button
              onClick={handleCreateRole}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              创建角色
            </button>
          </div>
        </div>

        {/* 搜索 */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索角色名称、代码或描述..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* 角色列表 */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                角色列表 ({filteredRoles.length} 个角色)
              </h3>
            </div>

            {filteredRoles.length === 0 ? (
              <div className="text-center py-12">
                <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">暂无角色</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? '未找到匹配的角色' : '还没有创建任何角色'}
                </p>
                {!searchTerm && (
                  <div className="mt-6">
                    <button
                      onClick={handleCreateRole}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      创建角色
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredRoles.map((role) => (
                  <div key={role.id} className="bg-gray-50 rounded-lg p-6 border">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <ShieldCheckIcon className="h-8 w-8 text-green-600 mr-3" />
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">{role.name}</h4>
                          <p className="text-sm text-gray-500">代码: {role.code}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditRole(role)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRole(role)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {role.description && (
                      <p className="text-sm text-gray-600 mb-4">{role.description}</p>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-blue-600">
                        <KeyIcon className="h-4 w-4 mr-1" />
                        {role.permissions?.length || 0} 个权限
                      </div>
                      <div className="text-gray-500">
                        {new Date(role.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    {role.permissions && role.permissions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {role.permissions.slice(0, 3).map((permission) => (
                          <span
                            key={permission.id}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {permission.name}
                          </span>
                        ))}
                        {role.permissions.length > 3 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            +{role.permissions.length - 3} 更多
                          </span>
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

      {/* 创建角色模态框 */}
      {showCreateModal && (
        <RoleModal
          title="创建角色"
          formData={formData}
          setFormData={setFormData}
          permissions={permissions}
          submitting={submitting}
          onSubmit={handleSubmit}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* 编辑角色模态框 */}
      {showEditModal && (
        <RoleModal
          title="编辑角色"
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

// 角色模态框组件
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
      <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
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
                  角色代码 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  disabled={isEdit}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  placeholder="例如: admin, user, editor"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  角色名称 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例如: 管理员, 普通用户, 编辑者"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                角色描述
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="描述该角色的用途和职责"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                权限分配 ({formData.permission_ids.length} 个已选)
              </label>
              <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-md p-4">
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
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 bg-gray-300 text-gray-700 text-base font-medium rounded-md shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-green-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
              >
                {submitting ? '保存中...' : (isEdit ? '更新' : '创建')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
