import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import { Link } from 'react-router-dom'
import { 
  PlusIcon, 
  EyeIcon, 
  PencilIcon, 
  TrashIcon,
  BuildingOfficeIcon,
  UsersIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import AdminLayout from '@features/admin/components/AdminLayout'
import { adminTenantApi, AdminTenantResponse, AdminTenantListRequest } from '@api/admin/tenant'
import { ROUTES } from '@constants'
import { PSkeleton, PBadge, PAlert, PPageHeader, PPagination, PButton, UserTooltip, PInput, PSelect } from '@ui'

export default function TenantList() {
  const [tenants, setTenants] = useState<AdminTenantResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    loadTenants()
  }, [page, search, status])

  const loadTenants = async () => {
    try {
      setLoading(true)
      const params: AdminTenantListRequest = {
        page,
        limit: 20,
        search: search || undefined,
        status: status || undefined,
      }
      const response = await adminTenantApi.getTenantList(params)
      setTenants(response.tenants)
      setTotalPages(response.pagination.total_pages)
    } catch (error) {
      console.error('Failed to load tenants:', error)
      setError('加载租户列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTenant = async (id: number) => {
    if (!await uiConfirm('确定要删除这个租户吗？此操作不可撤销。')) {
      return
    }

    try {
      await adminTenantApi.deleteTenant(id)
      await loadTenants()
    } catch (error) {
      console.error('Failed to delete tenant:', error)
      uiAlert('删除租户失败')
    }
  }

  const getStatusVariant = (status: string): 'success' | 'error' | 'default' => {
    switch (status) {
      case 'active': return 'success'
      case 'suspended': return 'error'
      default: return 'default'
    }
  }

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case 'active':
        return '活跃'
      case 'suspended':
        return '暂停'
      case 'deleted':
        return '已删除'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <AdminLayout title="租户管理">
        <div className="py-6">
          <PSkeleton.Management />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="租户管理">
      <div className="space-y-6">
        {/* 页面头部 */}
        <PPageHeader
          title="租户管理"
          description="管理平台上的所有租户"
          icon={<BuildingOfficeIcon className="h-8 w-8 text-indigo-600" />}
          actions={
            <Link to={ROUTES.admin.tenantsCreate}>
              <PButton leftIcon={<PlusIcon className="h-4 w-4" />}>创建租户</PButton>
            </Link>
          }
        />

        {/* 搜索和过滤 */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <PInput
                type="text"
                placeholder="搜索租户名称、代码或描述..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={<MagnifyingGlassIcon className="h-5 w-5" />}
                variant="rounded"
                autoComplete="off"
              />
            </div>
            <div className="sm:w-32">
              <PSelect
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">所有状态</option>
                <option value="active">活跃</option>
                <option value="suspended">暂停</option>
                <option value="deleted">已删除</option>
              </PSelect>
            </div>
          </div>
        </div>

        {/* 错误提示 */}
        {error && <PAlert variant="error" message={error} />}

        {/* 租户列表 */}
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <ul className="divide-y divide-gray-200">
            {tenants.map((tenant) => (
              <li key={tenant.id}>
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
                          <BuildingOfficeIcon className="h-6 w-6 text-indigo-600" />
                        </div>
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex items-center">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {tenant.name}
                          </h3>
                          <PBadge variant={getStatusVariant(tenant.status)} className="ml-3">
                            {getStatusDisplayName(tenant.status)}
                          </PBadge>
                        </div>
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <span>代码: {tenant.code}</span>
                          <span className="mx-2">•</span>
                          <span>所有者: <UserTooltip userId={tenant.owner_id} fallbackLabel="未分配所有者" /></span>
                          <span className="mx-2">•</span>
                          <span>用户: {tenant.user_count}</span>
                          <span className="mx-2">•</span>
                          <span>应用: {tenant.app_count}</span>
                          <span className="mx-2">•</span>
                          <span>创建于 {new Date(tenant.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/admin/tenants/${tenant.id}`}
                      className="inline-flex items-center rounded-lg border border-gray-300 bg-white p-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      title="查看详情"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </Link>
                    <Link
                      to={`/admin/tenants/${tenant.id}/edit`}
                      className="inline-flex items-center rounded-lg border border-gray-300 bg-white p-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      title="编辑"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Link>
                    <Link
                      to={`/admin/tenants/${tenant.id}/users`}
                      className="inline-flex items-center rounded-lg border border-gray-300 bg-white p-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      title="用户管理"
                    >
                      <UsersIcon className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => handleDeleteTenant(tenant.id)}
                      className="inline-flex items-center rounded-lg border border-red-300 bg-white p-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      title="删除"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* 空状态 */}
          {tenants.length === 0 && !loading && (
            <div className="text-center py-12">
              <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">暂无租户</h3>
              <p className="mt-1 text-sm text-gray-500">开始创建第一个租户</p>
              <div className="mt-6">
                <Link
                  to={ROUTES.admin.tenantsCreate}
                  className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  创建租户
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <PPagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        )}
      </div>
    </AdminLayout>
  )
}
