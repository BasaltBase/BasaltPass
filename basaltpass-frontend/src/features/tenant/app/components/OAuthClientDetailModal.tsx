import { useState } from 'react'
import { ArrowPathIcon, ClipboardDocumentIcon, KeyIcon } from '@heroicons/react/24/outline'
import { tenantOAuthApi } from '@api/tenant/tenantOAuth'
import { PButton } from '@ui'

export interface OAuthClientLike {
  id: number
  client_id: string
  redirect_uris: string[]
  scopes: string[]
  is_active: boolean
  created_at: string
}

interface OAuthClientDetailModalProps {
  client: OAuthClientLike | null
  isOpen: boolean
  onClose: () => void
  onUpdate?: () => void
}

export default function OAuthClientDetailModal({ client, isOpen, onClose, onUpdate }: OAuthClientDetailModalProps) {
  const [newSecret, setNewSecret] = useState('')
  const [isRegenerating, setIsRegenerating] = useState(false)

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    alert('已复制到剪贴板')
  }

  const handleRegenerateSecret = async () => {
    if (!client || !confirm('确定要重新生成客户端密钥吗？这会使现有的密钥失效。')) return

    setIsRegenerating(true)
    try {
      const response = await tenantOAuthApi.regenerateSecret(client.client_id)
      const secret =
        response?.data?.data?.client_secret ??
        response?.data?.client_secret ??
        response?.client_secret ??
        ''

      if (!secret) {
        alert('密钥已重新生成，但未返回新密钥')
      }

      setNewSecret(secret)
      onUpdate?.()
    } catch (err) {
      console.error('重新生成密钥失败:', err)
      alert('重新生成密钥失败')
    } finally {
      setIsRegenerating(false)
    }
  }

  if (!isOpen || !client) return null

  return (
    <div className="fixed inset-0 !m-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-8">
      <div className="w-full max-w-3xl mx-4 bg-white shadow-xl rounded-xl border border-gray-100">
        <div className="bg-white px-6 py-5 border-b border-gray-200 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-indigo-600 p-2">
                <KeyIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">OAuth客户端详情</h3>
                <p className="mt-0.5 text-sm text-gray-500">查看配置与重新生成密钥</p>
              </div>
            </div>
            <button
              onClick={() => {
                setNewSecret('')
                onClose()
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-2 hover:bg-gray-100 rounded-lg"
            >
              <span className="sr-only">关闭</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Client ID</label>
              <div className="flex items-center space-x-2">
                <code className="flex-1 text-xs bg-gray-100 p-2 rounded border border-gray-200 break-all">{client.client_id}</code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(client.client_id)}
                  className="text-gray-600 hover:text-gray-800"
                  title="复制"
                >
                  <ClipboardDocumentIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">状态</label>
              <span
                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  client.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {client.is_active ? '激活' : '停用'}
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">创建时间</label>
              <p className="text-sm text-gray-900">{client.created_at}</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Client Secret</label>
              <PButton
                type="button"
                variant="secondary"
                size="sm"
                loading={isRegenerating}
                onClick={handleRegenerateSecret}
                leftIcon={<ArrowPathIcon className="h-4 w-4" />}
              >
                重新生成
              </PButton>
            </div>
            {newSecret ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-xs text-yellow-800 mb-2">请立即复制保存；关闭后将无法再次查看。</p>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 text-xs bg-white p-2 rounded border border-yellow-200 break-all">{newSecret}</code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(newSecret)}
                    className="text-yellow-700 hover:text-yellow-900"
                    title="复制"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">密钥已加密存储，无法查看（可重新生成）</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">重定向URI</label>
            <div className="space-y-2">
              {(client.redirect_uris || []).length === 0 ? (
                <div className="text-sm text-gray-500">未配置</div>
              ) : (
                (client.redirect_uris || []).map((uri, index) => (
                  <div key={index} className="text-sm bg-gray-50 p-2 rounded border border-gray-200 break-all">
                    {uri}
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Scopes</label>
            <div className="flex flex-wrap gap-2">
              {(client.scopes || []).length === 0 ? (
                <span className="text-sm text-gray-500">未配置</span>
              ) : (
                (client.scopes || []).map((scope) => (
                  <span key={scope} className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                    {scope}
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <PButton
              type="button"
              variant="secondary"
              onClick={() => {
                setNewSecret('')
                onClose()
              }}
            >
              关闭
            </PButton>
          </div>
        </div>
      </div>
    </div>
  )
}
