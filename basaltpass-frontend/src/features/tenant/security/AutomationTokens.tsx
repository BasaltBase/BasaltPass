import React, { useEffect, useMemo, useState } from 'react'
import {
  ClipboardDocumentIcon,
  KeyIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import TenantLayout from '@features/tenant/components/TenantLayout'
import { tenantManualApi, TenantManualApiKey } from '@api/tenant/manualApi'
import { Modal, PAlert, PBadge, PButton, PInput, PPageHeader, PSkeleton } from '@ui'
import { uiConfirm } from '@contexts/DialogContext'

const formatDateTime = (value?: string) => {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

const toDatetimeLocalValue = (value?: string) => {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default function TenantAutomationTokens() {
  const [keys, setKeys] = useState<TenantManualApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [createdToken, setCreatedToken] = useState('')

  const hasKeys = useMemo(() => keys.length > 0, [keys])

  const loadKeys = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await tenantManualApi.listKeys()
      setKeys(response.data || [])
    } catch (err: any) {
      setError(err.response?.data?.error || '加载自动化令牌失败')
      setKeys([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadKeys()
  }, [])

  const resetForm = () => {
    setName('')
    setExpiresAt('')
  }

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return

    try {
      setSubmitting(true)
      const payload = {
        name: name.trim(),
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      }
      const response = await tenantManualApi.createKey(payload)
      setCreatedToken(response.data.key)
      setModalOpen(false)
      resetForm()
      await loadKeys()
    } catch (err: any) {
      setError(err.response?.data?.error || '创建自动化令牌失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (key: TenantManualApiKey) => {
    const confirmed = await uiConfirm(`确定删除令牌 "${key.name}" 吗？删除后自动化脚本将立即失效。`)
    if (!confirmed) return

    try {
      await tenantManualApi.deleteKey(key.id)
      await loadKeys()
    } catch (err: any) {
      setError(err.response?.data?.error || '删除自动化令牌失败')
    }
  }

  const handleCopy = async (value: string) => {
    if (!value) return
    await navigator.clipboard.writeText(value)
  }

  return (
    <TenantLayout title="自动化令牌">
      <div className="space-y-6 p-6">
        <PPageHeader
          title="自动化令牌"
          description="为脚本、CLI 或 CI 任务创建 tenant 级访问令牌。令牌明文只会在创建成功时显示一次。"
          icon={<KeyIcon className="h-8 w-8 text-indigo-600" />}
          actions={
            <PButton onClick={() => setModalOpen(true)} leftIcon={<PlusIcon className="h-4 w-4" />}>
              创建令牌
            </PButton>
          }
        />

        <PAlert variant="info" title="使用方式">
          自动化接口使用 `X-API-Key` 请求头，而不是当前控制台登录态里的 JWT。创建后请把令牌保存到脚本密钥管理中。
        </PAlert>

        {error && (
          <PAlert variant="error" title="请求失败" dismissible onDismiss={() => setError('')}>
            {error}
          </PAlert>
        )}

        {createdToken && (
          <PAlert
            variant="success"
            title="令牌已创建"
            dismissible
            onDismiss={() => setCreatedToken('')}
            actions={
              <PButton variant="secondary" size="sm" onClick={() => handleCopy(createdToken)} leftIcon={<ClipboardDocumentIcon className="h-4 w-4" />}>
                复制令牌
              </PButton>
            }
          >
            <div className="space-y-2">
              <p>这段明文只会显示这一次，请立即复制保存。</p>
              <code className="block overflow-x-auto rounded-lg bg-green-100 px-3 py-2 text-xs text-green-900">
                {createdToken}
              </code>
            </div>
          </PAlert>
        )}

        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          {loading ? (
            <PSkeleton.List items={4} />
          ) : !hasKeys ? (
            <div className="px-6 py-16 text-center text-gray-500">
              <KeyIcon className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <p>还没有自动化令牌。</p>
              <PButton className="mt-4" onClick={() => setModalOpen(true)}>
                创建第一个令牌
              </PButton>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">名称</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">前缀</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">上次使用</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">过期时间</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">创建时间</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {keys.map((key) => {
                    const expired = key.expires_at ? new Date(key.expires_at).getTime() < Date.now() : false
                    return (
                      <tr key={key.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{key.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          <code className="rounded bg-gray-100 px-2 py-1 text-xs">{key.key_prefix}</code>
                        </td>
                        <td className="px-6 py-4">
                          <PBadge variant={expired ? 'warning' : 'success'}>
                            {expired ? '已过期' : '可用'}
                          </PBadge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{formatDateTime(key.last_used_at)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{formatDateTime(key.expires_at)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{formatDateTime(key.created_at)}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDelete(key)}
                            className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                            title="删除令牌"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {modalOpen && (
          <Modal open={modalOpen} onClose={() => { setModalOpen(false); resetForm() }} title="创建自动化令牌" widthClass="max-w-lg">
            <form onSubmit={handleCreate} className="space-y-5">
              <PInput
                label="令牌名称"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="例如：deploy-bot、nightly-sync"
                required
                autoFocus
              />

              <PInput
                label="过期时间"
                type="datetime-local"
                value={toDatetimeLocalValue(expiresAt)}
                onChange={(event) => setExpiresAt(event.target.value)}
              />

              <PAlert variant="warning" title="安全提示">
                建议为每个自动化脚本单独创建一个令牌，并设置合理的过期时间，便于后续轮换和吊销。
              </PAlert>

              <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
                <PButton type="button" variant="secondary" onClick={() => { setModalOpen(false); resetForm() }}>
                  取消
                </PButton>
                <PButton type="submit" loading={submitting}>
                  创建令牌
                </PButton>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </TenantLayout>
  )
}
