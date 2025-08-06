import { useState } from 'react'
import { withdraw } from '@api/user/wallet'
import { Currency } from '@api/user/currency'
import { useNavigate } from 'react-router-dom'
import Layout from '../../../components/Layout'
import CurrencySelector from '../../../components/CurrencySelector'
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
    name: '支付宝',
    icon: QrCodeIcon,
    description: '实时到账',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  {
    id: 'bank',
    name: '银行卡',
    icon: CreditCardIcon,
    description: '1-3个工作日',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  },
  {
    id: 'wechat',
    name: '微信支付',
    icon: QrCodeIcon,
    description: '实时到账',
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  }
]

const quickAmounts = [50, 100, 200, 500, 1000, 2000]

export default function Withdraw() {
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
    
    if (!amount || parseFloat(amount) <= 0) {
      setError('请输入有效的提现金额')
      return
    }

    if (!selectedCurrency) {
      setError('请选择提现货币')
      return
    }

    if (!accountInfo.trim()) {
      setError('请输入收款账户信息')
      return
    }

    setIsLoading(true)
    setError('')
    
    try {
      // 根据货币的小数位数计算最小单位金额
      const decimals = selectedCurrency.decimal_places
      const amountInSmallestUnit = Math.round(Number(amount) * Math.pow(10, decimals))
      
      await withdraw(selectedCurrency.code, amountInSmallestUnit)
      setSuccess(true)
      setTimeout(() => {
        navigate('/wallet')
      }, 3000)
    } catch (e: any) {
      setError(e.response?.data?.error || '提现失败，请重试')
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
        return '请输入支付宝账号'
      case 'bank':
        return '请输入银行卡号'
      case 'wechat':
        return '请输入微信账号'
      default:
        return '请输入账户信息'
    }
  }

  if (success) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <CheckCircleIcon className="mx-auto h-16 w-16 text-green-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">提现申请已提交！</h2>
            <p className="text-gray-600 mb-4">我们将在1-3个工作日内处理您的提现请求</p>
            <p className="text-sm text-gray-500">正在跳转到钱包页面...</p>
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
          <button 
            onClick={() => navigate('/wallet')}
            className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">提现资金</h1>
            <p className="mt-1 text-sm text-gray-500">
              选择提现方式并输入金额
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
                <p className="text-sm font-medium text-red-800">提现失败</p>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 提现表单 */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center mb-6">
                <ArrowDownIcon className="h-6 w-6 text-red-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">提现信息</h3>
              </div>
              
              <form onSubmit={submit} className="space-y-6">
                {/* 金额输入 */}
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                    提现金额 (CNY)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">¥</span>
                    </div>
                    <input
                      id="amount"
                      type="number"
                      value={amount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      placeholder="0.00"
                      min="0.01"
                      step="0.01"
                      className="block w-full pl-7 pr-12 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">CNY</span>
                    </div>
                  </div>
                </div>

                {/* 快速金额选择 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    快速选择金额
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {quickAmounts.map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleQuickAmount(value)}
                        className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                          amount === value.toString()
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        ¥{value}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 提现方式选择 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    选择提现方式
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
                            <p className="text-sm font-medium text-gray-900">{method.name}</p>
                            <p className="text-sm text-gray-500">{method.description}</p>
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

                {/* 收款账户信息 */}
                <div>
                  <label htmlFor="accountInfo" className="block text-sm font-medium text-gray-700 mb-2">
                    收款账户信息
                  </label>
                  <input
                    id="accountInfo"
                    type="text"
                    value={accountInfo}
                    onChange={(e) => setAccountInfo(e.target.value)}
                    placeholder={getAccountPlaceholder()}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                {/* 提交按钮 */}
                <button
                  type="submit"
                  disabled={isLoading || !amount || parseFloat(amount) <= 0 || !accountInfo.trim()}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      处理中...
                    </>
                  ) : (
                    `提现 ¥${amount || '0.00'}`
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* 提现说明 */}
          <div className="space-y-6">
            {/* 提现说明 */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center mb-4">
                  <BanknotesIcon className="h-6 w-6 text-red-600 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">提现说明</h3>
                </div>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start">
                    <div className="h-2 w-2 bg-red-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <p>支付宝/微信提现通常在24小时内到账</p>
                  </div>
                  <div className="flex items-start">
                    <div className="h-2 w-2 bg-red-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <p>银行卡提现需要1-3个工作日</p>
                  </div>
                  <div className="flex items-start">
                    <div className="h-2 w-2 bg-red-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <p>单笔提现限额：¥50 - ¥50,000</p>
                  </div>
                  <div className="flex items-start">
                    <div className="h-2 w-2 bg-red-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <p>提现手续费：免费</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 重要提示 */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <InformationCircleIcon className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">重要提示</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>请确保收款账户信息准确无误</li>
                      <li>提现申请提交后无法取消</li>
                      <li>如遇问题请及时联系客服</li>
                      <li>工作日9:00-18:00处理提现申请</li>
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
                    <p className="font-medium text-gray-900">提现多久到账？</p>
                    <p className="text-gray-600">支付宝/微信24小时内，银行卡1-3个工作日。</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">提现失败怎么办？</p>
                    <p className="text-gray-600">请检查账户信息是否正确，或联系客服处理。</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">可以取消提现吗？</p>
                    <p className="text-gray-600">提现申请提交后无法取消，请确认信息后再提交。</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">提现手续费是多少？</p>
                    <p className="text-gray-600">目前提现完全免费，不收取任何手续费。</p>
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
                      <li>请确保在安全的网络环境下操作</li>
                      <li>不要将账户信息告知他人</li>
                      <li>定期检查提现记录</li>
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