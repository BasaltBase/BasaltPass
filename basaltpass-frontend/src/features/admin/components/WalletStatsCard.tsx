import React, { useState, useEffect } from 'react';
import { 
  CurrencyDollarIcon,
  WalletIcon,
  LockClosedIcon,
  ArrowTrendingUpIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { adminWalletApi, WalletStats } from '@api/admin/wallet';
import { useI18n } from '@shared/i18n';
import { PButton } from '@ui';

interface WalletStatsCardProps {}

const WalletStatsCard: React.FC<WalletStatsCardProps> = () => {
  const { t, locale } = useI18n();
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [loading, setLoading] = useState(false);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await adminWalletApi.getWalletStats();
      setStats(response.data);
    } catch (error) {
      console.error(t('adminWalletStatsCard.logs.loadStatsFailed'), error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (!stats) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">{t('adminWalletStatsCard.title')}</h3>
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
      name: t('adminWalletStatsCard.cards.totalWallets'),
      value: stats?.total_wallets || 0,
      icon: WalletIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: t('adminWalletStatsCard.cards.activeWallets'),
      value: stats?.active_wallets || 0,
      icon: ArrowTrendingUpIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: t('adminWalletStatsCard.cards.frozenWallets'),
      value: stats?.frozen_wallets || 0,
      icon: LockClosedIcon,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      name: t('adminWalletStatsCard.cards.transactions24h'),
      value: stats?.recent_transactions_24h || 0,
      icon: CurrencyDollarIcon,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
    },
  ];

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">{t('adminWalletStatsCard.title')}</h3>
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

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {statCards.map((stat) => (
          <div key={stat.name} className="relative rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center">
              <div className={`flex-shrink-0 rounded-lg p-3 ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                  <dd className="text-lg font-semibold text-gray-900">{stat.value.toLocaleString(locale)}</dd>
                </dl>
              </div>
            </div>
          </div>
        ))}
      </div>

      {stats?.currency_balances && stats.currency_balances.length > 0 && (
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">{t('adminWalletStatsCard.currencyBalancesTitle')}</h4>
          <div className="space-y-3">
            {stats.currency_balances.map((balance: any) => (
              <div key={balance.currency_code} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                <span className="text-sm font-medium text-gray-900">{balance.currency_code}</span>
                <span className="text-sm text-gray-600">
                  {(balance.total_balance || 0).toLocaleString(locale, {
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
