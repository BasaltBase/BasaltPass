import { useEffect, useMemo, useState } from 'react'
import { CurrencyDollarIcon, EyeIcon, PencilIcon, UserGroupIcon, UsersIcon, WalletIcon } from '@heroicons/react/24/outline'
import TenantLayout from '@features/tenant/components/TenantLayout'
import { uiAlert } from '@contexts/DialogContext'
import { PBadge, PButton, PCard, PInput, PSelect, PSkeleton, PTextarea } from '@ui'
import { tenantWalletApi, type TenantAdjustOwnerWalletRequest, type TenantCurrency, type TenantWallet, type TenantWalletTransaction } from '@api/tenant/wallet'
import { tenantGiftCardApi, type GiftCardItem } from '@api/tenant/giftCard'
import { useI18n } from '@shared/i18n'

type OwnerType = 'user' | 'team'

export default function TenantWalletManagement() {
  const { t, locale } = useI18n()
  const [wallets, setWallets] = useState<TenantWallet[]>([])
  const [currencies, setCurrencies] = useState<TenantCurrency[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [quickAdjustMode, setQuickAdjustMode] = useState<'delta' | 'target'>('delta')
  const [transactionsModalVisible, setTransactionsModalVisible] = useState(false)
  const [transactionWallet, setTransactionWallet] = useState<TenantWallet | null>(null)
  const [transactionLoading, setTransactionLoading] = useState(false)
  const [transactions, setTransactions] = useState<TenantWalletTransaction[]>([])
  const [giftCards, setGiftCards] = useState<GiftCardItem[]>([])
  const [giftCardLoading, setGiftCardLoading] = useState(false)
  const [giftCardSubmitting, setGiftCardSubmitting] = useState(false)
  const [giftCardForm, setGiftCardForm] = useState({
    currency_code: '',
    amount: 0,
    quantity: 10,
    expires_at: '',
    note: '',
  })
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
      await loadGiftCards()
    } catch (error) {
      console.error(t('tenantWalletManagement.logs.loadDataFailed'), error)
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

  const formatGiftCardAmount = (amount: number, currencyCode?: string) => {
    if (!currencyCode) return String(amount)
    const currency = currencies.find(item => item.code === currencyCode)
    if (!currency) return String(amount)
    const actualAmount = amount / Math.pow(10, currency.decimal_places)
    return `${actualAmount.toFixed(currency.decimal_places)} ${currency.symbol}`
  }

  const loadGiftCards = async () => {
    try {
      setGiftCardLoading(true)
      const response = await tenantGiftCardApi.list({ page: 1, page_size: 50 })
      setGiftCards(response.data || [])
    } catch (error) {
      console.error(t('tenantWalletManagement.logs.loadGiftCardsFailed'), error)
      setGiftCards([])
    } finally {
      setGiftCardLoading(false)
    }
  }

  const handleCreateGiftCards = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!giftCardForm.currency_code) {
      uiAlert(t('tenantWalletManagement.alerts.selectGiftCardCurrency'))
      return
    }
    if (giftCardForm.amount <= 0) {
      uiAlert(t('tenantWalletManagement.alerts.invalidAmount'))
      return
    }
    if (giftCardForm.quantity <= 0) {
      uiAlert(t('tenantWalletManagement.alerts.invalidQuantity'))
      return
    }

    try {
      setGiftCardSubmitting(true)
      await tenantGiftCardApi.createBatch({
        currency_code: giftCardForm.currency_code,
        amount: giftCardForm.amount,
        quantity: giftCardForm.quantity,
        expires_at: giftCardForm.expires_at ? new Date(giftCardForm.expires_at).toISOString() : undefined,
        note: giftCardForm.note || undefined,
      })
      uiAlert(t('tenantWalletManagement.alerts.giftCardCreateSuccess'))
      setGiftCardForm({ currency_code: '', amount: 0, quantity: 10, expires_at: '', note: '' })
      await loadGiftCards()
    } catch (error: any) {
      uiAlert(error.response?.data?.error || t('tenantWalletManagement.alerts.giftCardCreateFailed'))
    } finally {
      setGiftCardSubmitting(false)
    }
  }

  const handleInvalidateGiftCard = async (id: number) => {
    try {
      await tenantGiftCardApi.invalidate(id)
      uiAlert(t('tenantWalletManagement.alerts.giftCardInvalidated'))
      await loadGiftCards()
    } catch (error: any) {
      uiAlert(error.response?.data?.error || t('tenantWalletManagement.alerts.giftCardInvalidateFailed'))
    }
  }

  const handleQuickAdjust = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!quickAdjustForm.owner_id) {
      uiAlert(t('tenantWalletManagement.alerts.enterOwnerId'))
      return
    }
    if (!quickAdjustForm.currency_code) {
      uiAlert(t('tenantWalletManagement.alerts.selectCurrency'))
      return
    }
    if (!quickAdjustForm.reason.trim()) {
      uiAlert(t('tenantWalletManagement.alerts.enterReason'))
      return
    }
    if (!quickAdjustForm.amount) {
      uiAlert(t('tenantWalletManagement.alerts.amountCannotBeZero'))
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
          uiAlert(t('tenantWalletManagement.alerts.currencyConfigMissing'))
          return
        }
        const targetSmallest = convertToSmallestUnit(quickAdjustForm.amount, currencyMeta.decimal_places)
        const currentSmallest = existingWallet?.balance || 0
        const deltaSmallest = targetSmallest - currentSmallest
        requestAmount = convertFromSmallestUnit(deltaSmallest, currencyMeta.decimal_places)
        if (!requestAmount) {
          uiAlert(t('tenantWalletManagement.alerts.noAdjustmentNeeded'))
          return
        }
      }

      if (quickAdjustForm.owner_type === 'user') {
        await tenantWalletApi.adjustUserWallet(quickAdjustForm.owner_id, { ...quickAdjustForm, amount: requestAmount })
      } else {
        await tenantWalletApi.adjustTeamWallet(quickAdjustForm.owner_id, { ...quickAdjustForm, amount: requestAmount })
      }
      uiAlert(t('tenantWalletManagement.alerts.adjustSuccess'))
      setQuickAdjustMode('delta')
      resetQuickAdjustForm()
      loadData()
    } catch (error: any) {
      uiAlert(error.response?.data?.error || t('tenantWalletManagement.alerts.adjustFailed'))
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
      uiAlert(error.response?.data?.error || t('tenantWalletManagement.alerts.loadTransactionsFailed'))
      setTransactions([])
    } finally {
      setTransactionLoading(false)
    }
  }

  return (
    <TenantLayout title={t('tenantWalletManagement.layoutTitle')}>
      <div className="space-y-6">
        <PCard variant="bordered">
          <div className="flex items-start justify-between gap-6 p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600 text-white">
                <WalletIcon className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t('tenantWalletManagement.header.title')}</h1>
                <p className="mt-1 text-sm text-gray-500">{t('tenantWalletManagement.header.description')}</p>
              </div>
            </div>
            <PButton variant="secondary" onClick={loadData} disabled={loading}>{t('tenantWalletManagement.actions.refresh')}</PButton>
          </div>
        </PCard>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="space-y-6">
            <PCard variant="bordered">
              <div className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <PencilIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{t('tenantWalletManagement.adjust.title')}</h2>
                  <p className="text-sm text-gray-500">{t('tenantWalletManagement.adjust.description')}</p>
                </div>
              </div>

              <form onSubmit={handleQuickAdjust} className="space-y-4">
                <PSelect
                  label={t('tenantWalletManagement.adjust.modeLabel')}
                  value={quickAdjustMode}
                  onChange={(e) => setQuickAdjustMode((e.target as HTMLSelectElement).value as 'delta' | 'target')}
                  variant="rounded"
                >
                  <option value="delta">{t('tenantWalletManagement.adjust.modeDelta')}</option>
                  <option value="target">{t('tenantWalletManagement.adjust.modeTarget')}</option>
                </PSelect>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <PSelect
                    label={t('tenantWalletManagement.adjust.ownerTypeLabel')}
                    value={quickAdjustForm.owner_type}
                    onChange={(e) => setQuickAdjustForm({ ...quickAdjustForm, owner_type: (e.target as HTMLSelectElement).value as OwnerType })}
                    variant="rounded"
                  >
                    <option value="user">{t('tenantWalletManagement.common.user')}</option>
                    <option value="team">{t('tenantWalletManagement.common.team')}</option>
                  </PSelect>
                  <PInput
                    type="number"
                    label={t('tenantWalletManagement.adjust.ownerIdLabel', {
                      owner: quickAdjustForm.owner_type === 'user' ? t('tenantWalletManagement.common.user') : t('tenantWalletManagement.common.team'),
                    })}
                    value={quickAdjustForm.owner_id || ''}
                    onChange={(e) => setQuickAdjustForm({ ...quickAdjustForm, owner_id: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                    variant="rounded"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <PSelect
                    label={t('tenantWalletManagement.adjust.currencyLabel')}
                    value={quickAdjustForm.currency_code}
                    onChange={(e) => setQuickAdjustForm({ ...quickAdjustForm, currency_code: (e.target as HTMLSelectElement).value })}
                    variant="rounded"
                  >
                    <option value="">{t('tenantWalletManagement.adjust.selectCurrency')}</option>
                    {currencies.map(currency => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name}
                      </option>
                    ))}
                  </PSelect>
                  <PInput
                    type="number"
                    step="0.01"
                    label={quickAdjustMode === 'delta' ? t('tenantWalletManagement.adjust.amountLabel') : t('tenantWalletManagement.adjust.targetBalanceLabel')}
                    value={quickAdjustForm.amount}
                    onChange={(e) => setQuickAdjustForm({ ...quickAdjustForm, amount: parseFloat(e.target.value) || 0 })}
                    placeholder={quickAdjustMode === 'delta' ? t('tenantWalletManagement.adjust.amountPlaceholder') : t('tenantWalletManagement.adjust.targetPlaceholder')}
                    variant="rounded"
                  />
                </div>

                <PTextarea
                  label={t('tenantWalletManagement.adjust.reasonLabel')}
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
                  {t('tenantWalletManagement.adjust.createIfMissing')}
                </label>

                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  {quickAdjustMode === 'delta'
                    ? t('tenantWalletManagement.adjust.deltaHint')
                    : t('tenantWalletManagement.adjust.targetHint')}
                </div>

                <div className="flex justify-end gap-3">
                  <PButton type="button" variant="secondary" onClick={resetQuickAdjustForm}>{t('tenantWalletManagement.actions.reset')}</PButton>
                  <PButton type="submit" variant="primary" disabled={submitting} loading={submitting}>{t('tenantWalletManagement.actions.confirmAdjust')}</PButton>
                </div>
              </form>
              </div>
            </PCard>

            <PCard variant="bordered">
              <div className="p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                    <CurrencyDollarIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{t('tenantWalletManagement.giftCard.title')}</h2>
                    <p className="text-sm text-gray-500">{t('tenantWalletManagement.giftCard.description')}</p>
                  </div>
                </div>

                <form onSubmit={handleCreateGiftCards} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <PSelect
                      label={t('tenantWalletManagement.giftCard.currencyLabel')}
                      value={giftCardForm.currency_code}
                      onChange={(e) => setGiftCardForm({ ...giftCardForm, currency_code: (e.target as HTMLSelectElement).value })}
                      variant="rounded"
                    >
                      <option value="">{t('tenantWalletManagement.giftCard.selectCurrency')}</option>
                      {currencies.map(currency => (
                        <option key={currency.code} value={currency.code}>{currency.code} - {currency.name}</option>
                      ))}
                    </PSelect>
                    <PInput
                      type="number"
                      step="0.01"
                      label={t('tenantWalletManagement.giftCard.amountLabel')}
                      value={giftCardForm.amount}
                      onChange={(e) => setGiftCardForm({ ...giftCardForm, amount: parseFloat(e.target.value) || 0 })}
                      variant="rounded"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <PInput
                      type="number"
                      label={t('tenantWalletManagement.giftCard.quantityLabel')}
                      value={giftCardForm.quantity}
                      onChange={(e) => setGiftCardForm({ ...giftCardForm, quantity: parseInt(e.target.value || '0', 10) || 0 })}
                      variant="rounded"
                    />
                    <PInput
                      type="datetime-local"
                      label={t('tenantWalletManagement.giftCard.expiresAtLabel')}
                      value={giftCardForm.expires_at}
                      onChange={(e) => setGiftCardForm({ ...giftCardForm, expires_at: e.target.value })}
                      variant="rounded"
                    />
                  </div>

                  <PTextarea
                    label={t('tenantWalletManagement.giftCard.noteLabel')}
                    value={giftCardForm.note}
                    onChange={(e) => setGiftCardForm({ ...giftCardForm, note: e.target.value })}
                    rows={2}
                  />

                  <div className="flex justify-end">
                    <PButton type="submit" variant="primary" loading={giftCardSubmitting} disabled={giftCardSubmitting}>{t('tenantWalletManagement.actions.createBatch')}</PButton>
                  </div>
                </form>
              </div>
            </PCard>
          </div>

          <PCard variant="bordered">
            <div className="border-b border-gray-200 p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{t('tenantWalletManagement.walletList.title')}</h2>
                  <p className="text-sm text-gray-500">{t('tenantWalletManagement.walletList.description')}</p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <PInput
                    value={filters.keyword}
                    onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                    placeholder={t('tenantWalletManagement.walletList.searchPlaceholder')}
                    variant="rounded"
                  />
                  <PSelect
                    value={filters.currency_code}
                    onChange={(e) => setFilters({ ...filters, currency_code: (e.target as HTMLSelectElement).value })}
                    variant="rounded"
                  >
                    <option value="">{t('tenantWalletManagement.walletList.allCurrencies')}</option>
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
                  <div className="p-8 text-center text-sm text-gray-500">{t('tenantWalletManagement.walletList.empty')}</div>
                ) : (
                  filteredWallets.map(wallet => (
                    <div key={wallet.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                            <WalletIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{t('tenantWalletManagement.walletList.walletId', { id: wallet.id })}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              {wallet.user_id ? (
                                <PBadge variant="info"><UsersIcon className="mr-1 h-3 w-3" />{t('tenantWalletManagement.walletList.userTag', { id: wallet.user_id })}</PBadge>
                              ) : null}
                              {wallet.team_id ? (
                                <PBadge variant="success"><UserGroupIcon className="mr-1 h-3 w-3" />{t('tenantWalletManagement.walletList.teamTag', { id: wallet.team_id })}</PBadge>
                              ) : null}
                              <PBadge variant={wallet.status === 'active' ? 'success' : 'error'}>
                                {wallet.status === 'active' ? t('tenantWalletManagement.status.active') : t('tenantWalletManagement.status.frozen')}
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
                        {t('tenantWalletManagement.actions.viewTransactions')}
                      </PButton>
                    </div>
                  </div>
                ))
                )}
              </div>
            )}

            <div className="border-t border-gray-200 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900">{t('tenantWalletManagement.giftCard.listTitle')}</h3>
                <PButton variant="secondary" size="sm" onClick={loadGiftCards} disabled={giftCardLoading}>{t('tenantWalletManagement.actions.refresh')}</PButton>
              </div>
              {giftCardLoading ? (
                <PSkeleton.List items={3} />
              ) : giftCards.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 px-6 py-8 text-center text-sm text-gray-500">{t('tenantWalletManagement.giftCard.empty')}</div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('tenantWalletManagement.table.code')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('tenantWalletManagement.table.amount')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('tenantWalletManagement.table.status')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('tenantWalletManagement.table.createdAt')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('tenantWalletManagement.table.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {giftCards.map(item => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 text-sm font-mono text-gray-700">{item.code}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{formatGiftCardAmount(item.amount, item.currency?.code)}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{item.status}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{new Date(item.created_at).toLocaleString(locale)}</td>
                          <td className="px-4 py-3 text-sm">
                            {item.status === 'active' ? (
                              <PButton variant="danger" size="sm" onClick={() => handleInvalidateGiftCard(item.id)}>{t('tenantWalletManagement.actions.invalidate')}</PButton>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </PCard>
        </div>
      </div>

      {transactionsModalVisible && transactionWallet ? (
        <div className="fixed inset-0 !m-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 backdrop-blur-sm">
          <PCard variant="elevated" className="relative mx-auto w-full max-w-4xl rounded-2xl border-0">
            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{t('tenantWalletManagement.transactions.title', { id: transactionWallet.id })}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {t('tenantWalletManagement.transactions.subtitle', {
                      currency: transactionWallet.currency.code,
                      balance: formatBalance(transactionWallet.balance, transactionWallet.currency),
                    })}
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
                  {t('tenantWalletManagement.actions.close')}
                </PButton>
              </div>

              {transactionLoading ? (
                <PSkeleton.List items={3} />
              ) : transactions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 px-6 py-10 text-center text-sm text-gray-500">
                  {t('tenantWalletManagement.transactions.empty')}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('tenantWalletManagement.transactions.type')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('tenantWalletManagement.transactions.amount')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('tenantWalletManagement.transactions.status')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('tenantWalletManagement.transactions.reference')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('tenantWalletManagement.transactions.time')}</th>
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
                          <td className="px-4 py-3 text-sm text-gray-500">{new Date(tx.created_at).toLocaleString(locale)}</td>
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
