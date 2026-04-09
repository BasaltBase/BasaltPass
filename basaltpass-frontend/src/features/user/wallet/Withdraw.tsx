import { useState } from 'react'
import { withdraw } from '@api/user/wallet'
import { Currency } from '@api/user/currency'
import { useNavigate } from 'react-router-dom'
import Layout from '@features/user/components/Layout'
import CurrencySelector from '@features/user/components/CurrencySelector'
import { PButton, PInput } from '@ui'
import { ROUTES } from '@constants'
import { useConfig } from '@contexts/ConfigContext'
import { useI18n } from '@shared/i18n'
import { 
  ArrowDownIcon,
  CreditCardIcon,
  QrCodeIcon,
  BanknotesIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

const withdrawMethods = [
  {
    id: 'alipay',
    name: 'Alipay',
    icon: QrCodeIcon,
    description: 'Instant arrival',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  {
    id: 'bank',
    name: 'Bank Card',
    icon: CreditCardIcon,
    description: '1-3 business days',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100'
  },
  {
    id: 'wechat',
    name: 'WeChat Pay',
    icon: QrCodeIcon,
    description: 'Instant arrival',
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  }
]

const quickAmounts = [50, 100, 200, 500, 1000, 2000]

export default function Withdraw() {
  const { t } = useI18n()
  const { walletRechargeWithdrawEnabled } = useConfig()
  const walletOpsDisabled = !walletRechargeWithdrawEnabled
  const navigate = useNavigate()
  const [amount, setAmount] = useState('')
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null)
  const [selectedMethod, setSelectedMethod] = useState('alipay')
  const [accountInfo, setAccountInfo] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (walletOpsDisabled) {
      setError(t('pages.walletWithdraw.errors.disabled'))
      return
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      setError(t('pages.walletWithdraw.errors.invalidAmount'))
      return
    }

    if (!selectedCurrency) {
      setError(t('pages.walletWithdraw.errors.selectCurrency'))
      return
    }

    if (!accountInfo.trim()) {
      setError(t('pages.walletWithdraw.errors.accountRequired'))
      return
    }

    setIsLoading(true)
    setError('')
    
    try {
      // 
      const decimals = selectedCurrency.decimal_places
      const amountInSmallestUnit = Math.round(Number(amount) * Math.pow(10, decimals))
      
      await withdraw(selectedCurrency.code, amountInSmallestUnit)
      setSuccess(true)
      setTimeout(() => {
        navigate(ROUTES.user.wallet)
      }, 3000)
    } catch (e: any) {
      setError(e.response?.data?.error || t('pages.walletWithdraw.errors.withdrawFailed'))
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

  const getAccountPlaceholder = () => {
    switch (selectedMethod) {
      case 'alipay':
        return t('pages.walletWithdraw.form.accountPlaceholder.alipay')
      case 'bank':
        return t('pages.walletWithdraw.form.accountPlaceholder.bank')
      case 'wechat':
        return t('pages.walletWithdraw.form.accountPlaceholder.wechat')
      default:
        return t('pages.walletWithdraw.form.accountPlaceholder.default')
    }
  }

  if (success) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <CheckCircleIcon className="mx-auto h-16 w-16 text-green-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('pages.walletWithdraw.success.title')}</h2>
            <p className="text-gray-600 mb-4">{t('pages.walletWithdraw.success.description')}</p>
            <p className="text-sm text-gray-500">{t('pages.walletWithdraw.success.redirecting')}</p>
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
            variant="ghost"
            size="sm"
            onClick={() => navigate(ROUTES.user.wallet)}
            className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </PButton>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('pages.walletWithdraw.header.title')}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {t('pages.walletWithdraw.header.description')}
            </p>
          </div>
        </div>

        {walletOpsDisabled && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <p className="text-sm text-amber-900">{t('pages.walletWithdraw.notice.disabled')}</p>
          </div>
        )}

        {/*  */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{t('pages.walletWithdraw.errors.title')}</p>
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
                <ArrowDownIcon className="h-6 w-6 text-red-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">{t('pages.walletWithdraw.form.title')}</h3>
              </div>
              
              <form onSubmit={submit} className={`space-y-6 ${walletOpsDisabled ? 'pointer-events-none' : ''}`}>
                {/*  */}
                <div>
                  <PInput
                    id="amount"
                    type="number"
                    label={t('pages.walletWithdraw.form.amountLabel')}
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder={t('pages.walletWithdraw.form.amountPlaceholder')}
                    min="0.01"
                    step="0.01"
                  />
                </div>

                {/*  */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('pages.walletWithdraw.form.quickAmountLabel')}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {quickAmounts.map((value) => (
                      <PButton
                        key={value}
                        type="button"
                        variant={amount === value.toString() ? "danger" : "secondary"}
                        size="sm"
                        onClick={() => handleQuickAmount(value)}
                      >
                        ¥{value}
                      </PButton>
                    ))}
                  </div>
                </div>

                {/*  */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    {t('pages.walletWithdraw.form.methodLabel')}
                  </label>
                  <div className="space-y-3">
                    {withdrawMethods.map((method) => (
                      <div
                        key={method.id}
                        className={`relative rounded-lg border p-4 cursor-pointer transition-colors ${
                          selectedMethod === method.id
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-300 bg-white hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedMethod(method.id)}
                      >
                        <div className="flex items-center">
                          <div className={`h-10 w-10 ${method.bgColor} rounded-lg flex items-center justify-center mr-3`}>
                            <method.icon className={`h-6 w-6 ${method.color}`} />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{t(`pages.walletWithdraw.methods.${method.id}.name`)}</p>
                            <p className="text-sm text-gray-500">{t(`pages.walletWithdraw.methods.${method.id}.description`)}</p>
                          </div>
                          {selectedMethod === method.id && (
                            <div className="h-5 w-5 bg-red-600 rounded-full flex items-center justify-center">
                              <CheckCircleIcon className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/*  */}
                <div>
                  <PInput
                    id="accountInfo"
                    type="text"
                    label={t('pages.walletWithdraw.form.accountLabel')}
                    value={accountInfo}
                    onChange={(e) => setAccountInfo(e.target.value)}
                    placeholder={getAccountPlaceholder()}
                  />
                </div>

                {/*  */}
                <PButton
                  type="submit"
                  variant="danger"
                  fullWidth
                  disabled={walletOpsDisabled || isLoading || !amount || parseFloat(amount) <= 0 || !accountInfo.trim()}
                  loading={isLoading}
                >
                  {isLoading ? t('pages.walletWithdraw.form.submitting') : t('pages.walletWithdraw.form.submitWithAmount', { amount: amount || '0.00' })}
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
                  <BanknotesIcon className="h-6 w-6 text-red-600 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">{t('pages.walletWithdraw.guide.title')}</h3>
                </div>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start">
                    <div className="h-2 w-2 bg-red-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <p>{t('pages.walletWithdraw.guide.items.alipayWechat')}</p>
                  </div>
                  <div className="flex items-start">
                    <div className="h-2 w-2 bg-red-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <p>{t('pages.walletWithdraw.guide.items.bank')}</p>
                  </div>
                  <div className="flex items-start">
                    <div className="h-2 w-2 bg-red-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <p>{t('pages.walletWithdraw.guide.items.limit')}</p>
                  </div>
                  <div className="flex items-start">
                    <div className="h-2 w-2 bg-red-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <p>{t('pages.walletWithdraw.guide.items.fee')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/*  */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <InformationCircleIcon className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">{t('pages.walletWithdraw.important.title')}</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>{t('pages.walletWithdraw.important.items.account')}</li>
                      <li>{t('pages.walletWithdraw.important.items.noCancel')}</li>
                      <li>{t('pages.walletWithdraw.important.items.support')}</li>
                      <li>{t('pages.walletWithdraw.important.items.worktime')}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/*  */}
            <div className="rounded-xl bg-white shadow-sm">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">{t('pages.walletWithdraw.faq.title')}</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{t('pages.walletWithdraw.faq.q1')}</p>
                    <p className="text-gray-600">{t('pages.walletWithdraw.faq.a1')}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{t('pages.walletWithdraw.faq.q2')}</p>
                    <p className="text-gray-600">{t('pages.walletWithdraw.faq.a2')}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{t('pages.walletWithdraw.faq.q3')}</p>
                    <p className="text-gray-600">{t('pages.walletWithdraw.faq.a3')}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{t('pages.walletWithdraw.faq.q4')}</p>
                    <p className="text-gray-600">{t('pages.walletWithdraw.faq.a4')}</p>
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
                  <h3 className="text-sm font-medium text-blue-800">Security Tips</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>Please operate in a secure network environment</li>
                      <li>Do not share account information with others</li>
                      <li>Review withdrawal records regularly</li>
                    </ul>
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
