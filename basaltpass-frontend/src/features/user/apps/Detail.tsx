import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Layout from '@features/user/components/Layout'
import { userAppsApi, UserApp } from '@api/user/apps'
import { PCard } from '@ui'
import { 
  ArrowLeftIcon, 
  CubeIcon, 
  ClockIcon, 
  TrashIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'

export default function UserAppDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [app, setApp] = useState<UserApp | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revoking, setRevoking] = useState(false)

  useEffect(() => {
    load()
  }, [id])

  const load = async () => {
    if (!id) return
    try {
      setLoading(true)
      setError(null)
      const data = await userAppsApi.list()
      const foundApp = data.apps?.find((a: UserApp) => a.app_id === Number(id))
      if (foundApp) {
        setApp(foundApp)
      } else {
        setError('应用不存在或未授权')
      }
    } catch (e: any) {
      console.error(e)
      setError(e?.response?.data?.error || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  const revoke = async () => {
    if (!app || !await uiConfirm(`确定要撤销对「${app.app_name}」的授权吗？`)) return
    try {
      setRevoking(true)
      await userAppsApi.revoke(app.app_id)
      uiAlert('已撤销授权')
      navigate('/my-apps')
    } catch (e: any) {
      console.error(e)
      uiAlert(e?.response?.data?.error || '撤销失败')
      setRevoking(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  if (error || !app) {
    return (
      <Layout>
        <div className="space-y-6">
          <Link to="/my-apps" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            返回
          </Link>
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">加载失败</h3>
                <div className="mt-2 text-sm text-red-700">{error || '应用不存在'}</div>
                <div className="mt-4">
                  <button onClick={load} className="px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700">重试</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* 返回按钮 */}
        <Link to="/my-apps" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          返回我的应用
        </Link>

        {/* 应用头部 */}
        <PCard>
          <div className="flex items-start space-x-6">
            {app.app_icon_url ? (
              <img src={app.app_icon_url} alt={app.app_name} className="h-20 w-20 rounded-lg" />
            ) : (
              <div className="h-20 w-20 rounded-lg bg-blue-50 flex items-center justify-center">
                <CubeIcon className="h-10 w-10 text-blue-600" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{app.app_name}</h1>
              <p className="mt-2 text-gray-600">{app.app_description || '暂无描述'}</p>
            </div>
          </div>
        </PCard>

        {/* 授权信息 */}
        <PCard>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">授权信息</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">首次授权时间</span>
              <span className="text-sm font-medium text-gray-900">
                {new Date(app.first_authorized_at).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">最近活跃时间</span>
              <span className="text-sm font-medium text-gray-900">
                {app.last_active_at ? new Date(app.last_active_at).toLocaleString() : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">最近授权时间</span>
              <span className="text-sm font-medium text-gray-900">
                {new Date(app.last_authorized_at).toLocaleString()}
              </span>
            </div>
          </div>
        </PCard>

        {/* 授权范围 */}
        {app.scopes && (
          <PCard>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <ShieldCheckIcon className="h-5 w-5 mr-2 text-gray-400" />
              授权范围
            </h2>
            <div className="flex flex-wrap gap-2">
              {app.scopes.split(/[ ,]+/).filter(Boolean).map((scope) => (
                <span 
                  key={scope} 
                  className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20"
                >
                  {scope}
                </span>
              ))}
            </div>
            <p className="mt-4 text-xs text-gray-500">
              该应用已被授权访问上述范围内的数据和功能。如果你不再信任此应用，可以随时撤销授权。
            </p>
          </PCard>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-end">
          <button
            onClick={revoke}
            disabled={revoking}
            className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium ${
              revoking 
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            {revoking ? '撤销中...' : '撤销授权'}
          </button>
        </div>
      </div>
    </Layout>
  )
}
