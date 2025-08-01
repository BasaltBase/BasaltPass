import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  KeyIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  TagIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline'
import TenantLayout from '../../../components/TenantLayout'
import { tenantAppApi } from '../../../api/tenantApp'
import userPermissionsApi, { type Permission } from '../../../api/userPermissions'

export default function AppPermissionManagement() {
  const { id: appId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const [app, setApp] = useState<any>(null)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  
  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  // 表单数据
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
      console.error('获取应用信息失败:', err)
      setError(err.response?.data?.error || '获取应用信息失败')
    }
  }

  const fetchPermissions = async () => {
    if (!appId) return
    
    try {
      setLoading(true)
      const response = await userPermissionsApi.getAppPermissions(appId)
      setPermissions(response.permissions || [])
    } catch (err: any) {
      console.error('获取权限列表失败:', err)
      setError(err.response?.data?.error || '获取权限列表失败')
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
    
    if (!confirm(`确定要删除权限"${permission.name}"吗？这将会影响所有拥有此权限的用户和角色。`)) {
      return
    }

    try {
      await userPermissionsApi.deletePermission(appId, permission.id)
      await fetchPermissions()
      alert('权限删除成功')
    } catch (err: any) {
      console.error('删除权限失败:', err)
      alert(err.response?.data?.error || '删除权限失败')
    }
  }

  const handleSubmit = async () => {
    if (!appId) return
    
    try {
      setSubmitting(true)
      
      if (editingPermission) {
        // 更新权限
        await userPermissionsApi.updatePermission(appId, editingPermission.id, {
          name: formData.name,
          description: formData.description,
          category: formData.category
        })
        alert('权限更新成功')
        setShowEditModal(false)
      } else {
        // 创建权限
        await userPermissionsApi.createPermission(appId, formData)
        alert('权限创建成功')
        setShowCreateModal(false)
      }
      
      await fetchPermissions()
    } catch (err: any) {
      console.error('保存权限失败:', err)
      alert(err.response?.data?.error || '保存权限失败')
    } finally {
      setSubmitting(false)
    }
  }

  // 获取所有分类
  const getCategories = () => {
    const categories = Array.from(new Set(permissions.map(p => p.category)))
    return categories.sort()
  }

  // 过滤权限
  const filteredPermissions = permissions.filter(permission => {
    const matchesSearch = searchTerm === '' ||
      permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (permission.description && permission.description.toLowerCase().includes(searchTerm.toLowerCase()))
      
    const matchesCategory = selectedCategory === '' || permission.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  // 按分类分组权限
  const getPermissionsByCategory = () => {
    const categories: { [key: string]: Permission[] } = {}
    filteredPermissions.forEach(permission => {
      if (!categories[permission.category]) {
        categories[permission.category] = []
      }
      categories[permission.category].push(permission)
    })
    return categories
  }

  if (loading) {
    return (
      <TenantLayout title="权限管理">
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
      <TenantLayout title="权限管理">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{error}</h3>
            <div className="mt-6">
              <button
                onClick={() => {
                  setError('')
                  fetchPermissions()
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
    <TenantLayout title="权限管理">
      <div className="space-y-6">
        {/* 页面头部 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <KeyIcon className="h-8 w-8 mr-3 text-blue-600" />
              权限管理
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              管理应用 "{app?.name}" 的权限和访问控制
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => navigate(`/tenant/apps/${appId}/roles`)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              角色管理
            </button>
            <button
              onClick={() => navigate(`/tenant/apps/${appId}/users`)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              用户管理
            </button>
            <button
              onClick={handleCreatePermission}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              创建权限
            </button>
          </div>
        </div>

        {/* 搜索和过滤 */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索权限名称、代码或描述..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="lg:w-64">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">所有分类</option>
                {getCategories().map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 权限列表 */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                权限列表 ({filteredPermissions.length} 个权限)
              </h3>
            </div>

            {filteredPermissions.length === 0 ? (
              <div className="text-center py-12">
                <KeyIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">暂无权限</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || selectedCategory ? '未找到匹配的权限' : '还没有创建任何权限'}
                </p>
                {!searchTerm && !selectedCategory && (
                  <div className="mt-6">
                    <button
                      onClick={handleCreatePermission}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      创建权限
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(getPermissionsByCategory()).map(([category, categoryPermissions]) => (
                  <div key={category}>
                    <div className="flex items-center mb-4">
                      <TagIcon className="h-5 w-5 text-indigo-600 mr-2" />
                      <h4 className="text-lg font-medium text-gray-900">{category}</h4>
                      <span className="ml-2 px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded-full">
                        {categoryPermissions.length} 个权限
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {categoryPermissions.map((permission) => (
                        <div key={permission.id} className="bg-gray-50 rounded-lg p-4 border">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center">
                              <LockClosedIcon className="h-6 w-6 text-blue-600 mr-2" />
                              <div>
                                <h5 className="text-sm font-medium text-gray-900">{permission.name}</h5>
                                <p className="text-xs text-gray-500">代码: {permission.code}</p>
                              </div>
                            </div>
                            <div className="flex space-x-1">
                              <button
                                onClick={() => handleEditPermission(permission)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeletePermission(permission)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {permission.description && (
                            <p className="text-sm text-gray-600 mb-3">{permission.description}</p>
                          )}

                          <div className="text-xs text-gray-500">
                            创建时间: {new Date(permission.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 创建权限模态框 */}
      {showCreateModal && (
        <PermissionModal
          title="创建权限"
          formData={formData}
          setFormData={setFormData}
          submitting={submitting}
          onSubmit={handleSubmit}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* 编辑权限模态框 */}
      {showEditModal && (
        <PermissionModal
          title="编辑权限"
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

// 权限模态框组件
const PermissionModal: React.FC<{
  title: string
  formData: any
  setFormData: (data: any) => void
  submitting: boolean
  onSubmit: () => void
  onClose: () => void
  isEdit?: boolean
}> = ({ title, formData, setFormData, submitting, onSubmit, onClose, isEdit = false }) => {
  const commonCategories = [
    '用户管理',
    '内容管理',
    '系统设置',
    '数据分析',
    '财务管理',
    '权限管理',
    '审计日志',
    '通知管理'
  ]

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
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
                  权限代码 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  disabled={isEdit}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  placeholder="例如: user.create, content.edit"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  权限名称 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例如: 创建用户, 编辑内容"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                权限分类 *
              </label>
              <div className="flex space-x-2">
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">选择分类</option>
                  {commonCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="或输入自定义分类"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                权限描述
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="描述该权限的作用和适用场景"
              />
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
                className="px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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
