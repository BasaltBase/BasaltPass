import { useState, useEffect } from 'react'
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
import { tenantApi, TenantInfo } from '@api/tenant/tenant'
import { PSkeleton, PBadge, PButton, PCard, PInput, PPageHeader } from '@ui'
import { useI18n } from '@shared/i18n'

export default function TenantInfoPage() {
  const { t, locale } = useI18n()
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  useEffect(() => {
    fetchTenantInfo()
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
    const baseUrl = (import.meta as any).env?.VITE_CONSOLE_USER_URL || 'http://localhost:5101'
    return `${baseUrl}/auth/tenant/${tenantInfo?.code}/login`
  }

  const getRegisterUrl = () => {
    const baseUrl = (import.meta as any).env?.VITE_CONSOLE_USER_URL || 'http://localhost:5101'
    return `${baseUrl}/auth/tenant/${tenantInfo?.code}/register`
  }

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
                  {/*  */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('tenantInfoPage.userAccessLinks.loginPage')}
                    </label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('tenantInfoPage.userAccessLinks.registerPage')}
                    </label>
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
