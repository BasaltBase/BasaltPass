import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  BuildingOfficeIcon, 
  DocumentTextIcon,
  CogIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import AdminLayout from '@features/admin/components/AdminLayout'
import { EntitySearchSelect, BaseEntityItem, PInput, PTextarea, PButton } from '@ui'
import { adminTenantApi, AdminCreateTenantRequest, TenantSettings } from '@api/admin/tenant'
import { ROUTES } from '@constants'
import { useI18n } from '@shared/i18n'

const slugifyTenantCode = (name: string) => {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

const CreateTenant: React.FC = () => {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [formData, setFormData] = useState<AdminCreateTenantRequest>({
    name: '',
    code: '',
    description: '',
    owner_email: '',
    max_apps: 10,
    max_users: 100,
    max_tokens_per_hour: 1000,
    settings: {
      max_users: 100,
      max_apps: 10,
      max_tokens_per_hour: 1000,
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
  const [isCodeManuallyEdited, setIsCodeManuallyEdited] = useState(false)

  const generatedCodePlaceholder = useMemo(() => slugifyTenantCode(formData.name), [formData.name])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => {
      if (name === 'name') {
        const nextName = value
        const nextCode = !isCodeManuallyEdited ? slugifyTenantCode(nextName) : prev.code

        return {
          ...prev,
          name: nextName,
          code: nextCode
        }
      }

      if (name === 'code') {
        setIsCodeManuallyEdited(true)
      }

      return {
        ...prev,
        [name]: value
      }
    })

    if (name === 'name' && !isCodeManuallyEdited) {
      validateCode(slugifyTenantCode(value))
    } else if (name === 'code') {
      validateCode(value)
    }
  }

  const handleSettingChange = (key: keyof TenantSettings, value: any) => {
    const topLevelUpdates: Partial<AdminCreateTenantRequest> = {}
    if (key === 'max_apps') {
      topLevelUpdates.max_apps = value
    }
    if (key === 'max_users') {
      topLevelUpdates.max_users = value
    }
    if (key === 'max_tokens_per_hour') {
      topLevelUpdates.max_tokens_per_hour = value
    }

    setFormData(prev => ({
      ...prev,
      ...topLevelUpdates,
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

    const codeRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    if (!codeRegex.test(code)) {
      setCodeError(t('adminTenantCreate.errors.codeFormatInvalid'))
    } else {
      setCodeError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setError(t('adminTenantCreate.errors.nameRequired'))
      return
    }

    if (!formData.code.trim()) {
      setError(t('adminTenantCreate.errors.codeRequired'))
      return
    }

    if (!formData.owner_email.trim() && selectedOwner.length === 0) {
      setError(t('adminTenantCreate.errors.ownerRequired'))
      return
    }

    if (codeError) {
      setError(t('adminTenantCreate.errors.fixCodeFormat'))
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const ownerEmail = selectedOwner.length > 0 
        ? selectedOwner[0].raw.email
        : formData.owner_email
      
      const requestData = {
        ...formData,
        owner_email: ownerEmail
      }
      
      await adminTenantApi.createTenant(requestData)
      
      navigate(ROUTES.admin.tenants, { 
        state: { message: t('adminTenantCreate.messages.createSuccess') }
      })
    } catch (err: any) {
      console.error(t('adminTenantCreate.logs.createFailed'), err)
      setError(err.response?.data?.message || t('adminTenantCreate.errors.createFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    navigate(ROUTES.admin.tenants)
  }

  return (
    <AdminLayout title={t('adminTenantCreate.layoutTitle')}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <BuildingOfficeIcon className="h-8 w-8 mr-3 text-indigo-600" />
            {t('adminTenantCreate.header.title')}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('adminTenantCreate.header.description')}
          </p>
        </div>

        <div className="bg-white shadow-lg rounded-xl border border-gray-100">
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{t('adminTenantCreate.errors.createFailedTitle')}</h3>
                    <div className="mt-2 text-sm text-red-700">{error}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <DocumentTextIcon className="h-5 w-5 mr-2 text-indigo-500" />
                  {t('adminTenantCreate.sections.basicInfo')}
                </h3>
              </div>

              <div className="space-y-2">
                <PInput
                  label={<span className="flex items-center"><BuildingOfficeIcon className="h-5 w-5 mr-2 text-indigo-500" />{t('adminTenantCreate.form.name')}<span className="text-red-500 ml-1">*</span></span>}
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder={t('adminTenantCreate.form.namePlaceholder')}
                  required
                />
                <p className="text-xs text-gray-500">{t('adminTenantCreate.form.nameHint')}</p>
              </div>

              <div className="space-y-2">
                <PInput
                  label={<span className="flex items-center"><DocumentTextIcon className="h-5 w-5 mr-2 text-indigo-500" />{t('adminTenantCreate.form.code')}<span className="text-red-500 ml-1">*</span></span>}
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  placeholder={generatedCodePlaceholder || t('adminTenantCreate.form.codeDefaultPlaceholder')}
                  required
                  error={codeError || undefined}
                />
                {!codeError && (
                  <p className="text-xs text-gray-500">{t('adminTenantCreate.form.codeHint')}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center text-sm font-semibold text-gray-700">
                  <UserIcon className="h-5 w-5 mr-2 text-indigo-500" />
                  {t('adminTenantCreate.form.owner')} <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="bg-gray-50 rounded-lg p-4">
                  <EntitySearchSelect
                    entity="user"
                    context="admin"
                    adminUserParams={{ unassigned_only: true }}
                    value={selectedOwner}
                    onChange={setSelectedOwner}
                    placeholder={t('adminTenantCreate.form.searchOwnerPlaceholder')}
                    maxSelect={1}
                    variant="chips"
                    limit={10}
                  />
                </div>
                <p className="text-xs text-gray-500">{t('adminTenantCreate.form.ownerHint')}</p>
                
                {selectedOwner.length === 0 && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 mb-2">
                      {t('adminTenantCreate.form.fallbackOwnerText')}
                    </p>
                    <PInput
                      type="email"
                      id="owner_email"
                      name="owner_email"
                      value={formData.owner_email}
                      onChange={handleInputChange}
                      placeholder={t('adminTenantCreate.form.ownerEmailPlaceholder')}
                    />
                    <p className="text-xs text-yellow-600 mt-1">{t('adminTenantCreate.form.ownerEmailHint')}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <PTextarea
                  label={<span className="flex items-center"><DocumentTextIcon className="h-5 w-5 mr-2 text-indigo-500" />{t('adminTenantCreate.form.description')}</span>}
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder={t('adminTenantCreate.form.descriptionPlaceholder')}
                />
                <p className="text-xs text-gray-500">{t('adminTenantCreate.form.descriptionHint')}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <CogIcon className="h-5 w-5 mr-2 text-indigo-500" />
                  {t('adminTenantCreate.sections.quota')}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <PInput
                  label={<span>{t('adminTenantCreate.quota.maxApps')} <span className="text-red-500 ml-1">*</span></span>}
                  type="number"
                  min={1}
                  value={formData.max_apps}
                  onChange={(e) => handleSettingChange('max_apps', Math.max(1, parseInt(e.target.value, 10) || 1))}
                  required
                />
                <PInput
                  label={<span>{t('adminTenantCreate.quota.maxUsers')} <span className="text-red-500 ml-1">*</span></span>}
                  type="number"
                  min={1}
                  value={formData.max_users}
                  onChange={(e) => handleSettingChange('max_users', Math.max(1, parseInt(e.target.value, 10) || 1))}
                  required
                />
                <PInput
                  label={<span>{t('adminTenantCreate.quota.maxTokensPerHour')} <span className="text-red-500 ml-1">*</span></span>}
                  type="number"
                  min={1}
                  value={formData.max_tokens_per_hour}
                  onChange={(e) => handleSettingChange('max_tokens_per_hour', Math.max(1, parseInt(e.target.value, 10) || 1))}
                  required
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <CogIcon className="h-5 w-5 mr-2 text-indigo-500" />
                  {t('adminTenantCreate.sections.advanced')} <span className="text-sm text-gray-500 ml-2">{t('adminTenantCreate.common.optional')}</span>
                </h3>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <CheckCircleIcon className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-gray-700">
                      {t('adminTenantCreate.advanced.tip')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
              <PButton
                type="button"
                variant="secondary"
                onClick={handleCancel}
              >
                {t('adminTenantCreate.actions.cancel')}
              </PButton>
              <PButton
                type="submit"
                loading={loading || !!codeError}
                leftIcon={<BuildingOfficeIcon className="h-4 w-4" />}
              >
                {t('adminTenantCreate.actions.createTenant')}
              </PButton>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  )
}

export default CreateTenant
