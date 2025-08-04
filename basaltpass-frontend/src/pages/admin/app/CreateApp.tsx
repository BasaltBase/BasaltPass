import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, RocketLaunchIcon, PlusIcon, TrashIcon, CubeIcon, KeyIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { tenantAppApi, CreateTenantAppRequest } from '@api/tenant/tenantApp'
import TenantLayout from '../../../components/TenantLayout'

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

      await tenantAppApi.createTenantApp(cleanedData)
      navigate('/tenant/apps')
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
          onClick={() => navigate('/tenant/apps')}
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
                    className={`block w-full px-4 py-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white hover:border-gray-300 ${
                      errors.name ? 'border-red-300 focus:border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="例如：我的网站"
                  />
                  {errors.name && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                      {errors.name}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    应用描述 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="description"
                    rows={4}
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className={`block w-full px-4 py-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white hover:border-gray-300 resize-none ${
                      errors.description ? 'border-red-300 focus:border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="简要描述你的应用功能和用途..."
                  />
                  {errors.description && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                      {errors.description}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="logo_url" className="block text-sm font-medium text-gray-700 mb-2">
                    Logo URL
                  </label>
                  <input
                    type="url"
                    id="logo_url"
                    value={formData.logo_url}
                    onChange={(e) => handleInputChange('logo_url', e.target.value)}
                    className={`block w-full px-4 py-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white hover:border-gray-300 ${
                      errors.logo_url ? 'border-red-300 focus:border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="https://example.com/logo.png"
                  />
                  {errors.logo_url ? (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                      {errors.logo_url}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-gray-500">可选 - 应用的图标或徽标链接</p>
                  )}
                </div>

                <div>
                  <label htmlFor="homepage_url" className="block text-sm font-medium text-gray-700 mb-2">
                    主页 URL
                  </label>
                  <input
                    type="url"
                    id="homepage_url"
                    value={formData.homepage_url}
                    onChange={(e) => handleInputChange('homepage_url', e.target.value)}
                    className={`block w-full px-4 py-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white hover:border-gray-300 ${
                      errors.homepage_url ? 'border-red-300 focus:border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="https://example.com"
                  />
                  {errors.homepage_url ? (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                      {errors.homepage_url}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-gray-500">可选 - 应用的官方网站地址</p>
                  )}
                </div>
              </div>
            </div>

            {/* OAuth 配置 */}
            <div className="border-b border-gray-200 pb-6">
              <div className="flex items-center mb-6">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <KeyIcon className="h-5 w-5 text-green-600" />
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">OAuth 配置</h3>
                  <p className="text-sm text-gray-500">设置OAuth2认证流程的关键参数</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  授权回调地址 <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                  {formData.callback_urls.map((url, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="flex-1">
                        <input
                          type="url"
                          value={url}
                          onChange={(e) => updateCallbackUrl(index, e.target.value)}
                          className="block w-full px-4 py-3 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white hover:border-gray-300"
                          placeholder="https://example.com/auth/callback"
                        />
                      </div>
                      {formData.callback_urls.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCallbackUrl(index)}
                          className="inline-flex items-center p-2 border border-red-300 rounded-lg text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors duration-200"
                          title="删除回调地址"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addCallbackUrl}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    添加回调地址
                  </button>
                </div>
                {errors.callback_urls && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                    {errors.callback_urls}
                  </p>
                )}
                <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>提示：</strong>用户完成OAuth授权后将重定向到这些地址。请确保地址有效且支持HTTPS。
                  </p>
                </div>
              </div>
            </div>

            {/* 法律信息 */}
            <div className="pb-6">
              <div className="flex items-center mb-6">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <DocumentTextIcon className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">法律信息</h3>
                  <p className="text-sm text-gray-500">可选 - 提供隐私政策和服务条款链接</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="privacy_policy_url" className="block text-sm font-medium text-gray-700 mb-2">
                    隐私政策 URL
                  </label>
                  <input
                    type="url"
                    id="privacy_policy_url"
                    value={formData.privacy_policy_url}
                    onChange={(e) => handleInputChange('privacy_policy_url', e.target.value)}
                    className={`block w-full px-4 py-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white hover:border-gray-300 ${
                      errors.privacy_policy_url ? 'border-red-300 focus:border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="https://example.com/privacy"
                  />
                  {errors.privacy_policy_url ? (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                      {errors.privacy_policy_url}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-gray-500">用户隐私保护政策的链接</p>
                  )}
                </div>

                <div>
                  <label htmlFor="terms_of_service_url" className="block text-sm font-medium text-gray-700 mb-2">
                    服务条款 URL
                  </label>
                  <input
                    type="url"
                    id="terms_of_service_url"
                    value={formData.terms_of_service_url}
                    onChange={(e) => handleInputChange('terms_of_service_url', e.target.value)}
                    className={`block w-full px-4 py-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white hover:border-gray-300 ${
                      errors.terms_of_service_url ? 'border-red-300 focus:border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="https://example.com/terms"
                  />
                  {errors.terms_of_service_url ? (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                      {errors.terms_of_service_url}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-gray-500">应用服务使用条款的链接</p>
                  )}
                </div>
              </div>
            </div>

            {/* 提交按钮 */}
            <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/tenant/apps')}
                className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    创建中...
                  </>
                ) : (
                  <>
                    <RocketLaunchIcon className="h-4 w-4 mr-2" />
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
