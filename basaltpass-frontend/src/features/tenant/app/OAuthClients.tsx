import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import { 
  PlusIcon, 
  EyeIcon, 
  TrashIcon,
  KeyIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline'
import TenantLayout from '@features/tenant/components/TenantLayout'
import { tenantOAuthApi, TenantAppWithClients, TenantOAuthClient } from '@api/tenant/tenantOAuth'
import { PButton, PInput, PSkeleton, PBadge, PPagination } from '@ui'
import CreateOAuthClientModal from '@features/tenant/app/components/CreateOAuthClientModal'
import OAuthClientDetailModal from '@features/tenant/app/components/OAuthClientDetailModal'


export default function TenantOAuthClients() {
  const [apps, setApps] = useState<TenantAppWithClients[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState<TenantOAuthClient | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const pageSize = 10

  const loadAppsWithClients = async () => {
    try {
      setLoading(true)
      const response = await tenantOAuthApi.listAppsWithClients(page, pageSize, search)
      setApps(response.data.apps || [])
      setTotal(response.data.total || 0)
    } catch (err: any) {
      setError(err.response?.data?.error || '加载失败')
      setApps([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAppsWithClients()
  }, [page, search])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    loadAppsWithClients()
  }

  const handleDelete = async (client: TenantOAuthClient) => {
    if (!await uiConfirm(`确定要删除OAuth客户端 "${client.client_id}" 吗？此操作不可恢复。`)) return

    try {
      await tenantOAuthApi.deleteClient(client.client_id)
      loadAppsWithClients()
    } catch (err: any) {
      uiAlert(err.response?.data?.error || '删除失败')
    }
  }

  const handleViewDetail = (client: TenantOAuthClient) => {
    setSelectedClient(client)
    setShowDetailModal(true)
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <TenantLayout title="OAuth客户端管理">
      <div>
        {/* 页面头部 */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">OAuth客户端管理</h1>
            <p className="mt-1 text-sm text-gray-500">
              管理应用的OAuth2客户端配置
            </p>
          </div>
          <PButton
            onClick={() => setShowCreateModal(true)}
            leftIcon={<PlusIcon className="h-4 w-4" />}
          >
            创建客户端
          </PButton>
        </div>

        {/* 搜索 */}
        <div className="flex justify-between items-center mb-6">
          <form onSubmit={handleSearch} className="flex items-center space-x-2">
            <div className="min-w-[240px]">
              <PInput
                type="text"
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                placeholder="搜索应用..."
                icon={<MagnifyingGlassIcon className="h-5 w-5" />}
                variant="rounded"
                autoComplete="off"
              />
            </div>
            <PButton type="submit" variant="primary">搜索</PButton>
          </form>
        </div>

        {/* 应用和客户端列表 */}
        <div className="bg-white shadow rounded-lg">
          {loading ? (
            <PSkeleton.List items={3} />
          ) : error ? (
            <div className="p-8 text-center">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mx-auto" />
              <p className="mt-2 text-red-600">{error}</p>
              <div className="mt-2">
                <PButton onClick={loadAppsWithClients}>重新加载</PButton>
              </div>
            </div>
          ) : !apps || apps.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">暂无应用</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                创建第一个OAuth客户端
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {(apps || []).map((app) => (
                <div key={app.id} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{app.name}</h3>
                      <p className="text-sm text-gray-500">{app.description}</p>
                    </div>
                    <PBadge variant={app.status === 'active' ? 'success' : 'error'}>
                      {app.status === 'active' ? '激活' : '停用'}
                    </PBadge>
                  </div>

                  {!app.oauth_clients || app.oauth_clients.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <KeyIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 mb-4">该应用暂无OAuth客户端</p>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                      >
                        创建OAuth客户端
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              客户端ID
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              状态
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              创建时间
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              操作
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {(app.oauth_clients || []).map((client) => (
                            <tr key={client.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                                  {client.client_id}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <PBadge variant={client.is_active ? 'success' : 'error'}>
                                  {client.is_active ? '激活' : '停用'}
                                </PBadge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {client.created_at}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleViewDetail(client)}
                                    className="text-blue-600 hover:text-blue-900"
                                    title="查看详情"
                                  >
                                    <EyeIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(client)}
                                    className="text-red-600 hover:text-red-900"
                                    title="删除"
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                  <PPagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    total={total}
                    pageSize={pageSize}
                    showInfo
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* 创建客户端模态框 */}
        <CreateOAuthClientModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadAppsWithClients}
          apps={(apps || []).map(app => ({
            id: app.id,
            name: app.name,
            description: app.description
          }))}
        />

        {/* 客户端详情模态框 */}
        <OAuthClientDetailModal
          client={selectedClient}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedClient(null)
          }}
          onUpdate={loadAppsWithClients}
        />
      </div>
    </TenantLayout>
  )
}
