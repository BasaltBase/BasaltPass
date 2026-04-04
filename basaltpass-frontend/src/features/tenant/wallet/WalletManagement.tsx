import { useEffect, useMemo, useState } from 'react'
import { CurrencyDollarIcon, EyeIcon, PencilIcon, UserGroupIcon, UsersIcon, WalletIcon } from '@heroicons/react/24/outline'
import TenantLayout from '@features/tenant/components/TenantLayout'
import { uiAlert } from '@contexts/DialogContext'
import { PBadge, PButton, PCard, PInput, PSelect, PSkeleton, PTextarea } from '@ui'
import { tenantWalletApi, type TenantAdjustOwnerWalletRequest, type TenantCurrency, type TenantWallet, type TenantWalletTransaction } from '@api/tenant/wallet'

type OwnerType = 'user' | 'team'

export default function TenantWalletManagement() {
  const [wallets, setWallets] = useState<TenantWallet[]>([])
  const [currencies, setCurrencies] = useState<TenantCurrency[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [quickAdjustMode, setQuickAdjustMode] = useState<'delta' | 'target'>('delta')
  const [transactionsModalVisible, setTransactionsModalVisible] = useState(false)
  const [transactionWallet, setTransactionWallet] = useState<TenantWallet | null>(null)
  const [transactionLoading, setTransactionLoading] = useState(false)
  const [transactions, setTransactions] = useState<TenantWalletTransaction[]>([])
  const [quickAdjustForm, setQuickAdjustForm] = useState<TenantAdjustOwnerWalletRequest & { owner_type: OwnerType; owner_id?: number }>({
    owner_type: 'user',
    owner_id: undefined,
    currency_code: '',
    amount: 0,
    reason: '',
    create_if_missing: true,
  })
  const [filters, setFilters] = useState({
    keyword: '',
    currency_code: '',
  })

  const loadData = async () => {
    try {
      setLoading(true)
      const [walletResponse, currencyResponse] = await Promise.all([
        tenantWalletApi.getWallets({ page: 1, page_size: 50, currency_code: filters.currency_code || undefined }),
        tenantWalletApi.getCurrencies(),
      ])
      setWallets(walletResponse.data || [])
      setCurrencies(currencyResponse.data || [])
    } catch (error) {
      console.error('加载租户钱包数据失败:', error)
      setWallets([])
      setCurrencies([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [filters.currency_code])

  const filteredWallets = useMemo(() => {
    if (!filters.keyword.trim()) return wallets
    const keyword = filters.keyword.trim().toLowerCase()
    return wallets.filter(wallet =>
      String(wallet.id).includes(keyword) ||
      String(wallet.user_id || '').includes(keyword) ||
      String(wallet.team_id || '').includes(keyword) ||
      String(wallet.currency?.code || '').toLowerCase().includes(keyword) ||
      String(wallet.user?.email || '').toLowerCase().includes(keyword) ||
      String(wallet.team?.name || '').toLowerCase().includes(keyword)
    )
  }, [filters.keyword, wallets])

  const resetQuickAdjustForm = () => {
    setQuickAdjustForm({
      owner_type: 'user',
      owner_id: undefined,
      currency_code: '',
      amount: 0,
      reason: '',
      create_if_missing: true,
    })
  }

  const convertToSmallestUnit = (amount: number, decimalPlaces: number) => {
    const multiplier = Math.pow(10, decimalPlaces)
    return Math.trunc(amount * multiplier)
  }

  const convertFromSmallestUnit = (amount: number, decimalPlaces: number) => {
    return amount / Math.pow(10, decimalPlaces)
  }

  const formatBalance = (balance: number, currency?: TenantCurrency) => {
    if (!currency) return String(balance)
    const actualBalance = balance / Math.pow(10, currency.decimal_places)
    return `${actualBalance.toFixed(currency.decimal_places)} ${currency.symbol}`
  }

  const handleQuickAdjust = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!quickAdjustForm.owner_id) {
      uiAlert('请输入用户或团队 ID')
      return
    }
    if (!quickAdjustForm.currency_code) {
      uiAlert('请选择货币类型')
      return
    }
    if (!quickAdjustForm.reason.trim()) {
      uiAlert('请输入调整原因')
      return
    }
    if (!quickAdjustForm.amount) {
      uiAlert('调整金额不能为 0')
      return
    }

    try {
      setSubmitting(true)
      let requestAmount = quickAdjustForm.amount
      if (quickAdjustMode === 'target') {
        const walletResponse = quickAdjustForm.owner_type === 'user'
          ? await tenantWalletApi.getUserWallets(quickAdjustForm.owner_id)
          : await tenantWalletApi.getTeamWallets(quickAdjustForm.owner_id)
        const existingWallet = (walletResponse.data || []).find(wallet => wallet.currency?.code === quickAdjustForm.currency_code) || null
        const currencyMeta = existingWallet?.currency || currencies.find(currency => currency.code === quickAdjustForm.currency_code)
        if (!currencyMeta) {
          uiAlert('未找到对应货币配置')
          return
        }
        const targetSmallest = convertToSmallestUnit(quickAdjustForm.amount, currencyMeta.decimal_places)
        const currentSmallest = existingWallet?.balance || 0
        const deltaSmallest = targetSmallest - currentSmallest
        requestAmount = convertFromSmallestUnit(deltaSmallest, currencyMeta.decimal_places)
        if (!requestAmount) {
          uiAlert('目标余额与当前余额相同，无需调整')
          return
        }
      }

      if (quickAdjustForm.owner_type === 'user') {
        await tenantWalletApi.adjustUserWallet(quickAdjustForm.owner_id, { ...quickAdjustForm, amount: requestAmount })
      } else {
        await tenantWalletApi.adjustTeamWallet(quickAdjustForm.owner_id, { ...quickAdjustForm, amount: requestAmount })
      }
      uiAlert('余额调整成功')
      setQuickAdjustMode('delta')
      resetQuickAdjustForm()
      loadData()
    } catch (error: any) {
      uiAlert(error.response?.data?.error || '调整余额失败')
    } finally {
      setSubmitting(false)
    }
  }

  const openTransactionsModal = async (wallet: TenantWallet) => {
    setTransactionWallet(wallet)
    setTransactionsModalVisible(true)
    setTransactionLoading(true)
    try {
      const response = await tenantWalletApi.getWalletTransactions(wallet.id, { page: 1, page_size: 50 })
      setTransactions(response.data || [])
    } catch (error: any) {
      uiAlert(error.response?.data?.error || '加载交易记录失败')
      setTransactions([])
    } finally {
      setTransactionLoading(false)
    }
  }

  return (
    <TenantLayout title="钱包管理">
      <div className="space-y-6">
        <PCard variant="bordered">
          <div className="flex items-start justify-between gap-6 p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600 text-white">
                <WalletIcon className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">租户钱包管理</h1>
                <p className="mt-1 text-sm text-gray-500">按用户或团队快速调整余额，并查看当前钱包状态。</p>
              </div>
            </div>
            <PButton variant="secondary" onClick={loadData} disabled={loading}>刷新</PButton>
          </div>
        </PCard>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <PCard variant="bordered">
            <div className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <PencilIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">直接调余额</h2>
                  <p className="text-sm text-gray-500">无需先知道 wallet ID</p>
                </div>
              </div>

              <form onSubmit={handleQuickAdjust} className="space-y-4">
                <PSelect
                  label="调整方式"
                  value={quickAdjustMode}
                  onChange={(e) => setQuickAdjustMode((e.target as HTMLSelectElement).value as 'delta' | 'target')}
                  variant="rounded"
                >
                  <option value="delta">按增减额调整</option>
                  <option value="target">设置目标余额</option>
                </PSelect>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <PSelect
                    label="对象类型"
                    value={quickAdjustForm.owner_type}
                    onChange={(e) => setQuickAdjustForm({ ...quickAdjustForm, owner_type: (e.target as HTMLSelectElement).value as OwnerType })}
                    variant="rounded"
                  >
                    <option value="user">用户</option>
                    <option value="team">团队</option>
                  </PSelect>
                  <PInput
                    type="number"
                    label={`${quickAdjustForm.owner_type === 'user' ? '用户' : '团队'} ID`}
                    value={quickAdjustForm.owner_id || ''}
                    onChange={(e) => setQuickAdjustForm({ ...quickAdjustForm, owner_id: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                    variant="rounded"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <PSelect
                    label="货币类型"
                    value={quickAdjustForm.currency_code}
                    onChange={(e) => setQuickAdjustForm({ ...quickAdjustForm, currency_code: (e.target as HTMLSelectElement).value })}
                    variant="rounded"
                  >
                    <option value="">选择货币</option>
                    {currencies.map(currency => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name}
                      </option>
                    ))}
                  </PSelect>
                  <PInput
                    type="number"
                    step="0.01"
                    label={quickAdjustMode === 'delta' ? '调整金额' : '目标余额'}
                    value={quickAdjustForm.amount}
                    onChange={(e) => setQuickAdjustForm({ ...quickAdjustForm, amount: parseFloat(e.target.value) || 0 })}
                    placeholder={quickAdjustMode === 'delta' ? '正数增加，负数减少' : '设置为该余额'}
                    variant="rounded"
                  />
                </div>

                <PTextarea
                  label="调整原因"
                  value={quickAdjustForm.reason}
                  onChange={(e) => setQuickAdjustForm({ ...quickAdjustForm, reason: e.target.value })}
                  rows={3}
                  required
                />

                <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={quickAdjustForm.create_if_missing !== false}
                    onChange={(e) => setQuickAdjustForm({ ...quickAdjustForm, create_if_missing: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  钱包不存在时自动创建
                </label>

                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  {quickAdjustMode === 'delta'
                    ? '当前模式下，正数表示增加余额，负数表示减少余额。'
                    : '当前模式下，系统会自动计算从当前余额到目标余额所需的调整额。'}
                </div>

                <div className="flex justify-end gap-3">
                  <PButton type="button" variant="secondary" onClick={resetQuickAdjustForm}>重置</PButton>
                  <PButton type="submit" variant="primary" disabled={submitting} loading={submitting}>确认调整</PButton>
                </div>
              </form>
            </div>
          </PCard>

          <PCard variant="bordered">
            <div className="border-b border-gray-200 p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">钱包列表</h2>
                  <p className="text-sm text-gray-500">展示最近加载到的用户和团队钱包</p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <PInput
                    value={filters.keyword}
                    onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                    placeholder="搜索 ID / 用户 / 团队 / 货币"
                    variant="rounded"
                  />
                  <PSelect
                    value={filters.currency_code}
                    onChange={(e) => setFilters({ ...filters, currency_code: (e.target as HTMLSelectElement).value })}
                    variant="rounded"
                  >
                    <option value="">全部货币</option>
                    {currencies.map(currency => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code}
                      </option>
                    ))}
                  </PSelect>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-6">
                <PSkeleton.List items={3} />
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredWallets.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-500">暂无钱包数据</div>
                ) : (
                  filteredWallets.map(wallet => (
                    <div key={wallet.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                            <WalletIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">钱包 #{wallet.id}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              {wallet.user_id ? (
                                <PBadge variant="info"><UsersIcon className="mr-1 h-3 w-3" />用户 #{wallet.user_id}</PBadge>
                              ) : null}
                              {wallet.team_id ? (
                                <PBadge variant="success"><UserGroupIcon className="mr-1 h-3 w-3" />团队 #{wallet.team_id}</PBadge>
                              ) : null}
                              <PBadge variant={wallet.status === 'active' ? 'success' : 'error'}>
                                {wallet.status === 'active' ? '活跃' : '冻结'}
                              </PBadge>
                            </div>
                          </div>
                        </div>
                      </div>

                    <div className="flex flex-col items-start gap-1 text-left lg:items-end">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-700">{wallet.currency.code}</span>
                        <span>{wallet.currency.name}</span>
                      </div>
                      <div className="text-lg font-semibold text-gray-900">{formatBalance(wallet.balance, wallet.currency)}</div>
                      <PButton variant="secondary" size="sm" onClick={() => openTransactionsModal(wallet)}>
                        <EyeIcon className="mr-1 h-4 w-4" />
                        交易记录
                      </PButton>
                    </div>
                  </div>
                ))
                )}
              </div>
            )}
          </PCard>
        </div>
      </div>

      {transactionsModalVisible && transactionWallet ? (
        <div className="fixed inset-0 !m-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 backdrop-blur-sm">
          <PCard variant="elevated" className="relative mx-auto w-full max-w-4xl rounded-2xl border-0">
            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">钱包 #{transactionWallet.id} 交易记录</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {transactionWallet.currency.code} · 当前余额 {formatBalance(transactionWallet.balance, transactionWallet.currency)}
                  </p>
                </div>
                <PButton
                  variant="secondary"
                  onClick={() => {
                    setTransactionsModalVisible(false)
                    setTransactionWallet(null)
                    setTransactions([])
                  }}
                >
                  关闭
                </PButton>
              </div>

              {transactionLoading ? (
                <PSkeleton.List items={3} />
              ) : transactions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 px-6 py-10 text-center text-sm text-gray-500">
                  暂无交易记录
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">类型</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">金额</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">状态</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">备注</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">时间</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {transactions.map(tx => (
                        <tr key={tx.id}>
                          <td className="px-4 py-3 text-sm text-gray-700">{tx.type}</td>
                          <td className={`px-4 py-3 text-sm font-semibold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatBalance(tx.amount, transactionWallet.currency)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{tx.status}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{tx.reference || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{new Date(tx.created_at).toLocaleString('zh-CN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </PCard>
        </div>
      ) : null}
    </TenantLayout>
  )
}
