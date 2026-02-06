import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  BuildingOfficeIcon, 
  CreditCardIcon,
  DocumentTextIcon,
  CogIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import AdminLayout from '@features/admin/components/AdminLayout'
import { EntitySearchSelect, BaseEntityItem, PInput, PSelect, PTextarea, PButton } from '@ui'
import { adminTenantApi, AdminCreateTenantRequest, TenantSettings } from '@api/admin/tenant'
import { ROUTES } from '@constants'

const CreateTenant: React.FC = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<AdminCreateTenantRequest>({
    name: '',
    code: '',
    description: '',
    plan: 'free',
    owner_email: '',
    settings: {
      max_users: 100,
      max_apps: 10,
      max_storage: 1024,
      enable_api: true,
      enable_sso: false,
      enable_audit: false,
    }
  })
  const [selectedOwner, setSelectedOwner] = useState<BaseEntityItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [codeError, setCodeError] = useState<string | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // 实时验证代码格式
    if (name === 'code') {
      validateCode(value)
    }
  }

  const handleSettingChange = (key: keyof TenantSettings, value: any) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings!,
        [key]: value
      }
    }))
  }

  const validateCode = (code: string) => {
    if (!code) {
      setCodeError(null)
      return
    }

    // 验证代码格式：只允许字母和数字
    const codeRegex = /^[a-zA-Z0-9]+$/
    if (!codeRegex.test(code)) {
      setCodeError('代码只能包含字母和数字')
    } else {
      setCodeError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setError('租户名称不能为空')
      return
    }

    if (!formData.code.trim()) {
      setError('租户代码不能为空')
      return
    }

    if (!formData.owner_email.trim() && selectedOwner.length === 0) {
      setError('请选择租户所有者')
      return
    }

    if (codeError) {
      setError('请修正代码格式错误')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      // 使用选中的用户邮箱或手动输入的邮箱
      const ownerEmail = selectedOwner.length > 0 
        ? selectedOwner[0].subtitle || selectedOwner[0].raw.email 
        : formData.owner_email
      
      const requestData = {
        ...formData,
        owner_email: ownerEmail
      }
      
      await adminTenantApi.createTenant(requestData)
      
      // 创建成功后跳转到租户列表
      navigate(ROUTES.admin.tenants, { 
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
    navigate(ROUTES.admin.tenants)
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
                <PInput
                  label={<span className="flex items-center"><BuildingOfficeIcon className="h-5 w-5 mr-2 text-indigo-500" />租户名称<span className="text-red-500 ml-1">*</span></span>}
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="输入租户名称"
                  required
                />
                <p className="text-xs text-gray-500">租户的显示名称，用于在平台中标识该组织</p>
              </div>

              {/* 租户代码 */}
              <div className="space-y-2">
                <PInput
                  label={<span className="flex items-center"><DocumentTextIcon className="h-5 w-5 mr-2 text-indigo-500" />租户代码<span className="text-red-500 ml-1">*</span></span>}
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  placeholder="tenant-code"
                  required
                  error={codeError || undefined}
                />
                {!codeError && (
                  <p className="text-xs text-gray-500">租户的唯一标识符，只能包含字母和数字</p>
                )}
              </div>

              {/* 所有者选择 */}
              <div className="space-y-2">
                <label className="flex items-center text-sm font-semibold text-gray-700">
                  <UserIcon className="h-5 w-5 mr-2 text-indigo-500" />
                  租户所有者 <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="bg-gray-50 rounded-lg p-4">
                  <EntitySearchSelect
                    entity="user"
                    context="admin"
                    value={selectedOwner}
                    onChange={setSelectedOwner}
                    placeholder="搜索用户名或邮箱..."
                    maxSelect={1}
                    variant="chips"
                    limit={10}
                  />
                </div>
                <p className="text-xs text-gray-500">搜索并选择一个用户作为该租户的所有者</p>
                
                {/* 备用邮箱输入 */}
                {selectedOwner.length === 0 && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 mb-2">
                      如果找不到用户，您也可以直接输入邮箱地址：
                    </p>
                    <PInput
                      type="email"
                      id="owner_email"
                      name="owner_email"
                      value={formData.owner_email}
                      onChange={handleInputChange}
                      placeholder="admin@example.com"
                    />
                    <p className="text-xs text-yellow-600 mt-1">该邮箱必须对应平台中的现有用户</p>
                  </div>
                )}
              </div>

              {/* 描述 */}
              <div className="space-y-2">
                <PTextarea
                  label={<span className="flex items-center"><DocumentTextIcon className="h-5 w-5 mr-2 text-indigo-500" />描述 (可选)</span>}
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="描述该租户的用途或特点..."
                />
                <p className="text-xs text-gray-500">租户的详细描述信息</p>
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
                <PSelect
                  label={<span>选择套餐 <span className="text-red-500 ml-1">*</span></span>}
                  id="plan"
                  name="plan"
                  value={formData.plan}
                  onChange={handleInputChange}
                  required
                >
                  {planOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} - {option.description}
                    </option>
                  ))}
                </PSelect>
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
              <PButton
                type="button"
                variant="secondary"
                onClick={handleCancel}
              >
                取消
              </PButton>
              <PButton
                type="submit"
                loading={loading || !!codeError}
                leftIcon={<BuildingOfficeIcon className="h-4 w-4" />}
              >
                创建租户
              </PButton>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  )
}

export default CreateTenant