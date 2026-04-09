import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, RocketLaunchIcon, PlusIcon, TrashIcon, CubeIcon, CheckIcon } from '@heroicons/react/24/outline'
import { tenantAppApi, CreateTenantAppRequest } from '@api/tenant/tenantApp'
import TenantLayout from '@features/tenant/components/TenantLayout'
import { ROUTES } from '@constants'
import { PButton, PCard, PInput, PPageHeader, PTextarea } from '@ui'
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
    is_verified: false,
    settings: {}
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [createdCredentials, setCreatedCredentials] = useState<{ clientId: string, clientSecret: string } | null>(null)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = t('tenantCreateApp.validation.nameRequired')
    }

    if (!formData.description.trim()) {
      newErrors.description = t('tenantCreateApp.validation.descriptionRequired')
    }

    // 
    const validCallbackUrls = formData.redirect_uris.filter(url => url.trim())
    if (validCallbackUrls.length === 0) {
      newErrors.redirect_uris = t('tenantCreateApp.validation.redirectUrisRequired')
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
        newErrors.redirect_uris = t('tenantCreateApp.validation.invalidUrl')
      }
    }

    // URL
    if (formData.homepage_url && formData.homepage_url.trim()) {
      try {
        new URL(formData.homepage_url)
      } catch {
        newErrors.homepage_url = t('tenantCreateApp.validation.invalidUrl')
      }
    }

    if (formData.logo_url && formData.logo_url.trim()) {
      try {
        new URL(formData.logo_url)
      } catch {
        newErrors.logo_url = t('tenantCreateApp.validation.invalidUrl')
      }
    }

    if (formData.privacy_policy_url && formData.privacy_policy_url.trim()) {
      try {
        new URL(formData.privacy_policy_url)
      } catch {
        newErrors.privacy_policy_url = t('tenantCreateApp.validation.invalidUrl')
      }
    }

    if (formData.terms_of_service_url && formData.terms_of_service_url.trim()) {
      try {
        new URL(formData.terms_of_service_url)
      } catch {
        newErrors.terms_of_service_url = t('tenantCreateApp.validation.invalidUrl')
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
      
      // 
      const cleanedData = {
        ...formData,
        redirect_uris: formData.redirect_uris.filter(url => url.trim()),
        // 
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
      console.error(t('tenantCreateApp.logs.createFailed'), error)
      uiAlert(t('tenantCreateApp.errors.createFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof CreateTenantAppRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // 
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
    <TenantLayout title={t('tenantCreateApp.layoutTitle')}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <PButton
            variant="ghost"
            size="sm"
            onClick={() => navigate(ROUTES.tenant.apps)}
            leftIcon={<ArrowLeftIcon className="h-4 w-4" />}
            className="text-gray-600 hover:text-gray-800"
          >
            {t('tenantCreateApp.actions.backToList')}
          </PButton>
        </div>

        <PPageHeader
          title={t('tenantCreateApp.title')}
          description={t('tenantCreateApp.description')}
          icon={<CubeIcon className="h-8 w-8 text-indigo-600" />}
        />

        <PCard padding="xl">
          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="border-b border-gray-200 pb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-9 w-9 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <RocketLaunchIcon className="h-5 w-5 text-indigo-700" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{t('tenantCreateApp.sections.basicInfo.title')}</h2>
                  <p className="text-sm text-gray-600">{t('tenantCreateApp.sections.basicInfo.description')}</p>
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
                        {t('tenantCreateApp.fields.name')} <span className="text-red-500">*</span>
                      </span>
                    }
                    placeholder={t('tenantCreateApp.placeholders.name')}
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
                        {t('tenantCreateApp.fields.description')} <span className="text-red-500">*</span>
                      </span>
                    }
                    placeholder={t('tenantCreateApp.placeholders.description')}
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
                    label={t('tenantCreateApp.fields.homepageUrl')}
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
                  <h2 className="text-lg font-semibold text-gray-900">{t('tenantCreateApp.sections.oauth.title')}</h2>
                  <p className="text-sm text-gray-600">{t('tenantCreateApp.sections.oauth.description')}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-gray-700">
                        {t('tenantCreateApp.fields.redirectUris')} <span className="text-red-500">*</span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {t('tenantCreateApp.hints.redirectUris')}
                      </div>
                    </div>
                    <PButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={addCallbackUrl}
                      leftIcon={<PlusIcon className="h-4 w-4" />}
                    >
                      {t('tenantCreateApp.actions.addRedirectUri')}
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
                            aria-label={t('tenantCreateApp.aria.redirectUri', { index: index + 1 })}
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
                            aria-label={t('tenantCreateApp.actions.removeRedirectUri')}
                            title={t('tenantCreateApp.actions.delete')}
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
                <div className="h-9 w-9 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <svg className="h-5 w-5 text-indigo-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{t('tenantCreateApp.sections.legal.title')}</h2>
                  <p className="text-sm text-gray-600">{t('tenantCreateApp.sections.legal.description')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <PInput
                    type="url"
                    id="privacy_policy_url"
                    value={formData.privacy_policy_url}
                    onChange={(e: any) => handleInputChange('privacy_policy_url', e.target.value)}
                    label={t('tenantCreateApp.fields.privacyPolicyUrl')}
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
                    label={t('tenantCreateApp.fields.termsOfServiceUrl')}
                    placeholder="https://example.com/terms"
                    error={errors.terms_of_service_url}
                    autoComplete="off"
                  />
                </div>

                {/*  */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600">
                        <svg viewBox="0 0 24 24" fill="white" className="h-5 w-5">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{t('tenantCreateApp.fields.markVerifiedApp')}</p>
                        <p className="text-xs text-gray-500">
                          {t('tenantCreateApp.hints.verifiedApp')}
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
                {t('tenantCreateApp.actions.cancel')}
              </PButton>
              <PButton
                type="submit"
                variant="primary"
                loading={loading}
                leftIcon={<PlusIcon className="h-4 w-4" />}
              >
                {t('tenantCreateApp.actions.createApp')}
              </PButton>
            </div>
          </form>
        </PCard>
      </div>

      {createdCredentials && (
        <div className="fixed inset-0 !m-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center mb-4">
              <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <CheckIcon className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-medium text-gray-900">{t('tenantCreateApp.success.title')}</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                {t('tenantCreateApp.success.secretHintPrefix')} <strong>Client Secret</strong>{t('tenantCreateApp.success.secretHintSuffix')}
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-sm break-all">
                    {createdCredentials.clientId}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Secret</label>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-sm break-all">
                    {createdCredentials.clientSecret}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <PButton variant="primary" onClick={handleCloseModal}>
                {t('tenantCreateApp.success.confirmSaved')}
              </PButton>
            </div>
          </div>
        </div>
      )}
    </TenantLayout>
  )
}
