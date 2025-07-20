import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { 
  WalletIcon, 
  UserIcon, 
  ShieldCheckIcon,
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CurrencyDollarIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface WalletData {
  balance: number
  currency: string
}

interface RecentTransaction {
  id: string
  type: 'recharge' | 'withdraw'
  amount: number
  status: 'pending' | 'completed' | 'failed'
  date: string
  description: string
}

export default function Dashboard() {
  const [walletData, setWalletData] = useState<WalletData>({ balance: 0, currency: 'CNY' })
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 模拟数据加载
    setTimeout(() => {
      setWalletData({ balance: 1250.50, currency: 'CNY' })
      setRecentTransactions([
        {
          id: '1',
          type: 'recharge',
          amount: 500,
          status: 'completed',
          date: '2024-01-15',
          description: '支付宝充值'
        },
        {
          id: '2',
          type: 'withdraw',
          amount: 200,
          status: 'pending',
          date: '2024-01-14',
          description: '提现到银行卡'
        },
        {
          id: '3',
          type: 'recharge',
          amount: 1000,
          status: 'completed',
          date: '2024-01-13',
          description: '微信支付充值'
        }
      ])
      setIsLoading(false)
    }, 1000)
  }, [])

  const stats = [
    {
      name: '钱包余额',
      value: `¥${walletData.balance.toFixed(2)}`,
      icon: WalletIcon,
      change: '+12.5%',
      changeType: 'positive' as const,
    },
    {
      name: '本月交易',
      value: '24',
      icon: ChartBarIcon,
      change: '+8.2%',
      changeType: 'positive' as const,
    },
    {
      name: '安全等级',
      value: '高',
      icon: ShieldCheckIcon,
      change: '已启用2FA',
      changeType: 'neutral' as const,
    },
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
        {/* 页面标题 */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">仪表板</h1>
          <p className="mt-1 text-sm text-gray-500">
            欢迎回来！这里是您的账户概览
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((item) => (
            <div
              key={item.name}
              className="relative overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:px-6"
            >
              <dt>
                <div className="absolute rounded-md bg-blue-500 p-3">
                  <item.icon className="h-6 w-6 text-white" />
                </div>
                <p className="ml-16 truncate text-sm font-medium text-gray-500">
                  {item.name}
                </p>
              </dt>
              <dd className="ml-16 flex items-baseline">
                <p className="text-2xl font-semibold text-gray-900">{item.value}</p>
                                  <p
                    className={`ml-2 flex items-baseline text-sm font-semibold ${
                      item.changeType === 'positive'
                        ? 'text-green-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {item.changeType === 'positive' && (
                      <ArrowUpIcon className="h-4 w-4 flex-shrink-0 self-center" />
                    )}
                    <span className="sr-only">
                      {item.changeType === 'positive' ? '增加' : '状态'}
                    </span>
                    {item.change}
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Link
                to="/wallet/recharge"
                className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2"
              >
                <div className="flex-shrink-0">
                  <ArrowUpIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">充值</p>
                  <p className="text-sm text-gray-500">向钱包充值</p>
                </div>
              </Link>

              <Link
                to="/wallet/withdraw"
                className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2"
              >
                <div className="flex-shrink-0">
                  <ArrowDownIcon className="h-6 w-6 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">提现</p>
                  <p className="text-sm text-gray-500">从钱包提现</p>
                </div>
              </Link>

              <Link
                to="/wallet/history"
                className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2"
              >
                <div className="flex-shrink-0">
                  <ClockIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">交易记录</p>
                  <p className="text-sm text-gray-500">查看历史记录</p>
                </div>
              </Link>

              <Link
                to="/security/2fa"
                className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2"
              >
                <div className="flex-shrink-0">
                  <ShieldCheckIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">安全设置</p>
                  <p className="text-sm text-gray-500">管理账户安全</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* 最近交易 */}
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
                {recentTransactions.map((transaction) => (
                  <li key={transaction.id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          transaction.type === 'recharge' 
                            ? 'bg-green-100' 
                            : 'bg-red-100'
                        }`}>
                          {transaction.type === 'recharge' ? (
                            <ArrowUpIcon className="h-4 w-4 text-green-600" />
                          ) : (
                            <ArrowDownIcon className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {transaction.description}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(transaction.date).toLocaleDateString('zh-CN')}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className={`text-sm font-medium ${
                          transaction.type === 'recharge' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'recharge' ? '+' : '-'}¥{transaction.amount}
                        </p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          transaction.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : transaction.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {transaction.status === 'completed' ? '已完成' : 
                           transaction.status === 'pending' ? '处理中' : '失败'}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
} 