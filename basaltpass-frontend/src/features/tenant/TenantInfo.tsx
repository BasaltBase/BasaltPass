import { useState, useEffect, type ChangeEvent } from 'react'
import { 
  BuildingOffice2Icon,
  CubeIcon,
  UsersIcon,
  KeyIcon,
  CpuChipIcon,
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  LinkIcon,
  ClipboardDocumentIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import TenantLayout from '@features/tenant/components/TenantLayout'
import { tenantApi, TenantAuthSettings, TenantInfo } from '@api/tenant/tenant'
import { PSkeleton, PBadge, PButton, PCard, PCheckbox, PInput, PPageHeader } from '@ui'
import { useI18n } from '@shared/i18n'
import { uiAlert } from '@contexts/DialogContext'

export default function TenantInfoPage() {
  const { t, locale } = useI18n()
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [debugInfo, setDebugInfo] = useState<any>(null)
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
    webhook_secret_masked: ''
  })
  const [stripeForm, setStripeForm] = useState({
    enabled: false,
    publishable_key: '',
    secret_key: '',
    webhook_secret: ''
  })

  useEffect(() => {
    fetchTenantInfo()
    fetchStripeConfig()
    fetchAuthSettings()
  }, [])

  const fetchTenantInfo = async () => {
    try {
      setLoading(true)
      const response = await tenantApi.getTenantInfo()
      setTenantInfo(response.data)
    } catch (err: any) {
      console.error(t('tenantInfoPage.logs.fetchTenantInfoFailed'), err)
      setError(err.response?.data?.error || t('tenantInfoPage.errors.fetchTenantInfoFailed'))
      
      // ，
      try {
        const debugResponse = await tenantApi.debugUserStatus()
        setDebugInfo(debugResponse)
      } catch (debugErr) {
        console.error(t('tenantInfoPage.logs.fetchDebugInfoFailed'), debugErr)
      }
    } finally {
      setLoading(false)
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
        webhook_secret: ''
      }))
      setStripeMeta({
        has_secret_key: data.has_secret_key,
        secret_key_masked: data.secret_key_masked || '',
        has_webhook_secret: data.has_webhook_secret,
        webhook_secret_masked: data.webhook_secret_masked || ''
      })
    } catch (err: any) {
      console.error('Failed to fetch tenant stripe config', err)
      setStripeError(err.response?.data?.error || '加载 Stripe 配置失败')
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
      console.error('Failed to fetch tenant auth settings', err)
      setAuthError(err.response?.data?.error || '加载认证开关失败')
      setAuthSettings(null)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleAuthSwitchChange = (key: 'allow_registration' | 'allow_login', checked: boolean) => {
    setAuthSettings(prev => {
      if (!prev) {
        return prev
      }
      return {
        ...prev,
        [key]: checked,
      }
    })
  }

  const saveAuthSettings = async () => {
    if (!authSettings) {
      return
    }

    try {
      setAuthSaving(true)
      setAuthError('')
      const response = await tenantApi.updateAuthSettings({
        allow_registration: authSettings.allow_registration,
        allow_login: authSettings.allow_login,
      })
      setAuthSettings(response.data)
      uiAlert('认证开关已保存')
    } catch (err: any) {
      console.error('Failed to save tenant auth settings', err)
      const message = err.response?.data?.error || '保存认证开关失败'
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
      setStripeError('Publishable Key 必须以 pk_ 开头')
      return
    }
    if (secretKey && !secretKey.startsWith('sk_')) {
      setStripeError('Secret Key 必须以 sk_ 开头')
      return
    }
    if (stripeForm.enabled) {
      if (!publishableKey) {
        setStripeError('启用 Stripe 前请先填写 Publishable Key')
        return
      }
      if (!secretKey && !stripeMeta.has_secret_key) {
        setStripeError('启用 Stripe 前请先填写 Secret Key')
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
        webhook_secret: webhookSecret || undefined
      })
      uiAlert('Stripe 配置已保存')
      await fetchStripeConfig()
      setStripeForm(prev => ({
        ...prev,
        secret_key: '',
        webhook_secret: ''
      }))
    } catch (err: any) {
      console.error('Failed to save tenant stripe config', err)
      const message = err.response?.data?.error || '保存 Stripe 配置失败'
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
        enabled: false
      })
      uiAlert('Secret Key 已清除')
      await fetchStripeConfig()
      setStripeForm(prev => ({ ...prev, enabled: false, secret_key: '' }))
    } catch (err: any) {
      const message = err.response?.data?.error || '清除 Secret Key 失败'
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
        clear_webhook_secret: true
      })
      uiAlert('Webhook Secret 已清除')
      await fetchStripeConfig()
      setStripeForm(prev => ({ ...prev, webhook_secret: '' }))
    } catch (err: any) {
      const message = err.response?.data?.error || '清除 Webhook Secret 失败'
      setStripeError(message)
      uiAlert(message)
    } finally {
      setStripeSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(locale)
  }

  const getPlanDisplayName = (plan: string) => {
    const planNames = {
      free: t('tenantInfoPage.plan.free'),
      pro: t('tenantInfoPage.plan.pro'),
      enterprise: t('tenantInfoPage.plan.enterprise')
    }
    return planNames[plan as keyof typeof planNames] || plan
  }

  const getPlanVariant = (plan: string) => {
    const planVariants: Record<string, string> = {
      free: 'default',
      pro: 'info',
      enterprise: 'info'
    }
    return planVariants[plan] || 'default'
  }

  const getStatusVariant = (status: string) => {
    const statusVariants: Record<string, string> = {
      active: 'success',
      suspended: 'warning',
      deleted: 'error'
    }
    return statusVariants[status] || 'default'
  }

  const getStatusDisplayName = (status: string) => {
    const statusNames = {
      active: t('tenantInfoPage.status.active'),
      suspended: t('tenantInfoPage.status.suspended'),
      deleted: t('tenantInfoPage.status.deleted')
    }
    return statusNames[status as keyof typeof statusNames] || status
  }

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error(t('tenantInfoPage.logs.copyFailed'), err)
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
    return `${baseUrl}/auth/tenant/${tenantInfo?.code}/register`
  }

  const loginEnabled = authSettings?.allow_login ?? true
  const registrationEnabled = authSettings?.allow_registration ?? true

  if (loading) {
    return (
      <TenantLayout title={t('tenantInfoPage.layoutTitle')}>
        <div className="py-6">
          <PSkeleton.Content cards={3} />
        </div>
      </TenantLayout>
    )
  }

  if (error) {
    return (
      <TenantLayout title={t('tenantInfoPage.layoutTitle')}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-2xl">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{error}</h3>
            
            {/*  */}
            {debugInfo && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left">
                <h4 className="text-sm font-medium text-gray-700 mb-2">{t('tenantInfoPage.debug.title')}</h4>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>{t('tenantInfoPage.debug.userId', { value: debugInfo.user_id })}</div>
                  <div>{t('tenantInfoPage.debug.tenantId', { value: debugInfo.tenant_id || t('tenantInfoPage.values.notSet') })}</div>
                  <div>{t('tenantInfoPage.debug.userEmail', { value: debugInfo.user?.email })}</div>
                  <div>{t('tenantInfoPage.debug.tenantAssociationsCount', { count: debugInfo.tenant_associations?.length || 0 })}</div>
                  {debugInfo.tenant_associations?.length > 0 && (
                    <div className="mt-2">
                      <div className="font-medium">{t('tenantInfoPage.debug.tenantAssociations')}</div>
                      {debugInfo.tenant_associations.map((ta: any, index: number) => (
                        <div key={index} className="ml-2">
                          - {t('tenantInfoPage.debug.tenantAssociationItem', { name: ta.Tenant?.name, role: ta.Role })}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="mt-6">
              <PButton onClick={fetchTenantInfo}>{t('tenantInfoPage.actions.retry')}</PButton>
            </div>
          </div>
        </div>
      </TenantLayout>
    )
  }

  if (!tenantInfo) {
    return (
      <TenantLayout title={t('tenantInfoPage.layoutTitle')}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <InformationCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{t('tenantInfoPage.empty.notFound')}</h3>
          </div>
        </div>
      </TenantLayout>
    )
  }

  return (
      <TenantLayout title={t('tenantInfoPage.layoutTitle')}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PPageHeader
          title={t('tenantInfoPage.title')}
          description={t('tenantInfoPage.description')}
          icon={<BuildingOffice2Icon className="h-8 w-8 text-blue-600" />}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/*  */}
          <div className="lg:col-span-2">
            <PCard className="rounded-xl p-0 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">{t('tenantInfoPage.sections.basicInfo')}</h3>
              </div>
              <div className="px-6 py-6">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{t('tenantInfoPage.fields.tenantName')}</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-semibold">{tenantInfo.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{t('tenantInfoPage.fields.tenantCode')}</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">{tenantInfo.code}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{t('tenantInfoPage.fields.planType')}</dt>
                    <dd className="mt-1">
                      <PBadge variant={getPlanVariant(tenantInfo.plan) as any}>{getPlanDisplayName(tenantInfo.plan)}</PBadge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{t('tenantInfoPage.fields.status')}</dt>
                    <dd className="mt-1">
                      <PBadge variant={getStatusVariant(tenantInfo.status) as any} icon={<CheckCircleIcon className="h-3 w-3" />}>{getStatusDisplayName(tenantInfo.status)}</PBadge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{t('tenantInfoPage.fields.createdAt')}</dt>
                    <dd className="mt-1 text-sm text-gray-900 flex items-center">
                      <CalendarDaysIcon className="h-4 w-4 mr-1 text-gray-400" />
                      {formatDate(tenantInfo.created_at)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{t('tenantInfoPage.fields.updatedAt')}</dt>
                    <dd className="mt-1 text-sm text-gray-900 flex items-center">
                      <ClockIcon className="h-4 w-4 mr-1 text-gray-400" />
                      {formatDate(tenantInfo.updated_at)}
                    </dd>
                  </div>
                  {tenantInfo.description && (
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">{t('tenantInfoPage.fields.description')}</dt>
                      <dd className="mt-1 text-sm text-gray-900">{tenantInfo.description}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </PCard>

            <PCard className="rounded-xl p-0 shadow-sm mt-6">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Stripe 收款配置</h3>
                {stripeLoading && <span className="text-sm text-gray-500">加载中...</span>}
              </div>
              <div className="px-6 py-6 space-y-4">
                {stripeError && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {stripeError}
                  </div>
                )}

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={stripeForm.enabled}
                    onChange={(e) => setStripeForm(prev => ({ ...prev, enabled: e.target.checked }))}
                  />
                  启用租户 Stripe 收款
                </label>

                <PInput
                  label="Publishable Key"
                  type="text"
                  value={stripeForm.publishable_key}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setStripeForm(prev => ({ ...prev, publishable_key: e.target.value }))}
                  placeholder="pk_test_..."
                />

                <PInput
                  label="Secret Key（留空=不改）"
                  type="password"
                  value={stripeForm.secret_key}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setStripeForm(prev => ({ ...prev, secret_key: e.target.value }))}
                  placeholder="sk_test_..."
                />
                {stripeMeta.has_secret_key && (
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-gray-500">当前已保存 Secret Key：{stripeMeta.secret_key_masked}</p>
                    <PButton type="button" variant="secondary" onClick={clearSecretKey} loading={stripeSaving}>
                      清除 Secret Key
                    </PButton>
                  </div>
                )}

                <PInput
                  label="Webhook Secret（可选，留空=不改）"
                  type="password"
                  value={stripeForm.webhook_secret}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setStripeForm(prev => ({ ...prev, webhook_secret: e.target.value }))}
                  placeholder="whsec_..."
                />
                {stripeMeta.has_webhook_secret && (
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-gray-500">当前已保存 Webhook Secret：{stripeMeta.webhook_secret_masked}</p>
                    <PButton type="button" variant="secondary" onClick={clearWebhookSecret} loading={stripeSaving}>
                      清除 Webhook Secret
                    </PButton>
                  </div>
                )}

                <div className="pt-2">
                  <PButton onClick={saveStripeConfig} loading={stripeSaving}>
                    {stripeSaving ? '保存中...' : '保存 Stripe 配置'}
                  </PButton>
                </div>
              </div>
            </PCard>

            <PCard className="rounded-xl p-0 shadow-sm mt-6">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">认证访问控制</h3>
                {authLoading && <span className="text-sm text-gray-500">加载中...</span>}
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
                        label="允许新用户注册"
                        checked={authSettings.allow_registration}
                        onChange={(e) => handleAuthSwitchChange('allow_registration', (e.target as HTMLInputElement).checked)}
                        disabled={authSaving}
                      />
                      <p className="text-xs text-gray-500 mt-2">关闭后，租户注册页将拒绝新账号创建。</p>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
                      <PCheckbox
                        variant="switch"
                        label="允许租户用户登录"
                        checked={authSettings.allow_login}
                        onChange={(e) => handleAuthSwitchChange('allow_login', (e.target as HTMLInputElement).checked)}
                        disabled={authSaving}
                      />
                      <p className="text-xs text-gray-500 mt-2">关闭后，租户用户无法登录和刷新令牌。</p>
                    </div>

                    {(!authSettings.allow_registration || !authSettings.allow_login) && (
                      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                        当前租户已启用部分认证限制，建议先通知业务方后再执行。
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>注册</span>
                        <PBadge variant={registrationEnabled ? 'success' : 'warning'}>{registrationEnabled ? '开启' : '关闭'}</PBadge>
                        <span>登录</span>
                        <PBadge variant={loginEnabled ? 'success' : 'warning'}>{loginEnabled ? '开启' : '关闭'}</PBadge>
                      </div>
                      <PButton onClick={saveAuthSettings} loading={authSaving}>
                        {authSaving ? '保存中...' : '保存认证开关'}
                      </PButton>
                    </div>
                  </>
                )}
              </div>
            </PCard>
          </div>

          {/*  */}
          <div className="space-y-6">
            {/*  */}
            <PCard className="rounded-xl p-0 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center">
                  <LinkIcon className="h-5 w-5 text-blue-500 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">{t('tenantInfoPage.userAccessLinks.title')}</h3>
                </div>
                <p className="mt-1 text-sm text-gray-500">{t('tenantInfoPage.userAccessLinks.description')}</p>
              </div>
              <div className="px-6 py-6">
                <div className="space-y-4">
                  {/* 加入链接 */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">
                        {t('tenantInfoPage.userAccessLinks.joinPage')}
                      </label>
                      <PBadge variant={registrationEnabled ? 'success' : 'warning'}>{registrationEnabled ? '可访问' : '已禁用'}</PBadge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <PInput
                        type="text"
                        readOnly
                        value={getJoinUrl()}
                        className="flex-1 bg-gray-50 font-mono text-gray-600"
                      />
                      <PButton
                        type="button"
                        variant="secondary"
                        onClick={() => copyToClipboard(getJoinUrl(), 'join')}
                        title={t('tenantInfoPage.actions.copyLink')}
                      >
                        {copiedField === 'join' ? (
                          <CheckIcon className="h-5 w-5 text-green-500" />
                        ) : (
                          <ClipboardDocumentIcon className="h-5 w-5" />
                        )}
                      </PButton>
                    </div>
                  </div>

                  {/*  */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">
                        {t('tenantInfoPage.userAccessLinks.loginPage')}
                      </label>
                      <PBadge variant={loginEnabled ? 'success' : 'warning'}>{loginEnabled ? '可访问' : '已禁用'}</PBadge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <PInput
                        type="text"
                        readOnly
                        value={getLoginUrl()}
                        className="flex-1 bg-gray-50 font-mono text-gray-600"
                      />
                      <PButton
                        type="button"
                        variant="secondary"
                        onClick={() => copyToClipboard(getLoginUrl(), 'login')}
                        title={t('tenantInfoPage.actions.copyLink')}
                      >
                        {copiedField === 'login' ? (
                          <CheckIcon className="h-5 w-5 text-green-500" />
                        ) : (
                          <ClipboardDocumentIcon className="h-5 w-5" />
                        )}
                      </PButton>
                    </div>
                  </div>

                  {/*  */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">
                        {t('tenantInfoPage.userAccessLinks.registerPage')}
                      </label>
                      <PBadge variant={registrationEnabled ? 'success' : 'warning'}>{registrationEnabled ? '可访问' : '已禁用'}</PBadge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <PInput
                        type="text"
                        readOnly
                        value={getRegisterUrl()}
                        className="flex-1 bg-gray-50 font-mono text-gray-600"
                      />
                      <PButton
                        type="button"
                        variant="secondary"
                        onClick={() => copyToClipboard(getRegisterUrl(), 'register')}
                        title={t('tenantInfoPage.actions.copyLink')}
                      >
                        {copiedField === 'register' ? (
                          <CheckIcon className="h-5 w-5 text-green-500" />
                        ) : (
                          <ClipboardDocumentIcon className="h-5 w-5" />
                        )}
                      </PButton>
                    </div>
                  </div>

                  {/*  */}
                  <div className="mt-4 rounded-lg bg-blue-50 p-3">
                    <div className="flex">
                      <InformationCircleIcon className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-700">
                        <p>{t('tenantInfoPage.userAccessLinks.tip')}</p>
                        {(!loginEnabled || !registrationEnabled) && (
                          <p className="mt-2 font-medium text-amber-700">
                            当前有认证开关被关闭，部分链接将无法正常使用。
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </PCard>

            {/*  */}
            <PCard className="rounded-xl p-0 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">{t('tenantInfoPage.sections.usageStats')}</h3>
              </div>
              <div className="px-6 py-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <UsersIcon className="h-5 w-5 text-blue-500 mr-2" />
                      <span className="text-sm font-medium text-gray-700">{t('tenantInfoPage.stats.totalUsers')}</span>
                    </div>
                    <span className="text-lg font-semibold text-blue-600">
                      {tenantInfo.stats.total_users}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CubeIcon className="h-5 w-5 text-green-500 mr-2" />
                      <span className="text-sm font-medium text-gray-700">{t('tenantInfoPage.stats.totalApps')}</span>
                    </div>
                    <span className="text-lg font-semibold text-green-600">
                      {tenantInfo.stats.total_apps}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-emerald-500 mr-2" />
                      <span className="text-sm font-medium text-gray-700">{t('tenantInfoPage.stats.activeApps')}</span>
                    </div>
                    <span className="text-lg font-semibold text-emerald-600">
                      {tenantInfo.stats.active_apps}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <KeyIcon className="h-5 w-5 text-indigo-500 mr-2" />
                      <span className="text-sm font-medium text-gray-700">{t('tenantInfoPage.stats.oauthClients')}</span>
                    </div>
                    <span className="text-lg font-semibold text-indigo-600">
                      {tenantInfo.stats.total_clients}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CpuChipIcon className="h-5 w-5 text-yellow-500 mr-2" />
                      <span className="text-sm font-medium text-gray-700">{t('tenantInfoPage.stats.activeTokens')}</span>
                    </div>
                    <span className="text-lg font-semibold text-yellow-600">
                      {tenantInfo.stats.active_tokens}
                    </span>
                  </div>
                </div>
              </div>
            </PCard>

            {/*  */}
            {tenantInfo.quota && (
              <PCard className="rounded-xl p-0 shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">{t('tenantInfoPage.sections.quota')}</h3>
                </div>
                <div className="px-6 py-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-700">{t('tenantInfoPage.quota.apps')}</span>
                        <span className="text-gray-500">
                          {tenantInfo.stats.total_apps} / {tenantInfo.quota.max_apps}
                        </span>
                      </div>
                      <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ 
                            width: `${Math.min((tenantInfo.stats.total_apps / tenantInfo.quota.max_apps) * 100, 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-700">{t('tenantInfoPage.quota.users')}</span>
                        <span className="text-gray-500">
                          {tenantInfo.stats.total_users} / {tenantInfo.quota.max_users}
                        </span>
                      </div>
                      <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ 
                            width: `${Math.min((tenantInfo.stats.total_users / tenantInfo.quota.max_users) * 100, 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">{t('tenantInfoPage.quota.tokensPerHour')}</span>
                        <span className="text-sm text-gray-500">
                          {tenantInfo.quota.max_tokens_per_hour.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
              </div>
              </PCard>
            )}
          </div>
        </div>
      </div>
    </TenantLayout>
  )
}
