import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  BuildingOfficeIcon, 
  DocumentTextIcon,
  CogIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import AdminLayout from '@features/admin/components/AdminLayout'
import { PInput, PSelect, PTextarea, PCheckbox, PButton, PSkeleton, PBadge, PAlert } from '@ui'
import { adminTenantApi, AdminTenantDetailResponse, AdminUpdateTenantRequest, TenantSettings } from '@api/admin/tenant'
import { ROUTES } from '@constants'
import { useI18n } from '@shared/i18n'

const EditTenant: React.FC = () => {
  const { t } = useI18n()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tenant, setTenant] = useState<AdminTenantDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<AdminUpdateTenantRequest>({
    name: '',
    description: '',
    status: 'active',
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

  useEffect(() => {
    if (id) {
      fetchTenantDetail()
    }
  }, [id])

  const fetchTenantDetail = async () => {
    if (!id) return
    
    try {
      setLoading(true)
      setError(null)
      const response = await adminTenantApi.getTenantDetail(parseInt(id))
      setTenant(response)
      
      setFormData({
        name: response.name,
        description: response.description || '',
        status: response.status,
        settings: response.settings || {
          max_users: 100,
          max_apps: 10,
          max_tokens_per_hour: 1000,
          max_storage: 1024,
          enable_api: true,
          enable_sso: false,
          enable_audit: false,
        }
      })
    } catch (err: any) {
      console.error(t('adminTenantEdit.logs.fetchDetailFailed'), err)
      setError(err.response?.data?.message || t('adminTenantEdit.errors.fetchDetailFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    
    try {
      setSaving(true)
      setError(null)
      
      await adminTenantApi.updateTenant(parseInt(id), formData)
      
      navigate(`/admin/tenants/${id}`, { 
        state: { message: t('adminTenantEdit.messages.updateSuccess') }
      })
    } catch (err: any) {
      console.error(t('adminTenantEdit.logs.updateFailed'), err)
      setError(err.response?.data?.message || t('adminTenantEdit.errors.updateFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    navigate(`/admin/tenants/${id}`)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: 'success' as const, text: t('adminTenantList.status.active') },
      suspended: { variant: 'warning' as const, text: t('adminTenantList.status.suspended') },
      deleted: { variant: 'error' as const, text: t('adminTenantList.status.deleted') }
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active
    return <PBadge variant={config.variant}>{config.text}</PBadge>
  }

  if (loading) {
    return (
      <AdminLayout title={t('adminTenantEdit.layoutTitle')}>
        <div className="py-6">
          <PSkeleton.Content cards={3} />
        </div>
      </AdminLayout>
    )
  }

  if (!tenant) {
    return (
      <AdminLayout title={t('adminTenantEdit.layoutTitle')}>
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">{t('adminTenantEdit.notFound.title')}</h3>
          <p className="mt-1 text-sm text-gray-500">{t('adminTenantEdit.notFound.description')}</p>
          <div className="mt-6">
            <PButton onClick={() => navigate(ROUTES.admin.tenants)}>
              {t('adminTenantEdit.actions.backToList')}
            </PButton>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title={t('adminTenantEdit.layoutTitleWithName', { name: tenant.name })}>
      <div className="space-y-6">
        {error && <PAlert variant="error" title={t('adminTenantEdit.errors.operationFailed')} message={error} />}

        <div className="lg:flex lg:items-center lg:justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center">
              <PButton
                type="button"
                variant="ghost"
                size="sm"
                className="mr-2 text-gray-500 hover:text-gray-700"
                onClick={() => navigate(`/admin/tenants/${id}`)}
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </PButton>
              <BuildingOfficeIcon className="h-8 w-8 mr-3 text-indigo-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {t('adminTenantEdit.header.title')}
                </h1>
                <div className="mt-1 flex items-center space-x-2">
                  <span className="text-sm text-gray-500">{t('adminTenantList.meta.code', { value: tenant.code })}</span>
                  <span className="text-gray-300">•</span>
                  {getStatusBadge(tenant.status)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <form onSubmit={handleSubmit} className="space-y-6 p-6">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
                <DocumentTextIcon className="h-5 w-5 mr-2 text-gray-400" />
                {t('adminTenantEdit.sections.basicInfo')}
              </h3>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <PInput
                    label={t('adminTenantEdit.form.name')}
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div>
                  <PInput
                    label={t('adminTenantEdit.form.code')}
                    type="text"
                    value={tenant.code}
                    disabled
                  />
                  <p className="mt-1 text-xs text-gray-500">{t('adminTenantEdit.form.codeHint')}</p>
                </div>

                <div className="sm:col-span-2">
                  <PTextarea
                    label={t('adminTenantEdit.form.description')}
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder={t('adminTenantEdit.form.descriptionPlaceholder')}
                  />
                </div>

                <div>
                  <PSelect
                    label={t('adminTenantEdit.form.status')}
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="active">{t('adminTenantList.status.active')}</option>
                    <option value="suspended">{t('adminTenantList.status.suspended')}</option>
                    <option value="deleted">{t('adminTenantList.status.deleted')}</option>
                  </PSelect>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
                <CogIcon className="h-5 w-5 mr-2 text-gray-400" />
                {t('adminTenantEdit.sections.settings')}
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <PInput
                      label={t('adminTenantEdit.settings.maxUsers')}
                      type="number"
                      value={formData.settings?.max_users || 0}
                      onChange={(e) => handleSettingChange('max_users', parseInt(e.target.value) || 0)}
                      min={0}
                    />
                  </div>
                  <div>
                    <PInput
                      label={t('adminTenantEdit.settings.maxApps')}
                      type="number"
                      value={formData.settings?.max_apps || 0}
                      onChange={(e) => handleSettingChange('max_apps', parseInt(e.target.value) || 0)}
                      min={0}
                    />
                  </div>
                  <div>
                    <PInput
                      label={t('adminTenantEdit.settings.maxStorage')}
                      type="number"
                      value={formData.settings?.max_storage || 0}
                      onChange={(e) => handleSettingChange('max_storage', parseInt(e.target.value) || 0)}
                      min={0}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <PCheckbox
                    variant="switch"
                    label={t('adminTenantEdit.settings.enableApi')}
                    checked={formData.settings?.enable_api || false}
                    onChange={(e) => handleSettingChange('enable_api', (e.target as HTMLInputElement).checked)}
                  />
                  <PCheckbox
                    variant="switch"
                    label={t('adminTenantEdit.settings.enableSso')}
                    checked={formData.settings?.enable_sso || false}
                    onChange={(e) => handleSettingChange('enable_sso', (e.target as HTMLInputElement).checked)}
                  />
                  <PCheckbox
                    variant="switch"
                    label={t('adminTenantEdit.settings.enableAudit')}
                    checked={formData.settings?.enable_audit || false}
                    onChange={(e) => handleSettingChange('enable_audit', (e.target as HTMLInputElement).checked)}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <PButton
                type="button"
                variant="secondary"
                onClick={handleCancel}
              >
                {t('adminTenantEdit.actions.cancel')}
              </PButton>
              <PButton
                type="submit"
                loading={saving}
              >
                {t('adminTenantEdit.actions.saveChanges')}
              </PButton>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  )
}

export default EditTenant
