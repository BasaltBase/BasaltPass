import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, RocketLaunchIcon, PlusIcon, TrashIcon, CubeIcon, CheckIcon } from '@heroicons/react/24/outline'
import { tenantAppApi, CreateTenantAppRequest } from '@api/tenant/tenantApp'
import TenantLayout from '@features/tenant/components/TenantLayout'
import { ROUTES } from '@constants'
import { PButton, PCard, PInput, PTextarea } from '@ui'

export default function CreateApp() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<CreateTenantAppRequest>({
    name: '',
    description: '',
    logo_url: '',
    homepage_url: '',
    redirect_uris: [''],
    privacy_policy_url: '',
    terms_of_service_url: '',
    is_verified: false,
    settings: {}
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [createdCredentials, setCreatedCredentials] = useState<{ clientId: string, clientSecret: string } | null>(null)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = '应用名称不能为空'
    }

    if (!formData.description.trim()) {
      newErrors.description = '应用描述不能为空'
    }

    // 验证回调地址
    const validCallbackUrls = formData.redirect_uris.filter(url => url.trim())
    if (validCallbackUrls.length === 0) {
      newErrors.redirect_uris = '至少需要一个回调地址'
    } else {
      const invalidUrls = validCallbackUrls.filter(url => {
        try {
          new URL(url)
          return false
        } catch {
          return true
        }
      })
      if (invalidUrls.length > 0) {
        newErrors.redirect_uris = '请输入有效的URL格式'
      }
    }

    // 验证其他URL字段
    if (formData.homepage_url && formData.homepage_url.trim()) {
      try {
        new URL(formData.homepage_url)
      } catch {
        newErrors.homepage_url = '请输入有效的URL格式'
      }
    }

    if (formData.logo_url && formData.logo_url.trim()) {
      try {
        new URL(formData.logo_url)
      } catch {
        newErrors.logo_url = '请输入有效的URL格式'
      }
    }

    if (formData.privacy_policy_url && formData.privacy_policy_url.trim()) {
      try {
        new URL(formData.privacy_policy_url)
      } catch {
        newErrors.privacy_policy_url = '请输入有效的URL格式'
      }
    }

    if (formData.terms_of_service_url && formData.terms_of_service_url.trim()) {
      try {
        new URL(formData.terms_of_service_url)
      } catch {
        newErrors.terms_of_service_url = '请输入有效的URL格式'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setLoading(true)
      
      // 过滤空的回调地址
      const cleanedData = {
        ...formData,
        redirect_uris: formData.redirect_uris.filter(url => url.trim()),
        // 清空空字符串字段
        logo_url: formData.logo_url?.trim() || undefined,
        homepage_url: formData.homepage_url?.trim() || undefined,
        privacy_policy_url: formData.privacy_policy_url?.trim() || undefined,
        terms_of_service_url: formData.terms_of_service_url?.trim() || undefined
      }

      const result = await tenantAppApi.createTenantApp(cleanedData)
      
      if (result.data?.oauth_clients?.[0]) {
        setCreatedCredentials({
          clientId: result.data.oauth_clients[0].client_id,
          clientSecret: result.data.oauth_clients[0].client_secret
        })
      } else {
        navigate(ROUTES.tenant.apps)
      }
    } catch (error) {
      console.error('Failed to create app:', error)
      uiAlert('创建应用失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof CreateTenantAppRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // 清除该字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const addCallbackUrl = () => {
    setFormData(prev => ({
      ...prev,
      redirect_uris: [...prev.redirect_uris, '']
    }))
  }

  const removeCallbackUrl = (index: number) => {
    setFormData(prev => ({
      ...prev,
      redirect_uris: prev.redirect_uris.filter((_, i) => i !== index)
    }))
  }

  const updateCallbackUrl = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      redirect_uris: prev.redirect_uris.map((url, i) => i === index ? value : url)
    }))
  }

  const handleCloseModal = () => {
    setCreatedCredentials(null)
    navigate(ROUTES.tenant.apps)
  }

  return (
    <TenantLayout title="创建应用">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <PButton
            variant="ghost"
            size="sm"
            onClick={() => navigate(ROUTES.tenant.apps)}
            leftIcon={<ArrowLeftIcon className="h-4 w-4" />}
            className="text-gray-600 hover:text-gray-800"
          >
            返回应用列表
          </PButton>
        </div>

        <PCard padding="xl" className="bg-gradient-to-r from-indigo-50 to-white">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="rounded-xl bg-indigo-600 p-3 shadow-sm">
                <CubeIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">创建应用</h1>
              <p className="mt-1 text-sm text-gray-600">
                创建一个新的 OAuth2 应用，配置认证和授权设置。
              </p>
            </div>
          </div>
        </PCard>

        <PCard padding="xl">
          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="border-b border-gray-200 pb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-9 w-9 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <RocketLaunchIcon className="h-5 w-5 text-indigo-700" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">基本信息</h2>
                  <p className="text-sm text-gray-600">配置应用的基本属性和展示信息</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <PInput
                    id="name"
                    value={formData.name}
                    onChange={(e: any) => handleInputChange('name', e.target.value)}
                    label={
                      <span>
                        应用名称 <span className="text-red-500">*</span>
                      </span>
                    }
                    placeholder="例如：我的应用"
                    error={errors.name}
                    autoComplete="off"
                  />
                </div>

                <div className="sm:col-span-2">
                  <PTextarea
                    id="description"
                    rows={4}
                    value={formData.description}
                    onChange={(e: any) => handleInputChange('description', e.target.value)}
                    label={
                      <span>
                        应用描述 <span className="text-red-500">*</span>
                      </span>
                    }
                    placeholder="简要描述您的应用功能和用途"
                    error={errors.description}
                  />
                </div>

                <div className="sm:col-span-2">
                  <PInput
                    type="url"
                    id="logo_url"
                    value={formData.logo_url}
                    onChange={(e: any) => handleInputChange('logo_url', e.target.value)}
                    label="Logo URL"
                    placeholder="https://example.com/logo.png"
                    error={errors.logo_url}
                    autoComplete="off"
                  />
                </div>

                <div className="sm:col-span-2">
                  <PInput
                    type="url"
                    id="homepage_url"
                    value={formData.homepage_url}
                    onChange={(e: any) => handleInputChange('homepage_url', e.target.value)}
                    label="主页 URL"
                    placeholder="https://example.com"
                    error={errors.homepage_url}
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>

            <div className="border-b border-gray-200 pb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-9 w-9 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <svg className="h-5 w-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">OAuth2 配置</h2>
                  <p className="text-sm text-gray-600">配置 OAuth2 认证相关设置</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-gray-700">
                        回调地址 (Redirect URIs) <span className="text-red-500">*</span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        OAuth2 授权完成后重定向到的地址，至少需要配置一个
                      </div>
                    </div>
                    <PButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={addCallbackUrl}
                      leftIcon={<PlusIcon className="h-4 w-4" />}
                    >
                      添加回调地址
                    </PButton>
                  </div>

                  <div className="mt-4 space-y-3">
                    {formData.redirect_uris.map((url, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="flex-1">
                          <PInput
                            type="url"
                            value={url}
                            onChange={(e: any) => updateCallbackUrl(index, e.target.value)}
                            placeholder="https://example.com/callback"
                            error={index === 0 ? errors.redirect_uris : undefined}
                            aria-label={`回调地址 ${index + 1}`}
                            autoComplete="off"
                          />
                        </div>

                        {formData.redirect_uris.length > 1 && (
                          <PButton
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => removeCallbackUrl(index)}
                            className="px-3"
                            aria-label="删除回调地址"
                            title="删除"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </PButton>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-9 w-9 bg-purple-100 rounded-xl flex items-center justify-center">
                  <svg className="h-5 w-5 text-purple-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">法律信息</h2>
                  <p className="text-sm text-gray-600">配置隐私政策和服务条款链接</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <PInput
                    type="url"
                    id="privacy_policy_url"
                    value={formData.privacy_policy_url}
                    onChange={(e: any) => handleInputChange('privacy_policy_url', e.target.value)}
                    label="隐私政策 URL"
                    placeholder="https://example.com/privacy"
                    error={errors.privacy_policy_url}
                    autoComplete="off"
                  />
                </div>

                <div className="sm:col-span-2">
                  <PInput
                    type="url"
                    id="terms_of_service_url"
                    value={formData.terms_of_service_url}
                    onChange={(e: any) => handleInputChange('terms_of_service_url', e.target.value)}
                    label="服务条款 URL"
                    placeholder="https://example.com/terms"
                    error={errors.terms_of_service_url}
                    autoComplete="off"
                  />
                </div>

                {/* 认证徽章 */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full flex items-center justify-center" style={{ background: '#1d9bf0' }}>
                        <svg viewBox="0 0 24 24" fill="white" className="h-5 w-5">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">标记为认证应用</p>
                        <p className="text-xs text-gray-500">
                          认证应用将在 OAuth 授权页面显示蓝色验证徽章，表明该应用由租户运营并受信任
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={formData.is_verified}
                      onClick={() => handleInputChange('is_verified', !formData.is_verified)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        formData.is_verified ? 'bg-blue-500' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          formData.is_verified ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
              <PButton
                type="button"
                variant="secondary"
                onClick={() => navigate(ROUTES.tenant.apps)}
              >
                取消
              </PButton>
              <PButton
                type="submit"
                variant="primary"
                loading={loading}
                leftIcon={<PlusIcon className="h-4 w-4" />}
              >
                创建应用
              </PButton>
            </div>
          </form>
        </PCard>
      </div>

      {createdCredentials && (
        <div className="fixed inset-0 !m-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <div className="flex items-center mb-4">
              <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <CheckIcon className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-medium text-gray-900">应用创建成功</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                请复制并妥善保存以下 <strong>Client Secret</strong>。这是您唯一一次能看到该密钥的机会，关闭此窗口后将无法再次查看。
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
                  <div className="bg-gray-50 p-3 rounded border border-gray-200 font-mono text-sm break-all">
                    {createdCredentials.clientId}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Secret</label>
                  <div className="bg-gray-50 p-3 rounded border border-gray-200 font-mono text-sm break-all">
                    {createdCredentials.clientSecret}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <PButton variant="primary" onClick={handleCloseModal}>
                我已保存，去应用列表
              </PButton>
            </div>
          </div>
        </div>
      )}
    </TenantLayout>
  )
}
