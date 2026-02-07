import { useState } from 'react'
import { ExclamationTriangleIcon, KeyIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline'
import { tenantOAuthApi, CreateTenantOAuthClientRequest } from '@api/tenant/tenantOAuth'
import { PButton, PInput, PSelect, PTextarea, PCheckbox } from '@ui'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'

export interface CreateOAuthClientModalApp {
  id: number
  name: string
  description?: string
}

interface CreateOAuthClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  apps: CreateOAuthClientModalApp[]
  /** Preselect an app id when opening */
  defaultAppId?: number
  /** Lock the app selector when used from an app detail page */
  lockAppSelect?: boolean
}

export default function CreateOAuthClientModal({
  isOpen,
  onClose,
  onSuccess,
  apps,
  defaultAppId,
  lockAppSelect = false
}: CreateOAuthClientModalProps) {
  const initialAppId = defaultAppId ?? (apps?.[0]?.id ?? 0)

  const [formData, setFormData] = useState<CreateTenantOAuthClientRequest>({
    app_id: initialAppId,
    name: '',
    description: '',
    redirect_uris: [''],
    scopes: ['openid', 'profile', 'email'],
    allowed_origins: ['']
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdCredentials, setCreatedCredentials] = useState<{ clientId: string; clientSecret: string } | null>(null)

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    alert('已复制到剪贴板')
  }

  const resetForm = () => {
    setCreatedCredentials(null)
    setError('')
    setFormData({
      app_id: initialAppId,
      name: '',
      description: '',
      redirect_uris: [''],
      scopes: ['openid', 'profile', 'email'],
      allowed_origins: ['']
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const cleanedData = {
        ...formData,
        redirect_uris: (formData.redirect_uris || []).filter(uri => uri.trim() !== ''),
        allowed_origins: (formData.allowed_origins || []).filter(origin => origin.trim() !== '')
      }

      const response = await tenantOAuthApi.createClient(cleanedData)
      const clientId = response?.data?.client?.client_id
      const clientSecret = response?.data?.client?.client_secret

      if (!clientId || !clientSecret) {
        onSuccess()
        onClose()
        setError('客户端已创建，但未返回密钥；请进入详情页点击“重新生成”获取新的密钥')
        return
      }

      setCreatedCredentials({ clientId, clientSecret })
    } catch (err: any) {
      setError(err.response?.data?.error || '创建失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDone = () => {
    onSuccess()
    onClose()
    resetForm()
  }

  const addRedirectUri = () => {
    setFormData(prev => ({
      ...prev,
      redirect_uris: [...(prev.redirect_uris || []), '']
    }))
  }

  const removeRedirectUri = (index: number) => {
    setFormData(prev => ({
      ...prev,
      redirect_uris: (prev.redirect_uris || []).filter((_, i) => i !== index)
    }))
  }

  const updateRedirectUri = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      redirect_uris: (prev.redirect_uris || []).map((uri, i) => (i === index ? value : uri))
    }))
  }

  const addAllowedOrigin = () => {
    setFormData(prev => ({
      ...prev,
      allowed_origins: [...(prev.allowed_origins || []), '']
    }))
  }

  const removeAllowedOrigin = (index: number) => {
    setFormData(prev => ({
      ...prev,
      allowed_origins: (prev.allowed_origins || []).filter((_, i) => i !== index)
    }))
  }

  const updateAllowedOrigin = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      allowed_origins: (prev.allowed_origins || []).map((origin, i) => (i === index ? value : origin))
    }))
  }

  const toggleScope = (scope: string) => {
    setFormData(prev => ({
      ...prev,
      scopes: (prev.scopes || []).includes(scope)
        ? (prev.scopes || []).filter(s => s !== scope)
        : [...(prev.scopes || []), scope]
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 !m-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-8">
      <div className="relative w-full max-w-3xl mx-4 bg-white shadow-xl rounded-xl border border-gray-100">
        <div className="bg-white px-6 py-5 border-b border-gray-200 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="rounded-md bg-indigo-600 p-3">
                  <KeyIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-xl font-semibold text-gray-900">创建OAuth客户端</h3>
                <p className="mt-1 text-sm text-gray-500">为您的应用配置OAuth2认证客户端</p>
              </div>
            </div>
            <button
              onClick={() => {
                onClose()
                resetForm()
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

        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {createdCredentials ? (
          <div className="px-6 py-6 space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">客户端已创建成功。密钥仅展示一次，请立即保存。</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Client ID</label>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 text-sm bg-gray-100 p-2 rounded border border-gray-200 break-all">{createdCredentials.clientId}</code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(createdCredentials.clientId)}
                    className="text-gray-600 hover:text-gray-800"
                    title="复制"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Client Secret</label>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-xs text-yellow-800 mb-2">请立即复制保存；关闭后将无法再次查看。</p>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 text-sm bg-white p-2 rounded border border-yellow-200 break-all">{createdCredentials.clientSecret}</code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(createdCredentials.clientSecret)}
                      className="text-yellow-700 hover:text-yellow-900"
                      title="复制"
                    >
                      <ClipboardDocumentIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form id="oauth-client-form" onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
            <div className="border-b border-gray-200 pb-6">
              <div className="flex items-center mb-4">
                <div className="h-2 w-2 bg-indigo-600 rounded-full mr-3"></div>
                <h4 className="text-lg font-medium text-gray-900">基本信息</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2">
                  <PSelect
                    required
                    value={formData.app_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, app_id: parseInt((e.target as HTMLSelectElement).value) }))}
                    disabled={lockAppSelect}
                    label={
                      <span>
                        关联应用 <span className="text-red-500">*</span>
                      </span>
                    }
                    variant="rounded"
                    size="lg"
                  >
                    <option value={0}>请选择要配置的应用</option>
                    {(apps || []).map(app => (
                      <option key={app.id} value={app.id}>{app.name}</option>
                    ))}
                  </PSelect>
                </div>

                <div>
                  <PInput
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: (e.target as HTMLInputElement).value }))}
                    label={
                      <span>
                        客户端名称 <span className="text-red-500">*</span>
                      </span>
                    }
                    placeholder="例如：Web客户端"
                    variant="rounded"
                    size="lg"
                    autoComplete="off"
                  />
                </div>

                <div>
                  <PTextarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: (e.target as HTMLTextAreaElement).value }))}
                    label="客户端描述"
                    rows={3}
                    placeholder="简要描述此客户端的用途..."
                    variant="rounded"
                    size="lg"
                  />
                </div>
              </div>
            </div>

            <div className="border-b border-gray-200 pb-6">
              <div className="flex items-center mb-4">
                <div className="h-2 w-2 bg-emerald-600 rounded-full mr-3"></div>
                <h4 className="text-lg font-medium text-gray-900">OAuth配置</h4>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  重定向URI <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                  {(formData.redirect_uris || []).map((uri, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="flex-1">
                        <PInput
                          type="url"
                          value={uri}
                          onChange={(e) => updateRedirectUri(index, (e.target as HTMLInputElement).value)}
                          placeholder="https://example.com/auth/callback"
                          variant="rounded"
                          size="lg"
                          aria-label={`重定向URI ${index + 1}`}
                          autoComplete="off"
                        />
                      </div>
                      {(formData.redirect_uris || []).length > 1 && (
                        <PButton
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => removeRedirectUri(index)}
                          className="px-3"
                          title="删除URI"
                          aria-label="删除URI"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </PButton>
                      )}
                    </div>
                  ))}
                  <PButton
                    type="button"
                    onClick={addRedirectUri}
                    variant="secondary"
                    size="sm"
                    leftIcon={<PlusIcon className="h-4 w-4" />}
                  >
                    添加重定向URI
                  </PButton>
                </div>
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>提示：</strong>用户授权后将重定向到这些地址，请确保地址有效且支持HTTPS
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">权限范围</label>
                <div className="grid grid-cols-2 gap-3">
                  {['openid', 'profile', 'email', 'offline_access'].map(scope => (
                    <PCheckbox
                      key={scope}
                      variant="card"
                      checked={(formData.scopes || []).includes(scope)}
                      onChange={() => toggleScope(scope)}
                      label={scope}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="pb-6">
              <div className="flex items-center mb-4">
                <div className="h-2 w-2 bg-purple-600 rounded-full mr-3"></div>
                <h4 className="text-lg font-medium text-gray-900">CORS配置</h4>
                <span className="ml-2 text-sm text-gray-500">(可选)</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">允许的来源</label>
                <div className="space-y-3">
                  {(formData.allowed_origins || []).map((origin, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="flex-1">
                        <PInput
                          type="url"
                          value={origin}
                          onChange={(e) => updateAllowedOrigin(index, (e.target as HTMLInputElement).value)}
                          placeholder="https://example.com"
                          variant="rounded"
                          size="lg"
                          aria-label={`允许的来源 ${index + 1}`}
                          autoComplete="off"
                        />
                      </div>
                      <PButton
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => removeAllowedOrigin(index)}
                        className="px-3"
                        title="删除来源"
                        aria-label="删除来源"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </PButton>
                    </div>
                  ))}
                  <PButton
                    type="button"
                    onClick={addAllowedOrigin}
                    variant="secondary"
                    size="sm"
                    leftIcon={<PlusIcon className="h-4 w-4" />}
                  >
                    添加允许的来源
                  </PButton>
                </div>
                <p className="mt-2 text-xs text-gray-500">配置允许跨域请求的源域名</p>
              </div>
            </div>
          </form>
        )}

        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-xl flex flex-col sm:flex-row sm:justify-end gap-3">
          <PButton
            type="button"
            variant="secondary"
            onClick={createdCredentials ? handleDone : () => {
              onClose()
              resetForm()
            }}
            className="w-full sm:w-auto"
          >
            {createdCredentials ? '完成' : '取消'}
          </PButton>
          {!createdCredentials && (
            <PButton
              type="submit"
              form="oauth-client-form"
              loading={isLoading}
              className="w-full sm:w-auto"
              leftIcon={<KeyIcon className="h-4 w-4" />}
            >
              创建客户端
            </PButton>
          )}
        </div>
      </div>
    </div>
  )
}
