import { useEffect, useMemo, useState } from 'react'
import { CurrencyDollarIcon, DocumentDuplicateIcon, GiftIcon } from '@heroicons/react/24/outline'
import TenantLayout from '@features/tenant/components/TenantLayout'
import { uiAlert } from '@contexts/DialogContext'
import { PBadge, PButton, PCard, PInput, PSelect, PSkeleton, PTextarea } from '@ui'
import { tenantGiftCardApi, type GiftCardItem } from '@api/tenant/giftCard'
import { tenantWalletApi, type TenantCurrency } from '@api/tenant/wallet'

export default function GiftCardManagement() {
  const [currencies, setCurrencies] = useState<TenantCurrency[]>([])
  const [giftCards, setGiftCards] = useState<GiftCardItem[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [filters, setFilters] = useState({
    code: '',
    status: '',
    currency_code: '',
  })
  const [form, setForm] = useState({
    currency_code: '',
    amount: 0,
    quantity: 10,
    expires_at: '',
    note: '',
  })

  const loadCurrencies = async () => {
    try {
      const response = await tenantWalletApi.getCurrencies()
      setCurrencies(response.data || [])
    } catch (error) {
      console.error('加载货币失败:', error)
      setCurrencies([])
    }
  }

  const loadGiftCards = async () => {
    try {
      setLoading(true)
      const response = await tenantGiftCardApi.list({
        page: 1,
        page_size: 100,
        code: filters.code || undefined,
        status: filters.status || undefined,
      })
      setGiftCards(response.data || [])
    } catch (error) {
      console.error('加载礼品卡失败:', error)
      setGiftCards([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCurrencies()
  }, [])

  useEffect(() => {
    loadGiftCards()
  }, [filters.code, filters.status])

  const formatAmount = (amount: number, currencyCode?: string) => {
    if (!currencyCode) return String(amount)
    const currency = currencies.find(item => item.code === currencyCode)
    if (!currency) return String(amount)
    const actualAmount = amount / Math.pow(10, currency.decimal_places)
    return `${actualAmount.toFixed(currency.decimal_places)} ${currency.symbol}`
  }

  const visibleCards = useMemo(() => {
    if (!filters.currency_code) return giftCards
    return giftCards.filter(item => item.currency?.code === filters.currency_code)
  }, [giftCards, filters.currency_code])

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.currency_code) {
      uiAlert('请选择礼品卡币种')
      return
    }
    if (form.amount <= 0) {
      uiAlert('请输入有效金额')
      return
    }
    if (form.quantity <= 0) {
      uiAlert('请输入有效数量')
      return
    }

    try {
      setSubmitting(true)
      await tenantGiftCardApi.createBatch({
        currency_code: form.currency_code,
        amount: form.amount,
        quantity: form.quantity,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : undefined,
        note: form.note || undefined,
      })
      uiAlert('礼品卡批次创建成功')
      setForm({ currency_code: '', amount: 0, quantity: 10, expires_at: '', note: '' })
      await loadGiftCards()
    } catch (error: any) {
      uiAlert(error.response?.data?.error || '创建礼品卡失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleInvalidate = async (id: number) => {
    try {
      await tenantGiftCardApi.invalidate(id)
      uiAlert('礼品卡已失效')
      await loadGiftCards()
    } catch (error: any) {
      uiAlert(error.response?.data?.error || '礼品卡失效失败')
    }
  }

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      uiAlert('卡密已复制')
    } catch {
      uiAlert('复制失败，请手动复制')
    }
  }

  return (
    <TenantLayout title="Gift Card 管理">
      <div className="space-y-6">
        <PCard variant="bordered">
          <div className="flex items-start justify-between gap-6 p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white">
                <GiftIcon className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gift Card 管理</h1>
                <p className="mt-1 text-sm text-gray-500">批量生成、检索筛选与状态维护一站式完成。</p>
              </div>
            </div>
            <PButton variant="secondary" onClick={loadGiftCards} disabled={loading}>刷新</PButton>
          </div>
        </PCard>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <PCard variant="bordered">
            <div className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                  <CurrencyDollarIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">批量生卡</h2>
                  <p className="text-sm text-gray-500">支持币种、数量与过期时间设置</p>
                </div>
              </div>

              <form onSubmit={handleCreateBatch} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <PSelect
                    label="货币类型"
                    value={form.currency_code}
                    onChange={(e) => setForm({ ...form, currency_code: (e.target as HTMLSelectElement).value })}
                    variant="rounded"
                  >
                    <option value="">选择货币</option>
                    {currencies.map(currency => (
                      <option key={currency.code} value={currency.code}>{currency.code} - {currency.name}</option>
                    ))}
                  </PSelect>
                  <PInput
                    type="number"
                    step="0.01"
                    label="单卡金额"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                    variant="rounded"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <PInput
                    type="number"
                    label="生成数量"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value || '0', 10) || 0 })}
                    variant="rounded"
                  />
                  <PInput
                    type="datetime-local"
                    label="过期时间（可选）"
                    value={form.expires_at}
                    onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                    variant="rounded"
                  />
                </div>

                <PTextarea
                  label="备注（可选）"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  rows={2}
                />

                <div className="flex justify-end">
                  <PButton type="submit" variant="primary" loading={submitting} disabled={submitting}>批量生成</PButton>
                </div>
              </form>
            </div>
          </PCard>

          <PCard variant="bordered">
            <div className="border-b border-gray-200 p-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <PInput
                  value={filters.code}
                  onChange={(e) => setFilters({ ...filters, code: e.target.value.toUpperCase() })}
                  placeholder="按卡密搜索"
                  variant="rounded"
                />
                <PSelect
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: (e.target as HTMLSelectElement).value })}
                  variant="rounded"
                >
                  <option value="">全部状态</option>
                  <option value="active">active</option>
                  <option value="redeemed">redeemed</option>
                  <option value="invalid">invalid</option>
                  <option value="expired">expired</option>
                </PSelect>
                <PSelect
                  value={filters.currency_code}
                  onChange={(e) => setFilters({ ...filters, currency_code: (e.target as HTMLSelectElement).value })}
                  variant="rounded"
                >
                  <option value="">全部币种</option>
                  {currencies.map(currency => (
                    <option key={currency.code} value={currency.code}>{currency.code}</option>
                  ))}
                </PSelect>
              </div>
            </div>

            <div className="p-6">
              {loading ? (
                <PSkeleton.List items={4} />
              ) : visibleCards.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 px-6 py-10 text-center text-sm text-gray-500">暂无礼品卡</div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">卡密</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">金额</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">状态</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">创建时间</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {visibleCards.map(item => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 text-sm font-mono text-gray-700">{item.code}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{formatAmount(item.amount, item.currency?.code)}</td>
                          <td className="px-4 py-3 text-sm">
                            <PBadge variant={item.status === 'active' ? 'success' : item.status === 'redeemed' ? 'info' : 'default'}>
                              {item.status}
                            </PBadge>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{new Date(item.created_at).toLocaleString('zh-CN')}</td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              <PButton variant="secondary" size="sm" onClick={() => handleCopy(item.code)}>
                                <DocumentDuplicateIcon className="mr-1 h-4 w-4" />复制
                              </PButton>
                              {item.status === 'active' ? (
                                <PButton variant="danger" size="sm" onClick={() => handleInvalidate(item.id)}>设为失效</PButton>
                              ) : null}
                            </div>
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
    </TenantLayout>
  )
}
