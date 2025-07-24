import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import client from '../../api/client'
import { Link } from 'react-router-dom'
import { ChevronRightIcon } from '@heroicons/react/24/outline'

interface WalletTx {
  ID: number
  WalletID: number
  Type: string
  Amount: number
  Status: string
  CreatedAt: string
  Wallet: {
    ID: number
    UserID?: number
    TeamID?: number
    Currency: string
    Balance: number
  }
}

export default function Wallets() {
  const [txs, setTxs] = useState<WalletTx[]>([])

  const load = () => {
    client.get<WalletTx[]>('/api/v1/admin/wallets').then((r) => setTxs(r.data))
  }
  useEffect(load, [])

  return (
    <Layout>
      <div className="space-y-6">
        {/* 面包屑导航 */}
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-4">
            <li>
              <Link to="/dashboard" className="text-gray-400 hover:text-gray-500">
                仪表板
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <ChevronRightIcon className="flex-shrink-0 h-5 w-5 text-gray-400" />
                <Link to="/admin/subscriptions" className="ml-4 text-gray-400 hover:text-gray-500">
                  订阅管理
                </Link>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <ChevronRightIcon className="flex-shrink-0 h-5 w-5 text-gray-400" />
                <span className="ml-4 text-sm font-medium text-gray-500">钱包管理</span>
              </div>
            </li>
          </ol>
        </nav>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">钱包管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            查看和管理用户钱包信息
          </p>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">钱包列表</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">余额</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">货币</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {txs.map((t) => (
                  <tr key={t.ID} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{t.ID}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{t.Wallet?.UserID ?? '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{(t.Amount / 100).toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{t.Wallet?.Currency || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
} 