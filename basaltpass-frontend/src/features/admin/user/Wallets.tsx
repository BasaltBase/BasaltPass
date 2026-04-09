import { useEffect, useMemo, useState } from 'react'
import { adminWalletApi, type Wallet } from '@api/admin/wallet'
import { Link } from 'react-router-dom'
import { ArrowPathIcon, ChevronRightIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import AdminLayout from '@features/admin/components/AdminLayout'
import PTable, { PTableColumn } from '@ui/PTable'
import PInput from '@ui/PInput'
import PButton from '@ui/PButton'
import UserTooltip from '@ui/UserTooltip'
import { ROUTES } from '@constants'
import { useI18n } from '@shared/i18n'

export default function Wallets() {
  const { t } = useI18n()
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const response = await adminWalletApi.getWallets()
      if (response && response.data && Array.isArray(response.data)) {
        setWallets(response.data)
      } else {
        console.warn(t('adminUserWallets.logs.invalidApiFormat'), response)
        setWallets([])
      }
    } catch (error) {
      console.error(t('adminUserWallets.logs.loadFailed'), error)
      setWallets([])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (!Array.isArray(wallets)) return []
    if (!keyword) return wallets
    const kw = keyword.toLowerCase().trim()
    return wallets.filter(wallet =>
      String(wallet.id).includes(kw) ||
      String(wallet.user_id ?? '').includes(kw) ||
      String(wallet.currency?.code ?? '').toLowerCase().includes(kw)
    )
  }, [wallets, keyword])

  const columns: PTableColumn<Wallet>[] = [
    { key: 'id', title: 'ID', dataIndex: 'id', sortable: true, align: 'center' },
    {
      key: 'user',
      title: t('adminUserWallets.columns.userId'),
      sortable: true,
      align: 'center',
      sorter: (a, b) => (a.user_id || 0) - (b.user_id || 0),
      render: (row) => row.user_id ? (
        <UserTooltip
          userId={row.user_id}
          triggerLabel={`UID ${row.user_id}`}
          fallbackLabel={`UID ${row.user_id}`}
        />
      ) : '-'
    },
    {
      key: 'balance',
      title: t('adminUserWallets.columns.balance'),
      sortable: true,
      align: 'right',
      sorter: (a, b) => a.balance - b.balance,
      render: (row) => (row.balance / 100).toFixed(2)
    },
    {
      key: 'currency',
      title: t('adminUserWallets.columns.currency'),
      sortable: true,
      align: 'center',
      render: (row) => row.currency?.code || '-'
    },
    {
      key: 'status',
      title: t('adminUserWallets.columns.status'),
      sortable: true,
      align: 'center',
      render: (row) => row.status === 'active' ? t('adminUserWallets.status.active') : t('adminUserWallets.status.frozen')
    }
  ]

  return (
    <AdminLayout title={t('adminUserWallets.layoutTitle')} actions={
      <PButton variant="ghost" size="sm" leftIcon={<ArrowPathIcon className="h-4 w-4" />} onClick={load} disabled={loading}>
        {t('adminUserWallets.actions.refresh')}
      </PButton>
    }>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('adminUserWallets.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('adminUserWallets.description')}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">{t('adminUserWallets.listTitle')}</h3>
          <div className="relative w-64">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <PInput placeholder={t('adminUserWallets.searchPlaceholder')} value={keyword} onChange={(e)=>setKeyword(e.target.value)} className="pl-9" />
          </div>
        </div>

        <PTable
          columns={columns}
          data={filtered}
          rowKey={(row) => row.id}
          loading={loading}
          emptyText={keyword ? t('adminUserWallets.empty.filtered') : t('adminUserWallets.empty.default')}
          defaultSort={{ key: 'id', order: 'desc' }}
        />
      </div>
    </AdminLayout>
  )
} 
