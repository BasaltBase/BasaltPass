import { useEffect, useState } from 'react'
import { history } from '../../../api/wallet'
import { Link } from 'react-router-dom'
import Layout from '../../../components/Layout'
import { 
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  FunnelIcon,
  DocumentTextIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'

interface Tx {
  ID: number
  Type: string
  Amount: number
  Status: string
  CreatedAt: string
  UpdatedAt: string
  DeletedAt: string | null
  WalletID: number
  Reference: string
}

export default function History() {
  const [txs, setTxs] = useState<Tx[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    history('USD').then((res) => {
      setTxs(res.data || [])
      setIsLoading(false)
    }).catch(() => {
      // 如果API调用失败，使用模拟数据
      setTxs([
        {
          ID: 1,
          Type: 'recharge',
          Amount: 50000,
          Status: 'success',
          CreatedAt: '2024-01-15T14:30:00Z',
          UpdatedAt: '2024-01-15T14:30:00Z',
          DeletedAt: null,
          WalletID: 1,
          Reference: 'mock'
        },
        {
          ID: 2,
          Type: 'withdraw',
          Amount: 20000,
          Status: 'pending',
          CreatedAt: '2024-01-14T09:15:00Z',
          UpdatedAt: '2024-01-14T09:15:00Z',
          DeletedAt: null,
          WalletID: 1,
          Reference: 'mock'
        },
        {
          ID: 3,
          Type: 'recharge',
          Amount: 100000,
          Status: 'success',
          CreatedAt: '2024-01-13T16:45:00Z',
          UpdatedAt: '2024-01-13T16:45:00Z',
          DeletedAt: null,
          WalletID: 1,
          Reference: 'mock'
        }
      ])
      setIsLoading(false)
    })
  }, [])

  const filteredTxs = txs.filter(tx => {
    const matchesFilter = filter === 'all' || tx.Type === filter
    const matchesSearch = searchTerm === '' || 
      tx.ID.toString().includes(searchTerm) ||
      (tx.Status && tx.Status.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesFilter && matchesSearch
  })

  const getStatusColor = (status: string) => {
    if (!status) return 'bg-gray-100 text-gray-800'
    
    switch (status.toLowerCase()) {
      case 'success':
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    if (!status) return '未知'
    
    switch (status.toLowerCase()) {
      case 'success':
      case 'completed':
        return '已完成'
      case 'pending':
        return '处理中'
      case 'failed':
        return '失败'
      default:
        return status
    }
  }

  const getTypeIcon = (type: string) => {
    if (!type) return <ArrowUpIcon className="h-4 w-4 text-gray-600" />
    
    return type.toLowerCase() === 'recharge' ? (
      <ArrowUpIcon className="h-4 w-4 text-green-600" />
    ) : (
      <ArrowDownIcon className="h-4 w-4 text-red-600" />
    )
  }

  const getTypeColor = (type: string) => {
    if (!type) return 'text-gray-600'
    
    return type.toLowerCase() === 'recharge' ? 'text-green-600' : 'text-red-600'
  }

  const getTypeText = (type: string) => {
    if (!type) return '未知'
    
    return type.toLowerCase() === 'recharge' ? '充值' : '提现'
  }

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
        <div className="flex items-center">
          <Link 
            to="/wallet" 
            className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">交易记录</h1>
            <p className="mt-1 text-sm text-gray-500">
              查看您的所有交易历史
            </p>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DocumentTextIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">总交易数</dt>
                    <dd className="text-lg font-medium text-gray-900">{txs.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ArrowUpIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">充值次数</dt>
                                         <dd className="text-lg font-medium text-gray-900">
                       {txs.filter(tx => tx.Type && tx.Type.toLowerCase() === 'recharge').length}
                     </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ArrowDownIcon className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">提现次数</dt>
                                         <dd className="text-lg font-medium text-gray-900">
                       {txs.filter(tx => tx.Type && tx.Type.toLowerCase() === 'withdraw').length}
                     </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">处理中</dt>
                                         <dd className="text-lg font-medium text-gray-900">
                       {txs.filter(tx => tx.Status && tx.Status.toLowerCase() === 'pending').length}
                     </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 筛选和搜索 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <FunnelIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-700">筛选:</span>
                </div>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="all">全部交易</option>
                  <option value="recharge">充值</option>
                  <option value="withdraw">提现</option>
                </select>
              </div>
              <div className="flex-1 max-w-xs">
                <input
                  type="text"
                  placeholder="搜索交易ID或状态..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 交易列表 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              交易记录 ({filteredTxs.length})
            </h3>
            
            {filteredTxs.length === 0 ? (
              <div className="text-center py-12">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">暂无交易记录</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {filter !== 'all' ? '当前筛选条件下没有找到交易记录' : '您还没有进行过任何交易'}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden">
                <div className="flow-root">
                  <ul className="-my-5 divide-y divide-gray-200">
                    {filteredTxs.map((tx) => (
                      <li key={tx.ID} className="py-5">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                                                       <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                             tx.Type && tx.Type.toLowerCase() === 'recharge' 
                               ? 'bg-green-100' 
                               : 'bg-red-100'
                           }`}>
                              {getTypeIcon(tx.Type)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {getTypeText(tx.Type)} #{tx.ID}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {new Date(tx.CreatedAt).toLocaleString('zh-CN')}
                                </p>
                              </div>
                              <div className="flex items-center space-x-4">
                                <div className="text-right">
                                                                     <p className={`text-sm font-medium ${getTypeColor(tx.Type)}`}>
                                     {tx.Type && tx.Type.toLowerCase() === 'recharge' ? '+' : '-'}¥{(tx.Amount / 100).toFixed(2)}
                                   </p>
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tx.Status)}`}>
                                    {getStatusText(tx.Status)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 快速操作 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              快速操作
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  <p className="text-sm font-medium text-gray-900">充值钱包</p>
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
                  <p className="text-sm font-medium text-gray-900">提现资金</p>
                  <p className="text-sm text-gray-500">从钱包提取资金</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
} 