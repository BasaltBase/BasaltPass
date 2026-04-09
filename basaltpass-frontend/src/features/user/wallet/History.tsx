import { useEffect, useState, type ChangeEvent } from 'react'
import { history } from '@api/user/wallet'
import { Link } from 'react-router-dom'
import Layout from '@features/user/components/Layout'
import { PInput, PSelect, PSkeleton, PBadge, PPageHeader, PEmptyState } from '@ui'
import useDebounce from '@hooks/useDebounce'
import { ROUTES } from '@constants'
import { useConfig } from '@contexts/ConfigContext'
import { useI18n } from '@shared/i18n'
import {
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  FunnelIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'

interface Tx {
  ID: number
  Type: string
  Amount: number
  Status: string
  CreatedAt: string
  UpdatedAt: string
  DeletedAt: string | null
  WalletID: number
  Reference: string
}

type TxDirection = 'in' | 'out'

const detectDirection = (tx: Tx): TxDirection => {
  const type = (tx.Type || '').toLowerCase()
  const inKeywords = ['recharge', 'deposit', 'increase', 'refund', 'income']
  const outKeywords = ['withdraw', 'decrease', 'debit', 'consume', 'payment', 'expense']

  if (inKeywords.some((keyword) => type.includes(keyword))) {
    return 'in'
  }
  if (outKeywords.some((keyword) => type.includes(keyword))) {
    return 'out'
  }
  return tx.Amount >= 0 ? 'in' : 'out'
}

const formatAmount = (tx: Tx, direction: TxDirection) => {
  const absAmount = Math.abs(tx.Amount)
  const divisor = tx.Reference?.startsWith('apicred:') ? 1_000_000 : 100
  const sign = direction === 'in' ? '+' : '-'
  return `${sign}¥${(absAmount / divisor).toFixed(2)}`
}

export default function History() {
  const { t, locale } = useI18n()
  const { walletRechargeWithdrawEnabled } = useConfig()
  const [txs, setTxs] = useState<Tx[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 200)

  const getTypeText = (type: string) => {
    const normalized = (type || '').toLowerCase()
    if (normalized === 'recharge') return t('pages.walletHistory.types.recharge')
    if (normalized === 'withdraw') return t('pages.walletHistory.types.withdraw')
    if (normalized === 'admin_deposit') return t('pages.walletHistory.types.adminDeposit')
    if (normalized === 's2s_wallet_increase') return t('pages.walletHistory.types.apiIncrease')
    if (normalized === 's2s_wallet_decrease') return t('pages.walletHistory.types.apiDecrease')
    return type || t('pages.walletHistory.common.unknown')
  }

  const getReferenceText = (reference: string) => {
    if (!reference) return ''
    if (reference.startsWith('apicred:recharge_code:')) return t('pages.walletHistory.references.apicredRechargeCode')
    if (reference.startsWith('apicred:usage_pending:')) return t('pages.walletHistory.references.apicredUsagePending')
    if (reference.startsWith('apicred:usage_settle:')) return t('pages.walletHistory.references.apicredUsageSettle')
    return t('pages.walletHistory.references.generic', { reference })
  }

  useEffect(() => {
    history(undefined, 200).then((res) => {
      setTxs(res.data || [])
      setIsLoading(false)
    }).catch(() => {
      setTxs([
        {
          ID: 1,
          Type: 'recharge',
          Amount: 50000,
          Status: 'success',
          CreatedAt: '2024-01-15T14:30:00Z',
          UpdatedAt: '2024-01-15T14:30:00Z',
          DeletedAt: null,
          WalletID: 1,
          Reference: 'mock'
        },
        {
          ID: 2,
          Type: 'withdraw',
          Amount: 20000,
          Status: 'pending',
          CreatedAt: '2024-01-14T09:15:00Z',
          UpdatedAt: '2024-01-14T09:15:00Z',
          DeletedAt: null,
          WalletID: 1,
          Reference: 'mock'
        },
        {
          ID: 3,
          Type: 'recharge',
          Amount: 100000,
          Status: 'success',
          CreatedAt: '2024-01-13T16:45:00Z',
          UpdatedAt: '2024-01-13T16:45:00Z',
          DeletedAt: null,
          WalletID: 1,
          Reference: 'mock'
        }
      ])
      setIsLoading(false)
    })
  }, [])

  const filteredTxs = txs.filter(tx => {
    const direction = detectDirection(tx)
    const matchesFilter = filter === 'all' || (filter === 'in' && direction === 'in') || (filter === 'out' && direction === 'out')
    const matchesSearch = debouncedSearchTerm === '' ||
      tx.ID.toString().includes(debouncedSearchTerm) ||
      (tx.Status && tx.Status.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
      (tx.Reference && tx.Reference.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
    return matchesFilter && matchesSearch
  })

  const getStatusText = (status: string) => {
    if (!status) return t('pages.walletHistory.status.unknown')

    switch (status.toLowerCase()) {
      case 'success':
      case 'completed':
        return t('pages.walletHistory.status.completed')
      case 'pending':
        return t('pages.walletHistory.status.processing')
      case 'failed':
        return t('pages.walletHistory.status.failed')
      default:
        return status
    }
  }

  const getTypeIcon = (direction: TxDirection) => {
    return direction === 'in' ? (
      <ArrowUpIcon className="h-4 w-4 text-green-600" />
    ) : (
      <ArrowDownIcon className="h-4 w-4 text-red-600" />
    )
  }

  const getTypeColor = (direction: TxDirection) => {
    return direction === 'in' ? 'text-green-600' : 'text-red-600'
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="py-6">
          <PSkeleton.Management />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <PPageHeader
          title={t('pages.walletHistory.header.title')}
          description={t('pages.walletHistory.header.description')}
          backTo={ROUTES.user.wallet}
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DocumentTextIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{t('pages.walletHistory.stats.totalTransactions')}</dt>
                    <dd className="text-lg font-medium text-gray-900">{txs.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ArrowUpIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{t('pages.walletHistory.stats.inCount')}</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {txs.filter(tx => detectDirection(tx) === 'in').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ArrowDownIcon className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{t('pages.walletHistory.stats.outCount')}</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {txs.filter(tx => detectDirection(tx) === 'out').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{t('pages.walletHistory.stats.processing')}</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {txs.filter(tx => tx.Status && tx.Status.toLowerCase() === 'pending').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <FunnelIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-700">{t('pages.walletHistory.filter.label')}</span>
                </div>
                <PSelect
                  value={filter}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilter(e.target.value)}
                  size="sm"
                  fullWidth={false}
                  className="min-w-32"
                >
                  <option value="all">{t('pages.walletHistory.filter.all')}</option>
                  <option value="in">{t('pages.walletHistory.filter.in')}</option>
                  <option value="out">{t('pages.walletHistory.filter.out')}</option>
                </PSelect>
              </div>
              <div className="flex-1 max-w-xs">
                <PInput
                  type="text"
                  placeholder={t('pages.walletHistory.filter.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              {t('pages.walletHistory.list.title', { count: filteredTxs.length })}
            </h3>

            {filteredTxs.length === 0 ? (
              <PEmptyState
                icon={<DocumentTextIcon className="h-12 w-12" />}
                title={t('pages.walletHistory.empty.title')}
                description={filter !== 'all' ? t('pages.walletHistory.empty.filtered') : t('pages.walletHistory.empty.default')}
              />
            ) : (
              <div className="overflow-hidden">
                <div className="flow-root">
                  <ul className="-my-5 divide-y divide-gray-200">
                    {filteredTxs.map((tx) => {
                      const direction = detectDirection(tx)
                      return (
                        <li key={tx.ID} className="py-5">
                          <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0">
                              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${direction === 'in' ? 'bg-green-100' : 'bg-red-100'}`}>
                                {getTypeIcon(direction)}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {getTypeText(tx.Type)} #{tx.ID}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {new Date(tx.CreatedAt).toLocaleString(locale)}
                                  </p>
                                  {tx.Reference ? (
                                    <p className="text-xs text-gray-500 mt-1 break-all">{getReferenceText(tx.Reference)}</p>
                                  ) : null}
                                </div>
                                <div className="flex items-center space-x-4">
                                  <div className="text-right">
                                    <p className={`text-sm font-medium ${getTypeColor(direction)}`}>
                                      {formatAmount(tx, direction)}
                                    </p>
                                    <PBadge variant={
                                      (() => {
                                        const s = (tx.Status || '').toLowerCase()
                                        if (s === 'success' || s === 'completed') return 'success' as const
                                        if (s === 'pending') return 'warning' as const
                                        if (s === 'failed') return 'error' as const
                                        return 'default' as const
                                      })()
                                    }>
                                      {getStatusText(tx.Status)}
                                    </PBadge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              {t('pages.walletHistory.quickActions.title')}
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {walletRechargeWithdrawEnabled ? (
                <Link
                  to={ROUTES.user.walletRecharge}
                  className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-green-400 hover:bg-green-50 focus-within:ring-2 focus-within:ring-green-500 focus-within:ring-offset-2 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <ArrowUpIcon className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="absolute inset-0" aria-hidden="true" />
                    <p className="text-sm font-medium text-gray-900">{t('pages.walletHistory.quickActions.recharge')}</p>
                    <p className="text-sm text-gray-500">{t('pages.walletHistory.quickActions.rechargeDesc')}</p>
                  </div>
                </Link>
              ) : (
                <div
                  className="relative rounded-lg border border-gray-200 bg-gray-50 px-6 py-5 shadow-sm flex items-center space-x-3 opacity-60 cursor-not-allowed grayscale"
                  aria-disabled
                  title={t('pages.wallet.quickActions.rechargeDisabledTitle')}
                >
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 bg-gray-200 rounded-lg flex items-center justify-center">
                      <ArrowUpIcon className="h-6 w-6 text-gray-400" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-500">{t('pages.walletHistory.quickActions.recharge')}</p>
                    <p className="text-sm text-gray-400">{t('pages.wallet.quickActions.notAvailable')}</p>
                  </div>
                </div>
              )}

              {walletRechargeWithdrawEnabled ? (
                <Link
                  to={ROUTES.user.walletWithdraw}
                  className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-red-400 hover:bg-red-50 focus-within:ring-2 focus-within:ring-red-500 focus-within:ring-offset-2 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <ArrowDownIcon className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="absolute inset-0" aria-hidden="true" />
                    <p className="text-sm font-medium text-gray-900">{t('pages.walletHistory.quickActions.withdraw')}</p>
                    <p className="text-sm text-gray-500">{t('pages.walletHistory.quickActions.withdrawDesc')}</p>
                  </div>
                </Link>
              ) : (
                <div
                  className="relative rounded-lg border border-gray-200 bg-gray-50 px-6 py-5 shadow-sm flex items-center space-x-3 opacity-60 cursor-not-allowed grayscale"
                  aria-disabled
                  title={t('pages.wallet.quickActions.withdrawDisabledTitle')}
                >
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 bg-gray-200 rounded-lg flex items-center justify-center">
                      <ArrowDownIcon className="h-6 w-6 text-gray-400" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-500">{t('pages.walletHistory.quickActions.withdraw')}</p>
                    <p className="text-sm text-gray-400">{t('pages.wallet.quickActions.notAvailable')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
