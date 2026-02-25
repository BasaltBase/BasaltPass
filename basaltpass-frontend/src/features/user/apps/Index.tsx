import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import Layout from '@features/user/components/Layout'
import { userAppsApi, UserApp } from '@api/user/apps'
import { Link } from 'react-router-dom'
import { CubeIcon, ClockIcon, TrashIcon } from '@heroicons/react/24/outline'

export default function UserAppsIndex() {
  const [apps, setApps] = useState<UserApp[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<number | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await userAppsApi.list()
      setApps(data.apps || [])
    } catch (e: any) {
      console.error(e)
      setError(e?.response?.data?.error || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const revoke = async (app: UserApp) => {
    if (!await uiConfirm(`确定要撤销对「${app.app_name}」的授权吗？`)) return
    try {
      setRevokingId(app.app_id)
      await userAppsApi.revoke(app.app_id)
      await load()
      uiAlert('已撤销授权')
    } catch (e: any) {
      console.error(e)
      uiAlert(e?.response?.data?.error || '撤销失败')
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">我的应用</h1>
          <p className="mt-1 text-sm text-gray-500">查看并管理你已授权的应用</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">加载失败</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
                <div className="mt-4">
                  <button onClick={load} className="px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700">重试</button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {apps.length === 0 ? (
              <div className="col-span-full text-center text-gray-500">暂无授权的应用</div>
            ) : (
              apps.map((app) => (
                <div key={app.id} className="bg-white rounded-lg shadow p-6 flex flex-col">
                  <div className="flex items-center space-x-4">
                    {app.app_icon_url ? (
                      <img src={app.app_icon_url} alt={app.app_name} className="h-12 w-12 rounded" />
                    ) : (
                      <div className="h-12 w-12 rounded bg-blue-50 flex items-center justify-center">
                        <CubeIcon className="h-6 w-6 text-blue-600" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="text-lg font-medium text-gray-900">{app.app_name}</div>
                      <div className="text-sm text-gray-500 line-clamp-2">{app.app_description || '—'}</div>
                    </div>
                  </div>
                  <div className="mt-4 text-xs text-gray-500 flex items-center space-x-4">
                    <span className="inline-flex items-center">
                      <ClockIcon className="h-4 w-4 mr-1" /> 首次授权：{new Date(app.first_authorized_at).toLocaleString()}
                    </span>
                    <span className="inline-flex items-center">
                      <ClockIcon className="h-4 w-4 mr-1" /> 最近活跃：{app.last_active_at ? new Date(app.last_active_at).toLocaleString() : '—'}
                    </span>
                  </div>
                  {app.scopes && (
                    <div className="mt-3">
                      <div className="text-xs text-gray-400">授权范围</div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {app.scopes.split(/[ ,]+/).filter(Boolean).map((s) => (
                          <span key={s} className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-6 flex items-center justify-between">
                    <Link to={`/my-apps/${app.app_id}`} className="text-sm text-blue-600 hover:text-blue-700">查看应用</Link>
                    <button
                      onClick={() => revoke(app)}
                      disabled={revokingId === app.app_id}
                      className={`inline-flex items-center px-3 py-1.5 rounded text-sm ${revokingId === app.app_id ? 'bg-gray-200 text-gray-500' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
                    >
                      <TrashIcon className="h-4 w-4 mr-1" /> 撤销授权
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
