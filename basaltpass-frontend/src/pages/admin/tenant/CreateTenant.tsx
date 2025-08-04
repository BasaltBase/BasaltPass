import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  BuildingOfficeIcon, 
  GlobeAltIcon, 
  CreditCardIcon,
  DocumentTextIcon,
  CogIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import AdminLayout from '@components/AdminLayout'
import { CreateTenantRequest } from '@api/tenant/tenant'
import {tenant} from "@api/admin/tenant";

const CreateTenant: React.FC = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<CreateTenantRequest>({
    name: '',
    domain: '',
    plan: 'free',
    settings: {}
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [domainError, setDomainError] = useState<string | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // 实时验证域名格式
    if (name === 'domain') {
      validateDomain(value)
    }
  }

  const validateDomain = (domain: string) => {
    if (!domain) {
      setDomainError(null)
      return
    }

    // 简单的域名格式验证
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$/
    if (!domainRegex.test(domain)) {
      setDomainError('请输入有效的域名格式 (例如: example.com)')
    } else {
      setDomainError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setError('租户名称不能为空')
      return
    }

    if (!formData.domain.trim()) {
      setError('域名不能为空')
      return
    }

    if (domainError) {
      setError('请修正域名格式错误')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      await tenant.createTenant(formData)
      
      // 创建成功后跳转到租户列表
      navigate('/admin/tenants', { 
        state: { message: '租户创建成功！' }
      })
    } catch (err: any) {
      console.error('创建租户失败:', err)
      setError(err.response?.data?.message || '创建租户失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    navigate('/admin/tenants')
  }

  const planOptions = [
    { value: 'free', label: '免费版', description: '基础功能，适合个人用户' },
    { value: 'basic', label: '基础版', description: '扩展功能，适合小团队' },
    { value: 'premium', label: '高级版', description: '完整功能，适合中型企业' },
    { value: 'enterprise', label: '企业版', description: '定制化功能，适合大型企业' }
  ]

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'free':
        return 'bg-gray-100 text-gray-800'
      case 'basic':
        return 'bg-blue-100 text-blue-800'
      case 'premium':
        return 'bg-purple-100 text-purple-800'
      case 'enterprise':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <AdminLayout title="创建租户">
      <div className="space-y-6">
        {/* 页面头部 */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <BuildingOfficeIcon className="h-8 w-8 mr-3 text-indigo-600" />
            创建新租户
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            为平台创建一个新的租户组织
          </p>
        </div>

        {/* 表单区域 */}
        <div className="bg-white shadow-lg rounded-xl border border-gray-100">
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* 错误提示 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">创建失败</h3>
                    <div className="mt-2 text-sm text-red-700">{error}</div>
                  </div>
                </div>
              </div>
            )}

            {/* 基本信息 */}
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <DocumentTextIcon className="h-5 w-5 mr-2 text-indigo-500" />
                  基本信息
                </h3>
              </div>

              {/* 租户名称 */}
              <div className="space-y-2">
                <label htmlFor="name" className="flex items-center text-sm font-semibold text-gray-700">
                  <BuildingOfficeIcon className="h-5 w-5 mr-2 text-indigo-500" />
                  租户名称 <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-3 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white hover:border-gray-300"
                    placeholder="输入租户名称"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500">租户的显示名称，用于在平台中标识该组织</p>
              </div>

              {/* 域名 */}
              <div className="space-y-2">
                <label htmlFor="domain" className="flex items-center text-sm font-semibold text-gray-700">
                  <GlobeAltIcon className="h-5 w-5 mr-2 text-indigo-500" />
                  域名 <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="domain"
                    name="domain"
                    value={formData.domain}
                    onChange={handleInputChange}
                    className={`block w-full px-4 py-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white hover:border-gray-300 ${
                      domainError ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-indigo-500'
                    }`}
                    placeholder="example.com"
                    required
                  />
                  {domainError && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                    </div>
                  )}
                </div>
                {domainError ? (
                  <p className="text-xs text-red-500">{domainError}</p>
                ) : (
                  <p className="text-xs text-gray-500">租户的专属域名，用于访问该租户的服务</p>
                )}
              </div>
            </div>

            {/* 套餐选择 */}
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <CreditCardIcon className="h-5 w-5 mr-2 text-indigo-500" />
                  套餐选择
                </h3>
              </div>

              <div className="space-y-2">
                <label htmlFor="plan" className="text-sm font-semibold text-gray-700">
                  选择套餐 <span className="text-red-500 ml-1">*</span>
                </label>
                <select
                  id="plan"
                  name="plan"
                  value={formData.plan}
                  onChange={handleInputChange}
                  className="block w-full px-4 py-3 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-gray-900 bg-white hover:border-gray-300"
                  required
                >
                  {planOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} - {option.description}
                    </option>
                  ))}
                </select>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-gray-500 mr-2">当前选择:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlanBadgeColor(formData.plan)}`}>
                    {planOptions.find(p => p.value === formData.plan)?.label}
                  </span>
                </div>
              </div>
            </div>

            {/* 高级设置 */}
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <CogIcon className="h-5 w-5 mr-2 text-indigo-500" />
                  高级设置 <span className="text-sm text-gray-500 ml-2">(可选)</span>
                </h3>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <CheckCircleIcon className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-gray-700">
                      租户创建后，系统将自动为其分配默认配置和资源配额。
                      您可以在租户管理页面中进一步调整高级设置。
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading || !!domainError}
                className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    创建中...
                  </>
                ) : (
                  <>
                    <BuildingOfficeIcon className="h-4 w-4 mr-2" />
                    创建租户
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  )
}

export default CreateTenant