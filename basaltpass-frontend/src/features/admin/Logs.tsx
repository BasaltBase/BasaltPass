import { useEffect, useMemo, useState } from 'react'
import client from '@api/client'
import { Link } from 'react-router-dom'
import { ArrowPathIcon, ChevronRightIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import AdminLayout from '@features/admin/components/AdminLayout'
import PTable, { PTableColumn } from '@ui/PTable'
import PInput from '@ui/PInput'
import PButton from '@ui/PButton'
import { ROUTES } from '@constants'

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
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const r = await client.get<Log[]>('/api/v1/admin/logs')
      setLogs(r.data)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (!keyword) return logs
    const kw = keyword.toLowerCase().trim()
    return logs.filter(l =>
      String(l.ID).includes(kw) ||
      String(l.UserID).includes(kw) ||
      (l.Action || '').toLowerCase().includes(kw) ||
      (l.IP || '').toLowerCase().includes(kw) ||
      (l.Data || '').toLowerCase().includes(kw)
    )
  }, [logs, keyword])

  const columns: PTableColumn<Log>[] = [
    { key: 'id', title: 'ID', dataIndex: 'ID', sortable: true, align: 'center' },
    { key: 'user', title: '用户ID', sortable: true, align: 'center', sorter: (a,b)=> a.UserID - b.UserID, render: (row)=> row.UserID },
    { key: 'action', title: '操作', align: 'left', render: (row)=> row.Action },
    { key: 'resource', title: '资源', align: 'left', render: (row)=> (row.Data?.slice(0,50) || '') },
    { key: 'ip', title: 'IP地址', align: 'center', render: (row)=> row.IP },
    { key: 'created_at', title: '时间', sortable: true, render: (row)=> new Date(row.CreatedAt).toLocaleString() },
  ]

  return (
    <AdminLayout title="操作日志" actions={
      <PButton variant="ghost" size="sm" leftIcon={<ArrowPathIcon className="h-4 w-4" />} onClick={load} disabled={loading}>
        刷新
      </PButton>
    }>
      <div className="space-y-6">
        {/* 面包屑导航 */}
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-4">
            <li>
              <Link to={ROUTES.admin.dashboard} className="text-gray-400 hover:text-gray-500">
                仪表板
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <ChevronRightIcon className="flex-shrink-0 h-5 w-5 text-gray-400" />
                <Link to={ROUTES.admin.subscriptions} className="ml-4 text-gray-400 hover:text-gray-500">
                  订阅管理
                </Link>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <ChevronRightIcon className="flex-shrink-0 h-5 w-5 text-gray-400" />
                <span className="ml-4 text-sm font-medium text-gray-500">审计日志</span>
              </div>
            </li>
          </ol>
        </nav>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">审计日志</h1>
          <p className="mt-1 text-sm text-gray-500">
            查看系统操作审计记录
          </p>
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">操作日志</h3>
          <div className="relative w-72">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <PInput placeholder="搜索 ID/用户/操作/IP/资源" value={keyword} onChange={(e)=>setKeyword(e.target.value)} className="pl-9" />
          </div>
        </div>
        <PTable
          columns={columns}
          data={filtered}
          rowKey={(row)=> row.ID}
          loading={loading}
          defaultSort={{ key: 'created_at', order: 'desc' }}
        />
      </div>
    </AdminLayout>
  )
} 