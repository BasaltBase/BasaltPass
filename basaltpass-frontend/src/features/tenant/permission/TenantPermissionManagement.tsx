import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  KeyIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  TagIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import TenantLayout from '@features/tenant/components/TenantLayout'
import PInput from '@ui/PInput'
import PSelect from '@ui/PSelect'
import PTextarea from '@ui/PTextarea'
import PButton from '@ui/PButton'
import PTable, { type PTableColumn, type PTableAction } from '@ui/PTable'
import {
  getTenantPermissions,
  createTenantPermission,
  updateTenantPermission,
  deleteTenantPermission,
  getTenantPermissionCategories,
  type TenantPermission,
  type CreateTenantPermissionRequest
} from '@api/tenant/tenantPermission'

export default function TenantPermissionManagement() {
  const navigate = useNavigate()
  
  const [permissions, setPermissions] = useState<TenantPermission[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  
  // 分页
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  })

  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingPermission, setEditingPermission] = useState<TenantPermission | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  // 表单数据
  const [formData, setFormData] = useState<CreateTenantPermissionRequest>({
    code: '',
    name: '',
    description: '',
    category: ''
  })

  useEffect(() => {
    fetchPermissions()
    fetchCategories()
  }, [pagination.current, pagination.pageSize, searchTerm, selectedCategory])

  const fetchPermissions = async () => {
    try {
      setLoading(true)
      const response = await getTenantPermissions({
        page: pagination.current,
        page_size: pagination.pageSize,
        search: searchTerm,
        category: selectedCategory || undefined
      })
      setPermissions(response.data.data.permissions || [])
      setPagination(prev => ({
        ...prev,
        total: response.data.data.pagination.total
      }))
      setError('')
    } catch (err: any) {
      console.error('获取权限列表失败:', err)
      setError(err.response?.data?.error || '获取权限列表失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await getTenantPermissionCategories()
      setCategories(response.data.data.categories || [])
    } catch (err: any) {
      console.error('获取分类失败:', err)
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
    if (!confirm(`确定要删除权限"${permission.name}"吗？这将会影响所有使用此权限的角色。`)) {
      return
    }

    try {
      await deleteTenantPermission(permission.id)
      await fetchPermissions()
      alert('权限删除成功')
    } catch (err: any) {
      console.error('删除权限失败:', err)
      alert(err.response?.data?.error || '删除权限失败')
    }
  }

  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      
      if (editingPermission) {
        // 更新权限
        await updateTenantPermission(editingPermission.id, formData)
        alert('权限更新成功')
        setShowEditModal(false)
      } else {
        // 创建权限
        await createTenantPermission(formData)
        alert('权限创建成功')
        setShowCreateModal(false)
      }
      
      await fetchPermissions()
      await fetchCategories()
    } catch (err: any) {
      console.error('保存权限失败:', err)
      alert(err.response?.data?.error || '保存权限失败')
    } finally {
      setSubmitting(false)
    }
  }

  const columns: PTableColumn<TenantPermission>[] = [
    {
      title: '权限代码',
      key: 'code',
      render: (permission) => (
        <div className="font-mono text-sm text-blue-600">{permission.code}</div>
      )
    },
    {
      title: '权限名称',
      key: 'name',
      render: (permission) => (
        <div className="font-medium text-gray-900">{permission.name}</div>
      )
    },
    {
      title: '分类',
      key: 'category',
      render: (permission) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          <TagIcon className="h-3 w-3 mr-1" />
          {permission.category}
        </span>
      )
    },
    {
      title: '描述',
      key: 'description',
      render: (permission) => (
        <div className="text-sm text-gray-600 max-w-md truncate">
          {permission.description || '-'}
        </div>
      )
    },
    {
      title: '创建时间',
      key: 'created_at',
      render: (permission) => (
        <div className="text-sm text-gray-500">
          {new Date(permission.created_at).toLocaleDateString('zh-CN')}
        </div>
      )
    }
  ]

  const actions: PTableAction<TenantPermission>[] = [
    {
      label: '编辑',
      onClick: handleEditPermission,
      icon: <PencilIcon className="h-4 w-4" />
    },
    {
      label: '删除',
      onClick: handleDeletePermission,
      icon: <TrashIcon className="h-4 w-4" />,
      danger: true
    }
  ]

  if (error && permissions.length === 0) {
    return (
      <TenantLayout title="权限管理">
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3" />
              <div className="flex-1">
                <h3 className="text-lg font-medium text-red-900">加载失败</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
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
              租户权限管理
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              管理租户级别的权限和访问控制
            </p>
          </div>
          <div className="flex space-x-3">
            <PButton variant="secondary" onClick={() => navigate('/tenant/roles')}>
              <ShieldCheckIcon className="h-4 w-4 mr-2" />
              角色管理
            </PButton>
            <PButton onClick={handleCreatePermission} leftIcon={<PlusIcon className="h-4 w-4" />}>
              创建权限
            </PButton>
          </div>
        </div>

        {/* 搜索和过滤 */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <PInput
                placeholder="搜索权限名称、代码或描述..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm((e.target as HTMLInputElement).value)
                  setPagination(prev => ({ ...prev, current: 1 }))
                }}
                icon={<MagnifyingGlassIcon className="h-5 w-5" />}
              />
            </div>
            <div className="lg:w-64">
              <PSelect
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory((e.target as HTMLSelectElement).value)
                  setPagination(prev => ({ ...prev, current: 1 }))
                }}
              >
                <option value="">所有分类</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </PSelect>
            </div>
          </div>
        </div>

        {/* 权限列表 */}
        <div>
          <PTable<TenantPermission>
            data={permissions}
            columns={columns}
            actions={actions}
            rowKey={(row) => String(row.id)}
            loading={loading}
            emptyText={searchTerm || selectedCategory ? '未找到匹配的权限' : '还没有创建任何权限'}
            emptyContent={!searchTerm && !selectedCategory ? (
              <PButton onClick={handleCreatePermission} leftIcon={<PlusIcon className="h-4 w-4" />}>
                创建权限
              </PButton>
            ) : undefined}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onChange: (page) => setPagination(prev => ({ ...prev, current: page }))
            }}
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
          categories={categories}
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
          categories={categories}
        />
      )}
    </TenantLayout>
  )
}

