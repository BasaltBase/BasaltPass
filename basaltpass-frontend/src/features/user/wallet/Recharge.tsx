import { useState } from 'react'
import { recharge } from '@api/user/wallet'
import { Currency } from '@api/user/currency'
import { useNavigate } from 'react-router-dom'
import Layout from '@features/user/components/Layout'
import CurrencySelector from '@features/user/components/CurrencySelector'
import { PInput, PButton } from '@ui'
import { ROUTES } from '@constants'
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
    name: '支付宝',
    icon: QrCodeIcon,
    description: '扫码支付',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  {
    id: 'wechat',
    name: '微信支付',
    icon: QrCodeIcon,
    description: '扫码支付',
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  {
    id: 'bank',
    name: '银行卡',
    icon: CreditCardIcon,
    description: '在线支付',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  }
]

const quickAmounts = [50, 100, 200, 500, 1000, 2000]

// 根据货币类型获取合适的快速金额
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

// 格式化金额显示
const formatAmount = (amount: number, currency: Currency): string => {
  return amount.toFixed(Math.min(currency.decimal_places, 8))
}

export default function Recharge() {
  const navigate = useNavigate()
  const [amount, setAmount] = useState('')
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null)
  const [selectedMethod, setSelectedMethod] = useState('alipay')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!amount || parseFloat(amount) <= 0) {
      setError('请输入有效的充值金额')
      return
    }

    if (!selectedCurrency) {
      setError('请选择充值货币')
      return
    }

    setIsLoading(true)
    setError('')
    
    try {
      // 根据货币的小数位数计算最小单位金额
      const decimals = selectedCurrency.decimal_places
      const amountInSmallestUnit = Math.round(Number(amount) * Math.pow(10, decimals))
      
      await recharge(selectedCurrency.code, amountInSmallestUnit)
      setSuccess(true)
      setTimeout(() => {
        navigate(ROUTES.user.wallet)
      }, 2000)
    } catch (e: any) {
      setError(e.response?.data?.error || '充值失败，请重试')
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

  if (success) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <CheckCircleIcon className="mx-auto h-16 w-16 text-green-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">充值成功！</h2>
            <p className="text-gray-600">正在跳转到钱包页面...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center">
          <PButton 
            onClick={() => navigate(ROUTES.user.wallet)}
            variant="ghost"
            size="sm"
            className="mr-2"
            leftIcon={<ArrowLeftIcon className="h-5 w-5" />}
          >
            返回
          </PButton>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">充值钱包</h1>
            <p className="mt-1 text-sm text-gray-500">
              选择充值方式并输入金额
            </p>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="rounded-md bg-red-50 p-4 border border-red-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">充值失败</p>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 充值表单 */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center mb-6">
                <ArrowUpIcon className="h-6 w-6 text-green-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">充值信息</h3>
              </div>
              
              <form onSubmit={submit} className="space-y-6">
                {/* 货币选择 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    选择货币
                  </label>
                  <CurrencySelector
                    value={selectedCurrency?.code || ''}
                    onChange={setSelectedCurrency}
                    className="w-full"
                  />
                </div>

                {/* 金额输入 */}
                <div>
                  <PInput
                    id="amount"
                    type="number"
                    label={`充值金额 ${selectedCurrency ? `(${selectedCurrency.code})` : ''}`}
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="0.00"
                    min="0.01"
                    step={selectedCurrency ? `0.${'0'.repeat(Math.max(0, selectedCurrency.decimal_places - 1))}1` : "0.01"}
                  />
                </div>

                {/* 快速金额选择 */}
                {selectedCurrency && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      快速选择金额
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

                {/* 支付方式选择 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    选择支付方式
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
                            <p className="text-sm font-medium text-gray-900">{method.name}</p>
                            <p className="text-sm text-gray-500">{method.description}</p>
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

                {/* 提交按钮 */}
                <PButton
                  type="submit"
                  disabled={!amount || parseFloat(amount) <= 0 || !selectedCurrency}
                  loading={isLoading}
                  fullWidth
                >
                  {`充值 ${selectedCurrency?.symbol || ''}${amount || '0.00'} ${selectedCurrency?.code || ''}`}
                </PButton>
              </form>
            </div>
          </div>

          {/* 充值说明 */}
          <div className="space-y-6">
            {/* 充值说明 */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center mb-4">
                  <BanknotesIcon className="h-6 w-6 text-blue-600 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">充值说明</h3>
                </div>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start">
                    <div className="h-2 w-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <p>充值金额将实时到账到您的钱包余额</p>
                  </div>
                  <div className="flex items-start">
                    <div className="h-2 w-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <p>支持支付宝、微信支付和银行卡等多种支付方式</p>
                  </div>
                  <div className="flex items-start">
                    <div className="h-2 w-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <p>单笔充值限额：¥50 - ¥50,000</p>
                  </div>
                  <div className="flex items-start">
                    <div className="h-2 w-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <p>充值不收取任何手续费</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 安全提示 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <BanknotesIcon className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">安全提示</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>请确保在安全的网络环境下进行充值</li>
                      <li>不要将支付密码告知他人</li>
                      <li>如遇问题请及时联系客服</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* 常见问题 */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">常见问题</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">充值多久到账？</p>
                    <p className="text-gray-600">充值通常在1-5分钟内到账，如遇延迟请稍后查看。</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">充值失败怎么办？</p>
                    <p className="text-gray-600">请检查网络连接和支付信息，或尝试其他支付方式。</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">可以取消充值吗？</p>
                    <p className="text-gray-600">充值成功后无法取消，请确认金额后再进行充值。</p>
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