import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  ArrowLeftIcon, 
  ChartBarIcon,
  UsersIcon,
  EyeIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  DocumentChartBarIcon
} from '@heroicons/react/24/outline'
import TenantLayout from '@features/tenant/components/TenantLayout'
import { tenantAppApi, TenantApp } from '@api/tenant/tenantApp'
import { ROUTES } from '@constants'
import { PSkeleton, PButton } from '@ui'
import { useI18n } from '@shared/i18n'

interface AppStatsData {
  period: string
  total_users: number
  active_users: number
  new_users: number
  returning_users: number
  requests_today: number
  requests_this_week: number
  requests_this_month: number
  conversion_rate: number
  avg_session_duration: number
  top_pages: Array<{
    path: string
    views: number
    unique_visitors: number
  }>
  user_growth: Array<{
    date: string
    new_users: number
    total_users: number
  }>
  request_timeline: Array<{
    date: string
    requests: number
  }>
}

export default function AppStats() {
  const { t, locale } = useI18n()
  const { id } = useParams<{ id: string }>()
  const [app, setApp] = useState<TenantApp | null>(null)
  const [stats, setStats] = useState<AppStatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [period, setPeriod] = useState('30d')

  useEffect(() => {
    if (id) {
      fetchAppData()
      fetchAppStats()
    }
  }, [id, period])

  const fetchAppData = async () => {
    if (!id) return
    
    try {
      const response = await tenantAppApi.getTenantApp(id)
      setApp(response.data)
    } catch (err: any) {
      console.error(t('tenantAppStats.logs.fetchAppFailed'), err)
      setError(err.response?.data?.error || t('tenantAppStats.errors.fetchAppFailed'))
    }
  }

  const fetchAppStats = async () => {
    if (!id) return
    
    try {
      setLoading(true)
      const response = await tenantAppApi.getAppStats(id, period)
      setStats(response.data)
    } catch (err: any) {
      console.error(t('tenantAppStats.logs.fetchStatsFailed'), err)
      setError(err.response?.data?.error || t('tenantAppStats.errors.fetchStatsFailed'))
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined || num === 0) {
      return '--'
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  const formatDuration = (seconds: number | null | undefined) => {
    if (seconds === null || seconds === undefined || seconds === 0) {
      return '--'
    }
    if (seconds < 60) {
      return t('tenantAppStats.duration.seconds', { seconds })
    } else if (seconds < 3600) {
      return t('tenantAppStats.duration.minutesSeconds', { minutes: Math.floor(seconds / 60), seconds: seconds % 60 })
    } else {
      return t('tenantAppStats.duration.hoursMinutes', { hours: Math.floor(seconds / 3600), minutes: Math.floor((seconds % 3600) / 60) })
    }
  }

  const formatPercentage = (value: number | null | undefined) => {
    if (value === null || value === undefined || value === 0) {
      return '--'
    }
    return (value * 100).toFixed(1) + '%'
  }

  const getPeriodText = (period: string) => {
    switch (period) {
      case '7d':
        return t('tenantAppStats.period.recent7d')
      case '30d':
        return t('tenantAppStats.period.recent30d')
      case '90d':
        return t('tenantAppStats.period.recent90d')
      default:
        return t('tenantAppStats.period.recent30d')
    }
  }

  if (loading && !stats) {
    return (
      <TenantLayout title={t('tenantAppStats.layoutTitle')}>
        <div className="py-6">
          <PSkeleton.Dashboard statsCount={2} />
        </div>
      </TenantLayout>
    )
  }

  if (error) {
    return (
      <TenantLayout title={t('tenantAppStats.layoutTitle')}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <DocumentChartBarIcon className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{error}</h3>
            <div className="mt-6">
              <PButton onClick={fetchAppStats}>{t('tenantAppStats.actions.retry')}</PButton>
            </div>
          </div>
        </div>
      </TenantLayout>
    )
  }

  if (!app || !stats) {
    return (
      <TenantLayout title={t('tenantAppStats.layoutTitle')}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{t('tenantAppStats.empty.noData')}</h3>
            <div className="mt-6">
              <Link to={ROUTES.tenant.apps}>
                <PButton>{t('tenantAppStats.actions.backToList')}</PButton>
              </Link>
            </div>
          </div>
        </div>
      </TenantLayout>
    )
  }

  return (
    <TenantLayout title={t('tenantAppStats.layoutWithApp', { name: app.name })}>
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/*  */}
        <div className="mb-6">
          <nav className="flex items-center space-x-4">
            <Link
              to={ROUTES.tenant.apps}
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-1" />
              {t('tenantAppStats.breadcrumb.apps')}
            </Link>
            <span className="text-gray-300">/</span>
            <Link
              to={`/tenant/apps/${app.id}`}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {app.name}
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-900">{t('tenantAppStats.breadcrumb.stats')}</span>
          </nav>
        </div>

        {/*  */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('tenantAppStats.title')}</h1>
              <p className="mt-2 text-gray-600">{t('tenantAppStats.description')}</p>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="7d">{t('tenantAppStats.period.recent7d')}</option>
                <option value="30d">{t('tenantAppStats.period.recent30d')}</option>
                <option value="90d">{t('tenantAppStats.period.recent90d')}</option>
              </select>
            </div>
          </div>
        </div>

        {/*  */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/*  */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('tenantAppStats.metrics.totalUsers')}</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.total_users)}</p>
                <div className="flex items-center mt-2">
                  {stats.new_users > 0 ? (
                    <>
                      <ArrowTrendingUpIcon className="w-4 h-4 text-green-500 mr-1" />
                      <span className="text-sm text-green-600">{t('tenantAppStats.metrics.newUsers', { count: stats.new_users })}</span>
                    </>
                  ) : (
                    <span className="text-sm text-gray-400">{t('tenantAppStats.metrics.noNewUsers')}</span>
                  )}
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <UsersIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/*  */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('tenantAppStats.metrics.activeUsers')}</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.active_users)}</p>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-gray-500">
                    {t('tenantAppStats.metrics.activeRate')}{' '}{stats.total_users > 0 ? ((stats.active_users / stats.total_users) * 100).toFixed(1) + '%' : '--'}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <EyeIcon className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/*  */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('tenantAppStats.metrics.requestsToday')}</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.requests_today)}</p>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-gray-500">
                    {t('tenantAppStats.metrics.thisWeek')} {formatNumber(stats.requests_this_week)}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <ChartBarIcon className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          {/*  */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('tenantAppStats.metrics.avgSessionDuration')}</p>
                <p className="text-3xl font-bold text-gray-900">{formatDuration(stats.avg_session_duration)}</p>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-gray-500">
                    {t('tenantAppStats.metrics.conversionRate')} {formatPercentage(stats.conversion_rate)}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <ClockIcon className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/*  */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/*  */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">{t('tenantAppStats.sections.userGrowth')}</h3>
              <CalendarIcon className="w-5 h-5 text-gray-400" />
            </div>
            
            {stats.user_growth && stats.user_growth.length > 0 ? (
              <div className="space-y-4">
                {stats.user_growth.slice(-7).map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {new Date(item.date).toLocaleDateString(locale)}
                    </span>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-blue-600">
                        {t('tenantAppStats.metrics.newUsers', { count: item.new_users })}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {t('tenantAppStats.metrics.total')} {formatNumber(item.total_users)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ChartBarIcon className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">{t('tenantAppStats.empty.noData')}</p>
              </div>
            )}
          </div>

          {/*  */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">{t('tenantAppStats.sections.requestTrend')}</h3>
              <ArrowTrendingUpIcon className="w-5 h-5 text-gray-400" />
            </div>
            
            {stats.request_timeline && stats.request_timeline.length > 0 ? (
              <div className="space-y-4">
                {stats.request_timeline.slice(-7).map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {new Date(item.date).toLocaleDateString(locale)}
                    </span>
                    <div className="flex items-center">
                      <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ 
                            width: `${Math.min((item.requests / Math.max(...stats.request_timeline.map(t => t.requests))) * 100, 100)}%` 
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {formatNumber(item.requests)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ChartBarIcon className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">{t('tenantAppStats.empty.noData')}</p>
              </div>
            )}
          </div>

          {/*  */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">{t('tenantAppStats.sections.topPages')}</h3>
            
            {stats.top_pages && stats.top_pages.length > 0 ? (
              <div className="space-y-4">
                {stats.top_pages.slice(0, 5).map((page, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {page.path}
                      </p>
                      <p className="text-sm text-gray-500">
                        {t('tenantAppStats.metrics.uniqueVisitors', { count: page.unique_visitors })}
                      </p>
                    </div>
                    <div className="ml-4 text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatNumber(page.views)}
                      </p>
                      <p className="text-sm text-gray-500">{t('tenantAppStats.metrics.pageViews')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <DocumentChartBarIcon className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">{t('tenantAppStats.empty.noPageData')}</p>
              </div>
            )}
          </div>

          {/*  */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">{t('tenantAppStats.sections.userTypeDistribution')}</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{t('tenantAppStats.metrics.newUserType')}</span>
                <div className="flex items-center">
                  <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ 
                        width: stats.total_users > 0 ? `${(stats.new_users / stats.total_users) * 100}%` : '0%'
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {formatNumber(stats.new_users)}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{t('tenantAppStats.metrics.returningUsers')}</span>
                <div className="flex items-center">
                  <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ 
                        width: stats.total_users > 0 ? `${(stats.returning_users / stats.total_users) * 100}%` : '0%'
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {formatNumber(stats.returning_users)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{t('tenantAppStats.metrics.timePeriod')}</span>
                <span className="font-medium text-gray-900">{getPeriodText(period)}</span>
              </div>
            </div>
          </div>
        </div>

        {/*  */}
        <div className="mt-8 flex justify-end space-x-3">
          <Link to={`/tenant/apps/${app.id}`}>
            <PButton variant="secondary">{t('tenantAppStats.actions.backToDetail')}</PButton>
          </Link>
          <Link to={`/tenant/apps/${app.id}/settings`}>
            <PButton>{t('tenantAppStats.actions.appSettings')}</PButton>
          </Link>
        </div>
      </div>
    </TenantLayout>
  )
}