// 权限模态框组件
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

          <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
            <div className="space-y-4">
              {/* 权限代码 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  权限代码 <span className="text-red-500">*</span>
                </label>
                <PInput
                  type="text"
                  required
                  disabled={isEdit}
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: (e.target as HTMLInputElement).value })}
                  placeholder="如: tenant.users.view"
                />
                <p className="mt-1 text-xs text-gray-500">
                  权限代码一旦创建后不可修改，请谨慎填写
                </p>
              </div>

              {/* 权限名称 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  权限名称 <span className="text-red-500">*</span>
                </label>
                <PInput
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: (e.target as HTMLInputElement).value })}
                  placeholder="如: 查看用户"
                />
              </div>

              {/* 权限分类 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  权限分类 <span className="text-red-500">*</span>
                </label>
                {categories.length > 0 ? (
                  <PSelect
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: (e.target as HTMLSelectElement).value })}
                  >
                    <option value="">选择分类</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="__new__">+ 创建新分类</option>
                  </PSelect>
                ) : null}
                {(!categories.length || formData.category === '__new__') && (
                  <PInput
                    type="text"
                    required
                    value={formData.category === '__new__' ? '' : formData.category}
                    onChange={(e) => setFormData({ ...formData, category: (e.target as HTMLInputElement).value })}
                    placeholder="如: 用户管理"
                    className="mt-2"
                  />
                )}
              </div>

              {/* 描述 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  描述
                </label>
                <PTextarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: (e.target as HTMLTextAreaElement).value })}
                  placeholder="描述此权限的用途和作用..."
                  rows={3}
                />
              </div>
            </div>

            {/* 按钮 */}
            <div className="mt-6 flex justify-end space-x-3">
              <PButton type="button" variant="secondary" onClick={onClose} disabled={submitting}>
                取消
              </PButton>
              <PButton type="submit" disabled={submitting}>
                {submitting ? '提交中...' : (isEdit ? '更新' : '创建')}
              </PButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
