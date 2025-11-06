import { useEffect, useMemo, useState } from 'react'
import client from '@api/client'
import { Link } from 'react-router-dom'
import { ArrowPathIcon, ChevronRightIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import AdminLayout from '@components/AdminLayout'
import PTable, { PTableColumn } from '@components/PTable'
import PInput from '@components/PInput'
import PButton from '@components/PButton'

interface WalletTx {
  ID: number
  WalletID: number
  Type: string
  Amount: number
  Status: string
  CreatedAt: string
  Wallet: {
    ID: number
    UserID?: number
    TeamID?: number
    Currency: string
    Balance: number
  }
}

export default function Wallets() {
  const [txs, setTxs] = useState<WalletTx[]>([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const r = await client.get<WalletTx[]>('/api/v1/admin/wallets')
      setTxs(r.data)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (!keyword) return txs
    const kw = keyword.toLowerCase().trim()
    return txs.filter(t =>
      String(t.ID).includes(kw) ||
      String(t.Wallet?.UserID ?? '').includes(kw) ||
      String(t.Wallet?.Currency ?? '').toLowerCase().includes(kw)
    )
  }, [txs, keyword])

  const columns: PTableColumn<WalletTx>[] = [
    { key: 'id', title: 'ID', dataIndex: 'ID', sortable: true, align: 'center' },
    {
      key: 'user',
      title: '用户ID',
      sortable: true,
      align: 'center',
      sorter: (a, b) => (a.Wallet?.UserID || 0) - (b.Wallet?.UserID || 0),
      render: (row) => row.Wallet?.UserID ?? '-'
    },
    {
      key: 'amount',
      title: '余额',
      sortable: true,
      align: 'right',
      sorter: (a, b) => a.Amount - b.Amount,
      render: (row) => (row.Amount / 100).toFixed(2)
    },
    {
      key: 'currency',
      title: '货币',
      sortable: true,
      align: 'center',
      render: (row) => row.Wallet?.Currency || '-'
    },
  ]

  return (
    <AdminLayout title="钱包管理" actions={
      <PButton variant="ghost" size="sm" leftIcon={<ArrowPathIcon className="h-4 w-4" />} onClick={load} disabled={loading}>
        刷新
      </PButton>
    }>
      <div className="space-y-6">
        {/* 面包屑导航 */}
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-4">
            <li>
              <Link to="/dashboard" className="text-gray-400 hover:text-gray-500">
                仪表板
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <ChevronRightIcon className="flex-shrink-0 h-5 w-5 text-gray-400" />
                <Link to="/admin/subscriptions" className="ml-4 text-gray-400 hover:text-gray-500">
                  订阅管理
                </Link>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <ChevronRightIcon className="flex-shrink-0 h-5 w-5 text-gray-400" />
                <span className="ml-4 text-sm font-medium text-gray-500">钱包管理</span>
              </div>
            </li>
          </ol>
        </nav>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">钱包管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            查看和管理用户钱包信息
          </p>
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">钱包列表</h3>
          <div className="relative w-64">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <PInput placeholder="搜索 ID / 用户ID / 货币" value={keyword} onChange={(e)=>setKeyword(e.target.value)} className="pl-9" />
          </div>
        </div>

        <PTable
          columns={columns}
          data={filtered}
          rowKey={(row) => row.ID}
          loading={loading}
          emptyText={keyword ? '无匹配数据' : '暂无数据'}
          defaultSort={{ key: 'id', order: 'desc' }}
        />
      </div>
    </AdminLayout>
  )
} 