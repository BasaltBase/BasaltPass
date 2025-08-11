import React, { useState, useEffect } from 'react';
import { 
  CurrencyDollarIcon,
  WalletIcon,
  LockClosedIcon,
  ArrowTrendingUpIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { adminWalletApi, WalletStats } from '../../api/adminWallet';
import { PButton } from '../index';

interface WalletStatsCardProps {}

const WalletStatsCard: React.FC<WalletStatsCardProps> = () => {
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [loading, setLoading] = useState(false);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await adminWalletApi.getWalletStats();
      setStats(response.data);
    } catch (error) {
      console.error('加载钱包统计失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (!stats) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">钱包统计</h3>
          <PButton
            variant="ghost"
            size="sm"
            onClick={loadStats}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 p-2"
          >
            <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </PButton>
        </div>
        <div className="mt-4">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-200 rounded h-20"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      name: '总钱包数',
      value: stats?.total_wallets || 0,
      icon: WalletIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: '活跃钱包',
      value: stats?.active_wallets || 0,
      icon: ArrowTrendingUpIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: '冻结钱包',
      value: stats?.frozen_wallets || 0,
      icon: LockClosedIcon,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      name: '24小时交易',
      value: stats?.recent_transactions_24h || 0,
      icon: CurrencyDollarIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">钱包统计</h3>
        <PButton
          variant="ghost"
          size="sm"
          onClick={loadStats}
          disabled={loading}
          className="text-gray-400 hover:text-gray-600 p-2"
        >
          <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </PButton>
      </div>

      {/* 基础统计卡片 */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {statCards.map((stat) => (
          <div key={stat.name} className="relative bg-white p-5 border border-gray-200 rounded-lg">
            <div className="flex items-center">
              <div className={`flex-shrink-0 p-3 ${stat.bgColor} rounded-md`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                  <dd className="text-lg font-semibold text-gray-900">{stat.value.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 货币余额统计 */}
      {stats?.currency_balances && stats.currency_balances.length > 0 && (
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">各货币总余额</h4>
          <div className="space-y-3">
            {stats.currency_balances.map((balance: any) => (
              <div key={balance.currency_code} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md">
                <span className="text-sm font-medium text-gray-900">{balance.currency_code}</span>
                <span className="text-sm text-gray-600">
                  {(balance.total_balance || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 6,
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletStatsCard;
