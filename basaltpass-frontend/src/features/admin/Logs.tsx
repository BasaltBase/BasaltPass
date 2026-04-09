import { useEffect, useMemo, useState } from 'react'
import client from '@api/client'
import { Link } from 'react-router-dom'
import { ArrowPathIcon, ChevronRightIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import AdminLayout from '@features/admin/components/AdminLayout'
import PTable, { PTableColumn } from '@ui/PTable'
import PInput from '@ui/PInput'
import PButton from '@ui/PButton'
import UserTooltip from '@ui/UserTooltip'
import { ROUTES } from '@constants'
import { useI18n } from '@shared/i18n'

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
  const { t, locale } = useI18n()
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
    {
      key: 'user',
      title: t('adminLogs.columns.userId'),
      sortable: true,
      align: 'center',
      sorter: (a,b)=> a.UserID - b.UserID,
      render: (row)=> (
        <UserTooltip
          userId={row.UserID}
          triggerLabel={`UID ${row.UserID}`}
          fallbackLabel={`UID ${row.UserID}`}
        />
      )
    },
    { key: 'action', title: t('adminLogs.columns.action'), align: 'left', render: (row)=> row.Action },
    { key: 'resource', title: t('adminLogs.columns.resource'), align: 'left', render: (row)=> (row.Data?.slice(0,50) || '') },
    { key: 'ip', title: t('adminLogs.columns.ipAddress'), align: 'center', render: (row)=> row.IP },
    { key: 'created_at', title: t('adminLogs.columns.time'), sortable: true, render: (row)=> new Date(row.CreatedAt).toLocaleString(locale) },
  ]

  return (
    <AdminLayout title={t('adminLogs.layoutTitle')} actions={
      <PButton variant="ghost" size="sm" leftIcon={<ArrowPathIcon className="h-4 w-4" />} onClick={load} disabled={loading}>
        {t('adminLogs.actions.refresh')}
      </PButton>
    }>
      <div className="space-y-6">

        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('adminLogs.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('adminLogs.description')}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">{t('adminLogs.sectionTitle')}</h3>
          <div className="relative w-72">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <PInput placeholder={t('adminLogs.searchPlaceholder')} value={keyword} onChange={(e)=>setKeyword(e.target.value)} className="pl-9" />
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
