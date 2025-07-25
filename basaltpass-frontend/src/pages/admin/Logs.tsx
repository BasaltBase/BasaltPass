import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import client from '../../api/client'

interface Log {
  ID: number
  UserID: number
  Action: string
  IP: string
  Data: string
  CreatedAt: string
  User?: {
    Nickname?: string
    Email?: string
  }
}

export default function Logs() {
  const [logs, setLogs] = useState<Log[]>([])

  const load = () => {
    client.get<Log[]>('/api/v1/admin/logs').then((r) => setLogs(r.data))
  }
  useEffect(load, [])

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">审计日志</h1>
          <p className="mt-1 text-sm text-gray-500">
            查看系统操作审计记录
          </p>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">操作日志</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">资源</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP地址</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时间</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.ID} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.ID}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.UserID}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.Action}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.Data?.slice(0,50)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.IP}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(log.CreatedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
} 