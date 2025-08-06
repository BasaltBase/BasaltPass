import { useEffect, useState } from 'react'
import { getBalance } from '@api/user/wallet'
import { getCurrencies, Currency } from '@api/user/currency'
import { Link } from 'react-router-dom'
import Layout from '../../../components/Layout'
import CurrencySelector from '../../../components/CurrencySelector'
import { 
  WalletIcon, 
  ArrowUpIcon, 
  ArrowDownIcon, 
  ClockIcon,
  CurrencyDollarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

export default function WalletIndex() {
  const [balance, setBalance] = useState<number | null>(null)
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 初始化时加载货币列表并设置默认货币
    loadDefaultCurrency()
  }, [])

  useEffect(() => {
    if (selectedCurrency) {
      loadBalance()
    }
  }, [selectedCurrency])

  const loadDefaultCurrency = async () => {
    try {
      const response = await getCurrencies()
      if (response.data.length > 0) {
        // 优先选择USD，如果没有则选择第一个
        const defaultCurrency = response.data.find(c => c.code === 'USD') || response.data[0]
        setSelectedCurrency(defaultCurrency)
      } else {
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Failed to load currencies:', error)
      setIsLoading(false)
    }
  }

  const loadBalance = async () => {
    if (!selectedCurrency) return
    
    try {
      const res = await getBalance(selectedCurrency.code)
      setBalance(res.data.balance)
    } catch (error) {
      console.error('Failed to load balance:', error)
      setBalance(null)
    } finally {
      setIsLoading(false)
    }
  }

  const formatBalance = (balance: number, currency: Currency) => {
    const amount = balance / Math.pow(10, currency.decimal_places)
    return `${currency.symbol}${amount.toFixed(Math.min(currency.decimal_places, 8))}`
  }

  const walletStats = [
    {
      name: '当前余额',
      value: selectedCurrency && balance !== null 
        ? formatBalance(balance, selectedCurrency)
        : '--',
      icon: WalletIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      name: '本月收入',
      value: '+$1,250.00',
      icon: ChartBarIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      name: '本月支出',
      value: '-$450.00',
      icon: ChartBarIcon,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    }
  ]

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题和货币选择 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">我的钱包</h1>
            <p className="mt-1 text-sm text-gray-500">
              管理您的资金和交易
            </p>
          </div>
          {!isLoading && (
            <div className="w-64">
              <CurrencySelector
                value={selectedCurrency?.code || ''}
                onChange={(currency) => {
                  setSelectedCurrency(currency)
                  setIsLoading(true)
                }}
              />
            </div>
          )}
        </div>

        {/* 钱包概览 */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg">
          <div className="px-6 py-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">
                  当前余额 {selectedCurrency && `(${selectedCurrency.code})`}
                </p>
                <p className="text-white text-3xl font-bold">
                  {selectedCurrency && balance !== null 
                    ? formatBalance(balance, selectedCurrency)
                    : '--'
                  }
                </p>
                <p className="text-blue-100 text-sm mt-1">
                  最后更新: {new Date().toLocaleString('zh-CN')}
                </p>
              </div>
              <div className="h-16 w-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <WalletIcon className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {walletStats.map((stat) => (
            <div
              key={stat.name}
              className="relative overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:px-6"
            >
              <dt>
                <div className={`absolute rounded-md ${stat.bgColor} p-3`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <p className="ml-16 truncate text-sm font-medium text-gray-500">
                  {stat.name}
                </p>
              </dt>
              <dd className="ml-16 flex items-baseline">
                <p className={`text-2xl font-semibold ${stat.color}`}>
                  {stat.value}
                </p>
              </dd>
            </div>
          ))}
        </div>

        {/* 快速操作 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              快速操作
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Link
                to="/wallet/recharge"
                className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-green-400 hover:bg-green-50 focus-within:ring-2 focus-within:ring-green-500 focus-within:ring-offset-2 transition-colors"
              >
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <ArrowUpIcon className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">充值</p>
                  <p className="text-sm text-gray-500">向钱包充值资金</p>
                </div>
              </Link>

              <Link
                to="/wallet/withdraw"
                className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-red-400 hover:bg-red-50 focus-within:ring-2 focus-within:ring-red-500 focus-within:ring-offset-2 transition-colors"
              >
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <ArrowDownIcon className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">提现</p>
                  <p className="text-sm text-gray-500">从钱包提取资金</p>
                </div>
              </Link>

              <Link
                to="/wallet/history"
                className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-blue-400 hover:bg-blue-50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 transition-colors"
              >
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <ClockIcon className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">交易记录</p>
                  <p className="text-sm text-gray-500">查看历史交易</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* 最近交易预览 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                最近交易
              </h3>
              <Link
                to="/wallet/history"
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                查看全部
              </Link>
            </div>
            <div className="flow-root">
              <ul className="-my-5 divide-y divide-gray-200">
                <li className="py-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                        <ArrowUpIcon className="h-4 w-4 text-green-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        支付宝充值
                      </p>
                      <p className="text-sm text-gray-500">
                        2024-01-15 14:30
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm font-medium text-green-600">+¥500.00</p>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        已完成
                      </span>
                    </div>
                  </div>
                </li>
                <li className="py-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                        <ArrowDownIcon className="h-4 w-4 text-red-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        提现到银行卡
                      </p>
                      <p className="text-sm text-gray-500">
                        2024-01-14 09:15
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm font-medium text-red-600">-¥200.00</p>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        处理中
                      </span>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
} 