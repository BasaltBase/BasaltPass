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
      console.error('获取应用信息失败:', err)
      setError(err.response?.data?.error || '获取应用信息失败')
    }
  }

  const fetchAppStats = async () => {
    if (!id) return
    
    try {
      setLoading(true)
      const response = await tenantAppApi.getAppStats(id, period)
      setStats(response.data)
    } catch (err: any) {
      console.error('获取统计数据失败:', err)
      setError(err.response?.data?.error || '获取统计数据失败')
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
      return `${seconds}秒`
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}分${seconds % 60}秒`
    } else {
      return `${Math.floor(seconds / 3600)}小时${Math.floor((seconds % 3600) / 60)}分`
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
        return '最近7天'
      case '30d':
        return '最近30天'
      case '90d':
        return '最近90天'
      default:
        return '最近30天'
    }
  }

  if (loading && !stats) {
    return (
      <TenantLayout title="应用统计">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">加载中...</p>
          </div>
        </div>
      </TenantLayout>
    )
  }

  if (error) {
    return (
      <TenantLayout title="应用统计">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <DocumentChartBarIcon className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{error}</h3>
            <div className="mt-6">
              <button
                onClick={fetchAppStats}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                重试
              </button>
            </div>
          </div>
        </div>
      </TenantLayout>
    )
  }

  if (!app || !stats) {
    return (
      <TenantLayout title="应用统计">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">无数据</h3>
            <div className="mt-6">
              <Link
                to="/tenant/apps"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                返回应用列表
              </Link>
            </div>
          </div>
        </div>
      </TenantLayout>
    )
  }

  return (
    <TenantLayout title={`${app.name} - 统计分析`}>
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* 导航栏 */}
        <div className="mb-6">
          <nav className="flex items-center space-x-4">
            <Link
              to="/tenant/apps"
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-1" />
              应用列表
            </Link>
            <span className="text-gray-300">/</span>
            <Link
              to={`/tenant/apps/${app.id}`}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {app.name}
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-900">统计分析</span>
          </nav>
        </div>

        {/* 页面标题和时间段选择 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">统计分析</h1>
              <p className="mt-2 text-gray-600">查看应用的详细使用统计和分析数据</p>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="7d">最近7天</option>
                <option value="30d">最近30天</option>
                <option value="90d">最近90天</option>
              </select>
            </div>
          </div>
        </div>

        {/* 核心指标卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* 总用户数 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">总用户数</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.total_users)}</p>
                <div className="flex items-center mt-2">
                  {stats.new_users > 0 ? (
                    <>
                      <ArrowTrendingUpIcon className="w-4 h-4 text-green-500 mr-1" />
                      <span className="text-sm text-green-600">+{stats.new_users} 新增</span>
                    </>
                  ) : (
                    <span className="text-sm text-gray-400">暂无新增</span>
                  )}
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <UsersIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* 活跃用户数 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">活跃用户</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.active_users)}</p>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-gray-500">
                    活跃率 {stats.total_users > 0 ? ((stats.active_users / stats.total_users) * 100).toFixed(1) + '%' : '--'}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <EyeIcon className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* 今日请求数 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">今日请求</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.requests_today)}</p>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-gray-500">
                    本周 {formatNumber(stats.requests_this_week)}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <ChartBarIcon className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          {/* 平均会话时长 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">平均会话时长</p>
                <p className="text-3xl font-bold text-gray-900">{formatDuration(stats.avg_session_duration)}</p>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-gray-500">
                    转换率 {formatPercentage(stats.conversion_rate)}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <ClockIcon className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* 图表和详细数据 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 用户增长趋势 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">用户增长趋势</h3>
              <CalendarIcon className="w-5 h-5 text-gray-400" />
            </div>
            
            {stats.user_growth && stats.user_growth.length > 0 ? (
              <div className="space-y-4">
                {stats.user_growth.slice(-7).map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {new Date(item.date).toLocaleDateString()}
                    </span>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-blue-600">
                        +{item.new_users} 新增
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        总计 {formatNumber(item.total_users)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ChartBarIcon className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">暂无数据</p>
              </div>
            )}
          </div>

          {/* 请求量趋势 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">请求量趋势</h3>
              <ArrowTrendingUpIcon className="w-5 h-5 text-gray-400" />
            </div>
            
            {stats.request_timeline && stats.request_timeline.length > 0 ? (
              <div className="space-y-4">
                {stats.request_timeline.slice(-7).map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {new Date(item.date).toLocaleDateString()}
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
                <p className="mt-2 text-sm text-gray-500">暂无数据</p>
              </div>
            )}
          </div>

          {/* 热门页面 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">热门页面</h3>
            
            {stats.top_pages && stats.top_pages.length > 0 ? (
              <div className="space-y-4">
                {stats.top_pages.slice(0, 5).map((page, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {page.path}
                      </p>
                      <p className="text-sm text-gray-500">
                        {page.unique_visitors} 独立访客
                      </p>
                    </div>
                    <div className="ml-4 text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatNumber(page.views)}
                      </p>
                      <p className="text-sm text-gray-500">浏览量</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <DocumentChartBarIcon className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">暂无页面访问数据</p>
              </div>
            )}
          </div>

          {/* 用户类型分布 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">用户类型分布</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">新用户</span>
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
                <span className="text-sm text-gray-600">回访用户</span>
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
                <span className="text-gray-600">时间段</span>
                <span className="font-medium text-gray-900">{getPeriodText(period)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="mt-8 flex justify-end space-x-3">
          <Link
            to={`/tenant/apps/${app.id}`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            返回详情
          </Link>
          <Link
            to={`/tenant/apps/${app.id}/settings`}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            应用设置
          </Link>
        </div>
      </div>
    </TenantLayout>
  )
}
