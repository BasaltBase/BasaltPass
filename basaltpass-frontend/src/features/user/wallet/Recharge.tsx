import { useState } from 'react'
import { recharge } from '@api/user/wallet'
import { userGiftCardApi } from '@api/user/giftCard'
import { Currency } from '@api/user/currency'
import { useNavigate } from 'react-router-dom'
import Layout from '@features/user/components/Layout'
import CurrencySelector from '@features/user/components/CurrencySelector'
import { PInput, PButton } from '@ui'
import { ROUTES } from '@constants'
import { useConfig } from '@contexts/ConfigContext'
import { useI18n } from '@shared/i18n'
import { 
  ArrowUpIcon,
  CreditCardIcon,
  QrCodeIcon,
  BanknotesIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

const paymentMethods = [
  {
    id: 'alipay',
    name: 'Alipay',
    icon: QrCodeIcon,
    description: 'Scan to pay',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  {
    id: 'wechat',
    name: 'WeChat Pay',
    icon: QrCodeIcon,
    description: 'Scan to pay',
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  {
    id: 'bank',
    name: 'Bank Card',
    icon: CreditCardIcon,
    description: 'Online payment',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100'
  }
]

const quickAmounts = [50, 100, 200, 500, 1000, 2000]

// 
const getQuickAmounts = (currency: Currency): number[] => {
  switch (currency.type) {
    case 'crypto':
      if (currency.code === 'BTC') {
        return [0.001, 0.005, 0.01, 0.05, 0.1, 0.5]
      } else if (currency.code === 'ETH') {
        return [0.01, 0.05, 0.1, 0.5, 1, 5]
      }
      return [1, 10, 50, 100, 500, 1000]
    case 'points':
      return [100, 500, 1000, 5000, 10000, 50000]
    default: // fiat
      return quickAmounts
  }
}

// 
const formatAmount = (amount: number, currency: Currency): string => {
  return amount.toFixed(Math.min(currency.decimal_places, 8))
}

export default function Recharge() {
  const { t } = useI18n()
  const { walletRechargeWithdrawEnabled } = useConfig()
  const walletOpsDisabled = !walletRechargeWithdrawEnabled
  const navigate = useNavigate()
  const [amount, setAmount] = useState('')
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null)
  const [selectedMethod, setSelectedMethod] = useState('alipay')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [giftCode, setGiftCode] = useState('')
  const [giftRedeeming, setGiftRedeeming] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (walletOpsDisabled) {
      setError(t('pages.walletRecharge.errors.disabled'))
      return
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      setError(t('pages.walletRecharge.errors.invalidAmount'))
      return
    }

    if (!selectedCurrency) {
      setError(t('pages.walletRecharge.errors.selectCurrency'))
      return
    }

    setIsLoading(true)
    setError('')
    
    try {
      // 
      const decimals = selectedCurrency.decimal_places
      const amountInSmallestUnit = Math.round(Number(amount) * Math.pow(10, decimals))
      
      await recharge(selectedCurrency.code, amountInSmallestUnit)
      setSuccess(true)
      setTimeout(() => {
        navigate(ROUTES.user.wallet)
      }, 2000)
    } catch (e: any) {
      setError(e.response?.data?.error || t('pages.walletRecharge.errors.rechargeFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString())
    setError('')
  }

  const handleAmountChange = (value: string) => {
    setAmount(value)
    setError('')
  }

  const handleRedeemGiftCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!giftCode.trim()) {
      setError(t('pages.walletRecharge.errors.giftCodeRequired'))
      return
    }
    setGiftRedeeming(true)
    setError('')
    try {
      await userGiftCardApi.redeem(giftCode.trim())
      setSuccess(true)
      setTimeout(() => {
        navigate(ROUTES.user.wallet)
      }, 2000)
    } catch (e: any) {
      setError(e.response?.data?.error || t('pages.walletRecharge.errors.giftRedeemFailed'))
    } finally {
      setGiftRedeeming(false)
    }
  }

  if (success) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <CheckCircleIcon className="mx-auto h-16 w-16 text-green-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('pages.walletRecharge.success.title')}</h2>
            <p className="text-gray-600">{t('pages.walletRecharge.success.redirecting')}</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/*  */}
        <div className="flex items-center">
          <PButton 
            onClick={() => navigate(ROUTES.user.wallet)}
            variant="ghost"
            size="sm"
            className="mr-2"
            leftIcon={<ArrowLeftIcon className="h-5 w-5" />}
          >
            {t('pages.walletRecharge.header.back')}
          </PButton>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('pages.walletRecharge.header.title')}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {t('pages.walletRecharge.header.description')}
            </p>
          </div>
        </div>

        {walletOpsDisabled && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <p className="text-sm text-amber-900">{t('pages.walletRecharge.notice.disabled')}</p>
          </div>
        )}

        <div className={`rounded-xl bg-white shadow-sm ${walletOpsDisabled ? 'opacity-50' : ''}`}>
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center mb-4">
              <CreditCardIcon className="h-6 w-6 text-purple-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">{t('pages.walletRecharge.giftCard.title')}</h3>
            </div>
            <form onSubmit={handleRedeemGiftCard} className={`space-y-4 ${walletOpsDisabled ? 'pointer-events-none' : ''}`}>
              <PInput
                id="gift-code"
                label={t('pages.walletRecharge.giftCard.codeLabel')}
                value={giftCode}
                onChange={(e) => setGiftCode(e.target.value.toUpperCase())}
                placeholder={t('pages.walletRecharge.giftCard.codePlaceholder')}
              />
              <PButton type="submit" loading={giftRedeeming} disabled={walletOpsDisabled || !giftCode.trim()}>
                {t('pages.walletRecharge.giftCard.submit')}
              </PButton>
            </form>
          </div>
        </div>

        {/*  */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{t('pages.walletRecharge.errors.title')}</p>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/*  */}
          <div className={`rounded-xl bg-white shadow-sm ${walletOpsDisabled ? 'opacity-50' : ''}`}>
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center mb-6">
                <ArrowUpIcon className="h-6 w-6 text-green-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">{t('pages.walletRecharge.form.title')}</h3>
              </div>
              
              <form onSubmit={submit} className={`space-y-6 ${walletOpsDisabled ? 'pointer-events-none' : ''}`}>
                {/*  */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('pages.walletRecharge.form.currencyLabel')}
                  </label>
                  <CurrencySelector
                    value={selectedCurrency?.code || ''}
                    onChange={setSelectedCurrency}
                    className="w-full"
                  />
                </div>

                {/*  */}
                <div>
                  <PInput
                    id="amount"
                    type="number"
                    label={t('pages.walletRecharge.form.amountLabel', { currency: selectedCurrency?.code || '' })}
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder={t('pages.walletRecharge.form.amountPlaceholder')}
                    min="0.01"
                    step={selectedCurrency ? `0.${'0'.repeat(Math.max(0, selectedCurrency.decimal_places - 1))}1` : "0.01"}
                  />
                </div>

                {/*  */}
                {selectedCurrency && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('pages.walletRecharge.form.quickAmountLabel')}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {getQuickAmounts(selectedCurrency).map((value) => (
                        <PButton
                          key={value}
                          type="button"
                          onClick={() => handleQuickAmount(value)}
                          variant={amount === value.toString() ? 'primary' : 'secondary'}
                          size="sm"
                        >
                          {selectedCurrency.symbol}{formatAmount(value, selectedCurrency)}
                        </PButton>
                      ))}
                    </div>
                  </div>
                )}

                {/*  */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    {t('pages.walletRecharge.form.methodLabel')}
                  </label>
                  <div className="space-y-3">
                    {paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className={`relative rounded-lg border p-4 cursor-pointer transition-colors ${
                          selectedMethod === method.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 bg-white hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedMethod(method.id)}
                      >
                        <div className="flex items-center">
                          <div className={`h-10 w-10 ${method.bgColor} rounded-lg flex items-center justify-center mr-3`}>
                            <method.icon className={`h-6 w-6 ${method.color}`} />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{t(`pages.walletRecharge.paymentMethods.${method.id}.name`)}</p>
                            <p className="text-sm text-gray-500">{t(`pages.walletRecharge.paymentMethods.${method.id}.description`)}</p>
                          </div>
                          {selectedMethod === method.id && (
                            <div className="h-5 w-5 bg-indigo-600 rounded-full flex items-center justify-center">
                              <CheckCircleIcon className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/*  */}
                <PButton
                  type="submit"
                  disabled={walletOpsDisabled || !amount || parseFloat(amount) <= 0 || !selectedCurrency}
                  loading={isLoading}
                  fullWidth
                >
                  {t('pages.walletRecharge.form.submitWithAmount', {
                    symbol: selectedCurrency?.symbol || '',
                    amount: amount || '0.00',
                    code: selectedCurrency?.code || '',
                  })}
                </PButton>
              </form>
            </div>
          </div>

          {/*  */}
          <div className="space-y-6">
            {/*  */}
            <div className="rounded-xl bg-white shadow-sm">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center mb-4">
                  <BanknotesIcon className="h-6 w-6 text-blue-600 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">{t('pages.walletRecharge.guide.title')}</h3>
                </div>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start">
                    <div className="h-2 w-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <p>{t('pages.walletRecharge.guide.items.realtime')}</p>
                  </div>
                  <div className="flex items-start">
                    <div className="h-2 w-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <p>{t('pages.walletRecharge.guide.items.methods')}</p>
                  </div>
                  <div className="flex items-start">
                    <div className="h-2 w-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <p>{t('pages.walletRecharge.guide.items.limit')}</p>
                  </div>
                  <div className="flex items-start">
                    <div className="h-2 w-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <p>{t('pages.walletRecharge.guide.items.fee')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/*  */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <BanknotesIcon className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">{t('pages.walletRecharge.security.title')}</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>{t('pages.walletRecharge.security.items.network')}</li>
                      <li>{t('pages.walletRecharge.security.items.password')}</li>
                      <li>{t('pages.walletRecharge.security.items.support')}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/*  */}
            <div className="rounded-xl bg-white shadow-sm">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">{t('pages.walletRecharge.faq.title')}</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{t('pages.walletRecharge.faq.q1')}</p>
                    <p className="text-gray-600">{t('pages.walletRecharge.faq.a1')}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{t('pages.walletRecharge.faq.q2')}</p>
                    <p className="text-gray-600">{t('pages.walletRecharge.faq.a2')}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{t('pages.walletRecharge.faq.q3')}</p>
                    <p className="text-gray-600">{t('pages.walletRecharge.faq.a3')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
} 
