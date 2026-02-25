import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
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
import TenantLayout from '@features/tenant/components/TenantLayout'
import PInput from '@ui/PInput'
import PSelect from '@ui/PSelect'
import PTextarea from '@ui/PTextarea'
import PButton from '@ui/PButton'
import PTable, { type PTableColumn, type PTableAction } from '@ui/PTable'
import { tenantAppApi } from '@api/tenant/tenantApp'
import userPermissionsApi, { type Permission } from '@api/tenant/appPermissions'
import useDebounce from '@hooks/useDebounce'

export default function AppPermissionManagement() {
  const { id: appId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const [app, setApp] = useState<any>(null)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 200)
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
    
    if (!await uiConfirm(`确定要删除权限"${permission.name}"吗？这将会影响所有拥有此权限的用户和角色。`)) {
      return
    }

    try {
      await userPermissionsApi.deletePermission(appId, permission.id)
      await fetchPermissions()
      uiAlert('权限删除成功')
    } catch (err: any) {
      console.error('删除权限失败:', err)
      uiAlert(err.response?.data?.error || '删除权限失败')
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
        uiAlert('权限更新成功')
        setShowEditModal(false)
      } else {
        // 创建权限
        await userPermissionsApi.createPermission(appId, formData)
        uiAlert('权限创建成功')
        setShowCreateModal(false)
      }
      
      await fetchPermissions()
    } catch (err: any) {
      console.error('保存权限失败:', err)
      uiAlert(err.response?.data?.error || '保存权限失败')
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
    const matchesSearch = debouncedSearchTerm === '' ||
      permission.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      permission.code.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      (permission.description && permission.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
      
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
              <PButton onClick={() => { setError(''); fetchPermissions(); }}>重试</PButton>
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
            <PButton variant="secondary" onClick={() => navigate(`/tenant/apps/${appId}/roles`)}>
              角色管理
            </PButton>
            <PButton variant="secondary" onClick={() => navigate(`/tenant/apps/${appId}/users`)}>
              用户管理
            </PButton>
            <PButton onClick={handleCreatePermission} leftIcon={<PlusIcon className="h-4 w-4" />}>创建权限</PButton>
          </div>
        </div>

        {/* 搜索和过滤 */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <PInput
                placeholder="搜索权限名称、代码或描述..."
                value={searchTerm}
                onChange={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
                icon={<MagnifyingGlassIcon className="h-5 w-5" />}
              />
            </div>
            <div className="lg:w-64">
              <PSelect
                value={selectedCategory}
                onChange={(e) => setSelectedCategory((e.target as HTMLSelectElement).value)}
              >
                <option value="">所有分类</option>
                {getCategories().map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </PSelect>
            </div>
          </div>
        </div>

        {/* 权限列表（统一 PTable）*/}
        <div>
          <PTable<Permission>
            data={filteredPermissions}
            rowKey={(row) => String(row.id)}
            loading={loading}
            emptyText={searchTerm || selectedCategory ? '未找到匹配的权限' : '还没有创建任何权限'}
            emptyContent={!searchTerm && !selectedCategory ? (
              <PButton onClick={handleCreatePermission} leftIcon={<PlusIcon className="h-4 w-4" />}>创建权限</PButton>
            ) : undefined}
            size="md"
            striped
            defaultSort={{ key: 'name', order: 'asc' }}
            columns={[
              {
                key: 'name',
                title: '权限名称',
                dataIndex: 'name',
                sortable: true,
                render: (row) => (
                  <div className="flex items-center">
                    <LockClosedIcon className="h-5 w-5 text-blue-600 mr-2" />
                    <div>
                      <div className="font-medium text-gray-900">{row.name}</div>
                      <div className="text-xs text-gray-500">{row.code}</div>
                    </div>
                  </div>
                )
              },
              {
                key: 'category',
                title: '分类',
                dataIndex: 'category',
                sortable: true,
              },
              {
                key: 'description',
                title: '描述',
                dataIndex: 'description',
                className: 'max-w-xl truncate',
              },
              {
                key: 'created_at',
                title: '创建时间',
                dataIndex: 'created_at',
                align: 'right',
                sortable: true,
                sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
                render: (row) => new Date(row.created_at).toLocaleString()
              }
            ]}
            actions={[
              {
                key: 'edit',
                label: '编辑',
                icon: <PencilIcon className="h-4 w-4" />,
                variant: 'secondary',
                onClick: (row) => handleEditPermission(row)
              },
              {
                key: 'delete',
                label: '删除',
                icon: <TrashIcon className="h-4 w-4" />,
                variant: 'danger',
                confirm: '确定要删除该权限吗？这将影响拥有此权限的用户和角色。',
                onClick: (row) => handleDeletePermission(row)
              }
            ]}
          />
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
    <div className="fixed inset-0 !m-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
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
                  label="权限代码 *"
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: (e.target as HTMLInputElement).value })}
                  disabled={isEdit}
                  placeholder="例如: user.create, content.edit"
                />
              </div>

              <div>
                <PInput
                  label="权限名称 *"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: (e.target as HTMLInputElement).value })}
                  placeholder="例如: 创建用户, 编辑内容"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                权限分类 *
              </label>
              <div className="flex space-x-2">
                <PSelect
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: (e.target as HTMLSelectElement).value })}
                >
                  <option value="">选择分类</option>
                  {commonCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </PSelect>
                <PInput
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: (e.target as HTMLInputElement).value })}
                  placeholder="或输入自定义分类"
                />
              </div>
            </div>

            <div>
              <PTextarea
                label="权限描述"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: (e.target as HTMLTextAreaElement).value })}
                rows={3}
                placeholder="描述该权限的作用和适用场景"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <PButton
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={submitting}
              >
                取消
              </PButton>
              <PButton
                type="submit"
                loading={submitting}
              >
                {isEdit ? '更新' : '创建'}
              </PButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
