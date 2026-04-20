import { useEffect, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  BuildingOffice2Icon,
  ClipboardDocumentIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  LinkIcon,
} from '@heroicons/react/24/outline'
import TenantLayout from '@features/tenant/components/TenantLayout'
import { tenantApi, type TenantAuthSettings, type TenantInfo } from '@api/tenant/tenant'
import { uiAlert } from '@contexts/DialogContext'
import { ROUTES } from '@constants'
import { PBadge, PButton, PCard, PCheckbox, PInput, PPageHeader } from '@ui'
import { useI18n } from '@shared/i18n'

export default function TenantSettingsPage() {
  const { t } = useI18n()
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null)
  const [tenantLoading, setTenantLoading] = useState(true)
  const [tenantError, setTenantError] = useState('')

  const [copiedField, setCopiedField] = useState<string | null>(null)

  const [stripeLoading, setStripeLoading] = useState(false)
  const [stripeSaving, setStripeSaving] = useState(false)
  const [stripeError, setStripeError] = useState('')

  const [authLoading, setAuthLoading] = useState(false)
  const [authSaving, setAuthSaving] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authSettings, setAuthSettings] = useState<TenantAuthSettings | null>(null)

  const [stripeMeta, setStripeMeta] = useState({
    has_secret_key: false,
    secret_key_masked: '',
    has_webhook_secret: false,
    webhook_secret_masked: '',
  })

  const [stripeForm, setStripeForm] = useState({
    enabled: false,
    publishable_key: '',
    secret_key: '',
    webhook_secret: '',
  })

  useEffect(() => {
    fetchTenantInfo()
    fetchStripeConfig()
    fetchAuthSettings()
  }, [])

  const fetchTenantInfo = async () => {
    try {
      setTenantLoading(true)
      setTenantError('')
      const response = await tenantApi.getTenantInfo()
      setTenantInfo(response.data)
    } catch (err: any) {
      setTenantError(err.response?.data?.error || t('tenantSettingsPage.errors.loadTenantInfoFailed'))
    } finally {
      setTenantLoading(false)
    }
  }

  const fetchStripeConfig = async () => {
    try {
      setStripeLoading(true)
      setStripeError('')
      const response = await tenantApi.getStripeConfig()
      const data = response.data
      setStripeForm(prev => ({
        ...prev,
        enabled: data.enabled,
        publishable_key: data.publishable_key || '',
        secret_key: '',
        webhook_secret: '',
      }))
      setStripeMeta({
        has_secret_key: data.has_secret_key,
        secret_key_masked: data.secret_key_masked || '',
        has_webhook_secret: data.has_webhook_secret,
        webhook_secret_masked: data.webhook_secret_masked || '',
      })
    } catch (err: any) {
      setStripeError(err.response?.data?.error || t('tenantSettingsPage.errors.loadStripeConfigFailed'))
    } finally {
      setStripeLoading(false)
    }
  }

  const fetchAuthSettings = async () => {
    try {
      setAuthLoading(true)
      setAuthError('')
      const response = await tenantApi.getAuthSettings()
      setAuthSettings(response.data)
    } catch (err: any) {
      setAuthError(err.response?.data?.error || t('tenantSettingsPage.errors.loadAuthSettingsFailed'))
      setAuthSettings(null)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleAuthSwitchChange = (key: 'allow_registration' | 'allow_login', checked: boolean) => {
    setAuthSettings(prev => {
      if (!prev) return prev
      return {
        ...prev,
        [key]: checked,
      }
    })
  }

  const saveAuthSettings = async () => {
    if (!authSettings) return

    try {
      setAuthSaving(true)
      setAuthError('')
      const response = await tenantApi.updateAuthSettings({
        allow_registration: authSettings.allow_registration,
        allow_login: authSettings.allow_login,
      })
      setAuthSettings(response.data)
      uiAlert(t('tenantSettingsPage.messages.authSaved'))
    } catch (err: any) {
      const message = err.response?.data?.error || t('tenantSettingsPage.errors.saveAuthSettingsFailed')
      setAuthError(message)
      uiAlert(message)
    } finally {
      setAuthSaving(false)
    }
  }

  const saveStripeConfig = async () => {
    const publishableKey = stripeForm.publishable_key.trim()
    const secretKey = stripeForm.secret_key.trim()
    const webhookSecret = stripeForm.webhook_secret.trim()

    if (publishableKey && !publishableKey.startsWith('pk_')) {
      setStripeError(t('tenantSettingsPage.errors.publishableKeyPrefix'))
      return
    }

    if (secretKey && !secretKey.startsWith('sk_')) {
      setStripeError(t('tenantSettingsPage.errors.secretKeyPrefix'))
      return
    }

    if (stripeForm.enabled) {
      if (!publishableKey) {
        setStripeError(t('tenantSettingsPage.errors.publishableKeyRequired'))
        return
      }

      if (!secretKey && !stripeMeta.has_secret_key) {
        setStripeError(t('tenantSettingsPage.errors.secretKeyRequired'))
        return
      }
    }

    try {
      setStripeSaving(true)
      setStripeError('')
      await tenantApi.updateStripeConfig({
        enabled: stripeForm.enabled,
        publishable_key: publishableKey,
        secret_key: secretKey || undefined,
        webhook_secret: webhookSecret || undefined,
      })
      uiAlert(t('tenantSettingsPage.messages.stripeSaved'))
      await fetchStripeConfig()
      setStripeForm(prev => ({
        ...prev,
        secret_key: '',
        webhook_secret: '',
      }))
    } catch (err: any) {
      const message = err.response?.data?.error || t('tenantSettingsPage.errors.saveStripeConfigFailed')
      setStripeError(message)
      uiAlert(message)
    } finally {
      setStripeSaving(false)
    }
  }

  const clearSecretKey = async () => {
    try {
      setStripeSaving(true)
      setStripeError('')
      await tenantApi.updateStripeConfig({
        clear_secret_key: true,
        enabled: false,
      })
      uiAlert(t('tenantSettingsPage.messages.secretKeyCleared'))
      await fetchStripeConfig()
      setStripeForm(prev => ({ ...prev, enabled: false, secret_key: '' }))
    } catch (err: any) {
      const message = err.response?.data?.error || t('tenantSettingsPage.errors.clearSecretKeyFailed')
      setStripeError(message)
      uiAlert(message)
    } finally {
      setStripeSaving(false)
    }
  }

  const clearWebhookSecret = async () => {
    try {
      setStripeSaving(true)
      setStripeError('')
      await tenantApi.updateStripeConfig({
        clear_webhook_secret: true,
      })
      uiAlert(t('tenantSettingsPage.messages.webhookSecretCleared'))
      await fetchStripeConfig()
      setStripeForm(prev => ({ ...prev, webhook_secret: '' }))
    } catch (err: any) {
      const message = err.response?.data?.error || t('tenantSettingsPage.errors.clearWebhookSecretFailed')
      setStripeError(message)
      uiAlert(message)
    } finally {
      setStripeSaving(false)
    }
  }

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      uiAlert(t('tenantSettingsPage.errors.copyFailed'))
    }
  }

  const getLoginUrl = () => {
    const baseUrl = (import.meta as any).env?.VITE_CONSOLE_USER_URL || window.location.origin
    return `${baseUrl}/auth/tenant/${tenantInfo?.code}/login`
  }

  const getRegisterUrl = () => {
    const baseUrl = (import.meta as any).env?.VITE_CONSOLE_USER_URL || window.location.origin
    return `${baseUrl}/auth/tenant/${tenantInfo?.code}/register`
  }

  const getJoinUrl = () => {
    const baseUrl = (import.meta as any).env?.VITE_CONSOLE_USER_URL || window.location.origin
    return `${baseUrl}/auth/tenant/${tenantInfo?.code}/join`
  }

  const loginEnabled = authSettings?.allow_login ?? true
  const registrationEnabled = authSettings?.allow_registration ?? true

  if (tenantLoading) {
    return (
      <TenantLayout title={t('tenantSettingsPage.layoutTitle')}>
        <div className="py-6 px-4 sm:px-6 lg:px-8">{t('tenantSettingsPage.values.loading')}</div>
      </TenantLayout>
    )
  }

  if (tenantError || !tenantInfo) {
    return (
      <TenantLayout title={t('tenantSettingsPage.layoutTitle')}>
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="max-w-2xl rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {tenantError || t('tenantSettingsPage.errors.tenantNotFound')}
          </div>
        </div>
      </TenantLayout>
    )
  }

  return (
    <TenantLayout title={t('tenantSettingsPage.layoutTitle')}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PPageHeader
          title={t('tenantSettingsPage.title')}
          description={t('tenantSettingsPage.description')}
          icon={<BuildingOffice2Icon className="h-8 w-8 text-blue-600" />}
        />

        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 flex items-center justify-between gap-3">
          <div className="flex items-start gap-2">
            <InformationCircleIcon className="h-5 w-5 mt-0.5" />
            <span>{t('tenantSettingsPage.notice.readOnlyTenantInfo')}</span>
          </div>
          <Link to={ROUTES.tenant.info} className="text-blue-700 underline hover:text-blue-900">
            {t('tenantSettingsPage.notice.openTenantInfo')}
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <PCard className="rounded-xl p-0 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">{t('tenantSettingsPage.stripe.title')}</h3>
              {stripeLoading && <span className="text-sm text-gray-500">{t('tenantSettingsPage.values.loading')}</span>}
            </div>
            <div className="px-6 py-6 space-y-4">
              {stripeError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-4 w-4" />
                  {stripeError}
                </div>
              )}

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={stripeForm.enabled}
                  onChange={(e) => setStripeForm(prev => ({ ...prev, enabled: e.target.checked }))}
                />
                {t('tenantSettingsPage.stripe.enable')}
              </label>

              <PInput
                label={t('tenantSettingsPage.stripe.publishableKey')}
                type="text"
                value={stripeForm.publishable_key}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setStripeForm(prev => ({ ...prev, publishable_key: e.target.value }))}
                placeholder="pk_test_..."
              />

              <PInput
                label={t('tenantSettingsPage.stripe.secretKey')}
                type="password"
                value={stripeForm.secret_key}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setStripeForm(prev => ({ ...prev, secret_key: e.target.value }))}
                placeholder="sk_test_..."
              />
              {stripeMeta.has_secret_key && (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-gray-500">{t('tenantSettingsPage.stripe.currentSecretKey', { value: stripeMeta.secret_key_masked })}</p>
                  <PButton type="button" variant="secondary" onClick={clearSecretKey} loading={stripeSaving}>
                    {t('tenantSettingsPage.stripe.clearSecretKey')}
                  </PButton>
                </div>
              )}

              <PInput
                label={t('tenantSettingsPage.stripe.webhookSecret')}
                type="password"
                value={stripeForm.webhook_secret}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setStripeForm(prev => ({ ...prev, webhook_secret: e.target.value }))}
                placeholder="whsec_..."
              />
              {stripeMeta.has_webhook_secret && (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-gray-500">{t('tenantSettingsPage.stripe.currentWebhookSecret', { value: stripeMeta.webhook_secret_masked })}</p>
                  <PButton type="button" variant="secondary" onClick={clearWebhookSecret} loading={stripeSaving}>
                    {t('tenantSettingsPage.stripe.clearWebhookSecret')}
                  </PButton>
                </div>
              )}

              <div className="pt-2">
                <PButton onClick={saveStripeConfig} loading={stripeSaving}>
                  {stripeSaving ? t('tenantSettingsPage.values.saving') : t('tenantSettingsPage.stripe.save')}
                </PButton>
              </div>
            </div>
          </PCard>

          <PCard className="rounded-xl p-0 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">{t('tenantSettingsPage.auth.title')}</h3>
              {authLoading && <span className="text-sm text-gray-500">{t('tenantSettingsPage.values.loading')}</span>}
            </div>
            <div className="px-6 py-6 space-y-4">
              {authError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {authError}
                </div>
              )}

              {!authLoading && authSettings && (
                <>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
                    <PCheckbox
                      variant="switch"
                      label={t('tenantSettingsPage.auth.allowRegistration')}
                      checked={authSettings.allow_registration}
                      onChange={(e) => handleAuthSwitchChange('allow_registration', (e.target as HTMLInputElement).checked)}
                      disabled={authSaving}
                    />
                    <p className="text-xs text-gray-500 mt-2">{t('tenantSettingsPage.auth.registrationHint')}</p>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
                    <PCheckbox
                      variant="switch"
                      label={t('tenantSettingsPage.auth.allowLogin')}
                      checked={authSettings.allow_login}
                      onChange={(e) => handleAuthSwitchChange('allow_login', (e.target as HTMLInputElement).checked)}
                      disabled={authSaving}
                    />
                    <p className="text-xs text-gray-500 mt-2">{t('tenantSettingsPage.auth.loginHint')}</p>
                  </div>

                  {(!authSettings.allow_registration || !authSettings.allow_login) && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                      {t('tenantSettingsPage.auth.warning')}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>{t('tenantSettingsPage.auth.registration')}</span>
                      <PBadge variant={registrationEnabled ? 'success' : 'warning'}>{registrationEnabled ? t('tenantSettingsPage.auth.enabled') : t('tenantSettingsPage.auth.disabled')}</PBadge>
                      <span>{t('tenantSettingsPage.auth.login')}</span>
                      <PBadge variant={loginEnabled ? 'success' : 'warning'}>{loginEnabled ? t('tenantSettingsPage.auth.enabled') : t('tenantSettingsPage.auth.disabled')}</PBadge>
                    </div>
                    <PButton onClick={saveAuthSettings} loading={authSaving}>
                      {authSaving ? t('tenantSettingsPage.values.saving') : t('tenantSettingsPage.auth.save')}
                    </PButton>
                  </div>
                </>
              )}
            </div>
          </PCard>
        </div>

        <div className="mt-8">
          <PCard className="rounded-xl p-0 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <LinkIcon className="h-5 w-5 text-blue-500 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">{t('tenantSettingsPage.accessLinks.title')}</h3>
              </div>
              <p className="mt-1 text-sm text-gray-500">{t('tenantSettingsPage.accessLinks.description')}</p>
            </div>
            <div className="px-6 py-6 space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">{t('tenantSettingsPage.accessLinks.joinPage')}</label>
                  <PBadge variant={registrationEnabled ? 'success' : 'warning'}>{registrationEnabled ? t('tenantSettingsPage.accessLinks.accessible') : t('tenantSettingsPage.accessLinks.disabled')}</PBadge>
                </div>
                <div className="flex items-center space-x-2">
                  <PInput type="text" readOnly value={getJoinUrl()} className="flex-1 bg-gray-50 font-mono text-gray-600" />
                  <PButton type="button" variant="secondary" onClick={() => copyToClipboard(getJoinUrl(), 'join')}>
                    {copiedField === 'join' ? <CheckIcon className="h-5 w-5 text-green-500" /> : <ClipboardDocumentIcon className="h-5 w-5" />}
                  </PButton>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">{t('tenantSettingsPage.accessLinks.loginPage')}</label>
                  <PBadge variant={loginEnabled ? 'success' : 'warning'}>{loginEnabled ? t('tenantSettingsPage.accessLinks.accessible') : t('tenantSettingsPage.accessLinks.disabled')}</PBadge>
                </div>
                <div className="flex items-center space-x-2">
                  <PInput type="text" readOnly value={getLoginUrl()} className="flex-1 bg-gray-50 font-mono text-gray-600" />
                  <PButton type="button" variant="secondary" onClick={() => copyToClipboard(getLoginUrl(), 'login')}>
                    {copiedField === 'login' ? <CheckIcon className="h-5 w-5 text-green-500" /> : <ClipboardDocumentIcon className="h-5 w-5" />}
                  </PButton>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">{t('tenantSettingsPage.accessLinks.registerPage')}</label>
                  <PBadge variant={registrationEnabled ? 'success' : 'warning'}>{registrationEnabled ? t('tenantSettingsPage.accessLinks.accessible') : t('tenantSettingsPage.accessLinks.disabled')}</PBadge>
                </div>
                <div className="flex items-center space-x-2">
                  <PInput type="text" readOnly value={getRegisterUrl()} className="flex-1 bg-gray-50 font-mono text-gray-600" />
                  <PButton type="button" variant="secondary" onClick={() => copyToClipboard(getRegisterUrl(), 'register')}>
                    {copiedField === 'register' ? <CheckIcon className="h-5 w-5 text-green-500" /> : <ClipboardDocumentIcon className="h-5 w-5" />}
                  </PButton>
                </div>
              </div>
            </div>
          </PCard>
        </div>
      </div>
    </TenantLayout>
  )
}
