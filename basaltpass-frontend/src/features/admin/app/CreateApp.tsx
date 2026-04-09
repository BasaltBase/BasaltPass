import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, RocketLaunchIcon, PlusIcon, TrashIcon, CubeIcon, KeyIcon, DocumentTextIcon, CheckIcon } from '@heroicons/react/24/outline'
import { tenantAppApi, CreateTenantAppRequest } from '@api/tenant/tenantApp'
import TenantLayout from '@features/tenant/components/TenantLayout'
import { ROUTES } from '@constants'
import { PInput, PTextarea, PButton } from '@ui'
import { useI18n } from '@shared/i18n'

export default function CreateApp() {
  const { t } = useI18n()
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
    settings: {}
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [createdCredentials, setCreatedCredentials] = useState<{ clientId: string, clientSecret: string } | null>(null)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = t('adminCreateApp.errors.nameRequired')
    }

    if (!formData.description.trim()) {
      newErrors.description = t('adminCreateApp.errors.descriptionRequired')
    }

    const validCallbackUrls = formData.redirect_uris.filter(url => url.trim())
    if (validCallbackUrls.length === 0) {
      newErrors.redirect_uris = t('adminCreateApp.errors.redirectRequired')
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
        newErrors.redirect_uris = t('adminCreateApp.errors.invalidUrl')
      }
    }

    if (formData.homepage_url && formData.homepage_url.trim()) {
      try {
        new URL(formData.homepage_url)
      } catch {
        newErrors.homepage_url = t('adminCreateApp.errors.invalidUrl')
      }
    }

    if (formData.logo_url && formData.logo_url.trim()) {
      try {
        new URL(formData.logo_url)
      } catch {
        newErrors.logo_url = t('adminCreateApp.errors.invalidUrl')
      }
    }

    if (formData.privacy_policy_url && formData.privacy_policy_url.trim()) {
      try {
        new URL(formData.privacy_policy_url)
      } catch {
        newErrors.privacy_policy_url = t('adminCreateApp.errors.invalidUrl')
      }
    }

    if (formData.terms_of_service_url && formData.terms_of_service_url.trim()) {
      try {
        new URL(formData.terms_of_service_url)
      } catch {
        newErrors.terms_of_service_url = t('adminCreateApp.errors.invalidUrl')
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
      
      const cleanedData = {
        ...formData,
        redirect_uris: formData.redirect_uris.filter(url => url.trim()),
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
      uiAlert(t('adminCreateApp.errors.createFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof CreateTenantAppRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
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
    <TenantLayout title={t('adminCreateApp.layoutTitle')}>
      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="rounded-md bg-blue-500 p-3">
                  <CubeIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <h1 className="text-2xl font-bold text-gray-900">{t('adminCreateApp.title')}</h1>
                <p className="mt-1 text-sm text-gray-500">
                  {t('adminCreateApp.description')}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <form onSubmit={handleSubmit} className="px-4 py-5 sm:p-6 space-y-8">
            <div className="border-b border-gray-200 pb-6">
              <div className="flex items-center mb-6">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <RocketLaunchIcon className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">{t('adminCreateApp.sections.basicInfo.title')}</h3>
                  <p className="text-sm text-gray-500">{t('adminCreateApp.sections.basicInfo.description')}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <PInput
                    id="name"
                    label={<>{t('adminCreateApp.fields.name')} <span className="text-red-500">*</span></>}
                    type="text"
                    value={formData.name}
                    onChange={(e: any) => handleInputChange('name', e.target.value)}
                    placeholder={t('adminCreateApp.placeholders.name')}
                    error={errors.name}
                  />
                </div>

                <div className="sm:col-span-2">
                  <PTextarea
                    id="description"
                    label={<>{t('adminCreateApp.fields.description')} <span className="text-red-500">*</span></>}
                    rows={4}
                    value={formData.description}
                    onChange={(e: any) => handleInputChange('description', e.target.value)}
                    placeholder={t('adminCreateApp.placeholders.description')}
                    error={errors.description}
                  />
                </div>

                <div>
                  <PInput
                    id="logo_url"
                    label="Logo URL"
                    type="url"
                    value={formData.logo_url}
                    onChange={(e: any) => handleInputChange('logo_url', e.target.value)}
                    placeholder="https://example.com/logo.png"
                    error={errors.logo_url}
                  />
                  {!errors.logo_url && <p className="mt-1 text-xs text-gray-500">{t('adminCreateApp.hints.logoUrl')}</p>}
                </div>

                <div>
                  <PInput
                    id="homepage_url"
                    label={t('adminCreateApp.fields.homepageUrl')}
                    type="url"
                    value={formData.homepage_url}
                    onChange={(e: any) => handleInputChange('homepage_url', e.target.value)}
                    placeholder="https://example.com"
                    error={errors.homepage_url}
                  />
                  {!errors.homepage_url && <p className="mt-1 text-xs text-gray-500">{t('adminCreateApp.hints.homepageUrl')}</p>}
                </div>
              </div>
            </div>

            <div className="border-b border-gray-200 pb-6">
              <div className="flex items-center mb-6">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <KeyIcon className="h-5 w-5 text-green-600" />
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">{t('adminCreateApp.sections.oauth.title')}</h3>
                  <p className="text-sm text-gray-500">{t('adminCreateApp.sections.oauth.description')}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {t('adminCreateApp.fields.redirectUris')} <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                  {formData.redirect_uris.map((url, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="flex-1">
                        <PInput
                          type="url"
                          value={url}
                          onChange={(e: any) => updateCallbackUrl(index, e.target.value)}
                          placeholder="https://example.com/auth/callback"
                        />
                      </div>
                      {formData.redirect_uris.length > 1 && (
                        <PButton
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => removeCallbackUrl(index)}
                          title={t('adminCreateApp.actions.removeRedirectUri')}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </PButton>
                      )}
                    </div>
                  ))}
                  <PButton
                    type="button"
                    variant="secondary"
                    onClick={addCallbackUrl}
                    leftIcon={<PlusIcon className="h-4 w-4" />}
                  >
                    {t('adminCreateApp.actions.addRedirectUri')}
                  </PButton>
                </div>
                {errors.redirect_uris && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                    {errors.redirect_uris}
                  </p>
                )}
                <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>{t('adminCreateApp.hints.tipLabel')}</strong>{t('adminCreateApp.hints.redirectUris')}
                  </p>
                </div>
              </div>
            </div>

            <div className="pb-6">
              <div className="flex items-center mb-6">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <DocumentTextIcon className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">{t('adminCreateApp.sections.legal.title')}</h3>
                  <p className="text-sm text-gray-500">{t('adminCreateApp.sections.legal.description')}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <PInput
                    id="privacy_policy_url"
                    label={t('adminCreateApp.fields.privacyPolicyUrl')}
                    type="url"
                    value={formData.privacy_policy_url}
                    onChange={(e: any) => handleInputChange('privacy_policy_url', e.target.value)}
                    placeholder="https://example.com/privacy"
                    error={errors.privacy_policy_url}
                  />
                  {!errors.privacy_policy_url && <p className="mt-1 text-xs text-gray-500">{t('adminCreateApp.hints.privacyPolicyUrl')}</p>}
                </div>

                <div>
                  <PInput
                    id="terms_of_service_url"
                    label={t('adminCreateApp.fields.termsOfServiceUrl')}
                    type="url"
                    value={formData.terms_of_service_url}
                    onChange={(e: any) => handleInputChange('terms_of_service_url', e.target.value)}
                    placeholder="https://example.com/terms"
                    error={errors.terms_of_service_url}
                  />
                  {!errors.terms_of_service_url && <p className="mt-1 text-xs text-gray-500">{t('adminCreateApp.hints.termsOfServiceUrl')}</p>}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6 border-t border-gray-200">
              <PButton
                type="button"
                variant="secondary"
                onClick={() => navigate(ROUTES.tenant.apps)}
              >
                {t('adminCreateApp.actions.cancel')}
              </PButton>
              <PButton
                type="submit"
                disabled={loading}
                loading={loading}
                leftIcon={<RocketLaunchIcon className="h-4 w-4" />}
              >
                {t('adminCreateApp.actions.createApp')}
              </PButton>
            </div>
          </form>
        </div>
      </div>

      {createdCredentials && (
        <div className="fixed inset-0 !m-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <div className="flex items-center mb-4">
              <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <CheckIcon className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-medium text-gray-900">{t('adminCreateApp.modal.successTitle')}</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                {t('adminCreateApp.modal.successDescriptionPrefix')} <strong>Client Secret</strong>{t('adminCreateApp.modal.successDescriptionSuffix')}
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
              <PButton type="button" onClick={handleCloseModal}>
                {t('adminCreateApp.modal.goToAppList')}
              </PButton>
            </div>
          </div>
        </div>
      )}
    </TenantLayout>
  )
}
