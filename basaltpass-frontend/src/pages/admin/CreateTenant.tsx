import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline'
import AdminLayout from '../../components/AdminLayout'
import { platformApi, CreateTenantRequest } from '../../api/tenant'

export default function CreateTenant() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<CreateTenantRequest>({
    name: '',
    domain: '',
    plan: 'free',
    settings: {}
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      alert('请输入租户名称')
      return
    }
    
    if (!formData.domain.trim()) {
      alert('请输入域名')
      return
    }

    // 验证域名格式
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$/
    if (!domainRegex.test(formData.domain)) {
      alert('请输入有效的域名格式')
      return
    }

    try {
      setLoading(true)
      await platformApi.createTenant(formData)
      navigate('/admin/tenants')
    } catch (error) {
      console.error('Failed to create tenant:', error)
      alert('创建租户失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminLayout title="创建租户">
      <div className="space-y-6">
        {/* 面包屑导航 */}
        <button
          onClick={() => navigate('/admin/tenants')}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          返回租户列表
        </button>

        {/* 页面头部 */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <BuildingOfficeIcon className="h-8 w-8 mr-3 text-indigo-600" />
            创建租户
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            创建一个新的租户来管理独立的用户组织
          </p>
        </div>

        {/* 创建表单 */}
        <div className="bg-white shadow sm:rounded-lg">
          <form onSubmit={handleSubmit} className="space-y-6 py-6 px-4 sm:p-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              {/* 租户名称 */}
              <div className="sm:col-span-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  租户名称 *
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="name"
                    id="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="请输入租户名称"
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  租户的显示名称，用户可见
                </p>
              </div>

              {/* 域名 */}
              <div className="sm:col-span-4">
                <label htmlFor="domain" className="block text-sm font-medium text-gray-700">
                  域名 *
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="domain"
                    id="domain"
                    required
                    value={formData.domain}
                    onChange={handleInputChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="example.com"
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  租户的域名，用于身份验证和访问控制
                </p>
              </div>

              {/* 订阅计划 */}
              <div className="sm:col-span-3">
                <label htmlFor="plan" className="block text-sm font-medium text-gray-700">
                  订阅计划
                </label>
                <div className="mt-1">
                  <select
                    id="plan"
                    name="plan"
                    value={formData.plan}
                    onChange={handleInputChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  >
                    <option value="free">免费版</option>
                    <option value="basic">基础版</option>
                    <option value="premium">高级版</option>
                    <option value="enterprise">企业版</option>
                  </select>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  选择租户的订阅计划，影响功能和配额限制
                </p>
              </div>
            </div>

            {/* 提交按钮 */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/admin/tenants')}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    创建中...
                  </>
                ) : (
                  '创建租户'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  )
}
