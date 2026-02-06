import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, RocketLaunchIcon, PlusIcon, TrashIcon, CubeIcon } from '@heroicons/react/24/outline'
import { tenantAppApi, CreateTenantAppRequest } from '@api/tenant/tenantApp'
import TenantLayout from '@features/tenant/components/TenantLayout'
import { ROUTES } from '@constants'

export default function CreateApp() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<CreateTenantAppRequest>({
    name: '',
    description: '',
    logo_url: '',
    homepage_url: '',
    callback_urls: [''],
    privacy_policy_url: '',
    terms_of_service_url: '',
    settings: {}
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = '应用名称不能为空'
    }

    if (!formData.description.trim()) {
      newErrors.description = '应用描述不能为空'
    }

    // 验证回调地址
    const validCallbackUrls = formData.callback_urls.filter(url => url.trim())
    if (validCallbackUrls.length === 0) {
      newErrors.callback_urls = '至少需要一个回调地址'
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
        newErrors.callback_urls = '请输入有效的URL格式'
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
        callback_urls: formData.callback_urls.filter(url => url.trim()),
        // 清空空字符串字段
        logo_url: formData.logo_url?.trim() || undefined,
        homepage_url: formData.homepage_url?.trim() || undefined,
        privacy_policy_url: formData.privacy_policy_url?.trim() || undefined,
        terms_of_service_url: formData.terms_of_service_url?.trim() || undefined
      }

      const result = await tenantAppApi.createTenantApp(cleanedData)
      navigate(ROUTES.tenant.apps)
    } catch (error) {
      console.error('Failed to create app:', error)
      alert('创建应用失败，请重试')
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
      callback_urls: [...prev.callback_urls, '']
    }))
  }

  const removeCallbackUrl = (index: number) => {
    setFormData(prev => ({
      ...prev,
      callback_urls: prev.callback_urls.filter((_, i) => i !== index)
    }))
  }

  const updateCallbackUrl = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      callback_urls: prev.callback_urls.map((url, i) => i === index ? value : url)
    }))
  }

  return (
    <TenantLayout title="创建应用">
      <div className="space-y-6">
        {/* 面包屑导航 */}
        <button
          onClick={() => navigate(ROUTES.tenant.apps)}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors duration-200"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          返回应用列表
        </button>

        {/* 页面头部 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="rounded-md bg-blue-500 p-3">
                  <CubeIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <h1 className="text-2xl font-bold text-gray-900">创建应用</h1>
                <p className="mt-1 text-sm text-gray-500">
                  创建一个新的 OAuth2 应用，配置认证和授权设置
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 创建表单 */}
        <div className="bg-white shadow rounded-lg">
          <form onSubmit={handleSubmit} className="px-4 py-5 sm:p-6 space-y-8">
            {/* 基本信息 */}
            <div className="border-b border-gray-200 pb-6">
              <div className="flex items-center mb-6">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <RocketLaunchIcon className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">基本信息</h3>
                  <p className="text-sm text-gray-500">配置应用的基本属性和展示信息</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    应用名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`block w-full rounded-md shadow-sm sm:text-sm ${
                      errors.name 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                    placeholder="例如：我的应用"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    应用描述 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className={`block w-full rounded-md shadow-sm sm:text-sm ${
                      errors.description 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                    placeholder="简要描述您的应用功能和用途"
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="logo_url" className="block text-sm font-medium text-gray-700 mb-2">
                    Logo URL
                  </label>
                  <input
                    type="url"
                    id="logo_url"
                    value={formData.logo_url}
                    onChange={(e) => handleInputChange('logo_url', e.target.value)}
                    className={`block w-full rounded-md shadow-sm sm:text-sm ${
                      errors.logo_url 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                    placeholder="https://example.com/logo.png"
                  />
                  {errors.logo_url && (
                    <p className="mt-1 text-sm text-red-600">{errors.logo_url}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="homepage_url" className="block text-sm font-medium text-gray-700 mb-2">
                    主页 URL
                  </label>
                  <input
                    type="url"
                    id="homepage_url"
                    value={formData.homepage_url}
                    onChange={(e) => handleInputChange('homepage_url', e.target.value)}
                    className={`block w-full rounded-md shadow-sm sm:text-sm ${
                      errors.homepage_url 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                    placeholder="https://example.com"
                  />
                  {errors.homepage_url && (
                    <p className="mt-1 text-sm text-red-600">{errors.homepage_url}</p>
                  )}
                </div>
              </div>
            </div>

            {/* OAuth2 配置 */}
            <div className="border-b border-gray-200 pb-6">
              <div className="flex items-center mb-6">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">OAuth2 配置</h3>
                  <p className="text-sm text-gray-500">配置 OAuth2 认证相关设置</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    回调地址 (Redirect URIs) <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    OAuth2 授权完成后重定向到的地址，至少需要配置一个
                  </p>
                  <div className="space-y-3">
                    {formData.callback_urls.map((url, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="url"
                          value={url}
                          onChange={(e) => updateCallbackUrl(index, e.target.value)}
                          className={`flex-1 rounded-md shadow-sm sm:text-sm ${
                            errors.callback_urls 
                              ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                          }`}
                          placeholder="https://example.com/callback"
                        />
                        {formData.callback_urls.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeCallbackUrl(index)}
                            className="inline-flex items-center p-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {errors.callback_urls && (
                    <p className="mt-1 text-sm text-red-600">{errors.callback_urls}</p>
                  )}
                  <button
                    type="button"
                    onClick={addCallbackUrl}
                    className="mt-3 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    添加回调地址
                  </button>
                </div>
              </div>
            </div>

            {/* 法律信息 */}
            <div className="pb-6">
              <div className="flex items-center mb-6">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">法律信息</h3>
                  <p className="text-sm text-gray-500">配置隐私政策和服务条款链接</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="privacy_policy_url" className="block text-sm font-medium text-gray-700 mb-2">
                    隐私政策 URL
                  </label>
                  <input
                    type="url"
                    id="privacy_policy_url"
                    value={formData.privacy_policy_url}
                    onChange={(e) => handleInputChange('privacy_policy_url', e.target.value)}
                    className={`block w-full rounded-md shadow-sm sm:text-sm ${
                      errors.privacy_policy_url 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                    placeholder="https://example.com/privacy"
                  />
                  {errors.privacy_policy_url && (
                    <p className="mt-1 text-sm text-red-600">{errors.privacy_policy_url}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="terms_of_service_url" className="block text-sm font-medium text-gray-700 mb-2">
                    服务条款 URL
                  </label>
                  <input
                    type="url"
                    id="terms_of_service_url"
                    value={formData.terms_of_service_url}
                    onChange={(e) => handleInputChange('terms_of_service_url', e.target.value)}
                    className={`block w-full rounded-md shadow-sm sm:text-sm ${
                      errors.terms_of_service_url 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                    placeholder="https://example.com/terms"
                  />
                  {errors.terms_of_service_url && (
                    <p className="mt-1 text-sm text-red-600">{errors.terms_of_service_url}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate(ROUTES.tenant.apps)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    创建中...
                  </>
                ) : (
                  <>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    创建应用
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </TenantLayout>
  )
}
