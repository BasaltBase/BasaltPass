import { useState } from 'react'
import { recharge } from '@api/user/wallet'
import { useNavigate } from 'react-router-dom'
import Layout from '../../../components/Layout'
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

export default function Recharge() {
  const navigate = useNavigate()
  const [amount, setAmount] = useState('')
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

    setIsLoading(true)
    setError('')
    
    try {
      await recharge('USD', Number(amount) * 100)
      setSuccess(true)
      setTimeout(() => {
        navigate('/wallet')
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
          <button 
            onClick={() => navigate('/wallet')}
            className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
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
                {/* 金额输入 */}
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                    充值金额 (CNY)
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
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        ¥{value}
                      </button>
                    ))}
                  </div>
                </div>

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
                <button
                  type="submit"
                  disabled={isLoading || !amount || parseFloat(amount) <= 0}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    `充值 ¥${amount || '0.00'}`
                  )}
                </button>
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