import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  LockClosedIcon,
  LockOpenIcon,
  EyeIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CurrencyDollarIcon,
  UsersIcon,
  UserGroupIcon,
  WalletIcon
} from '@heroicons/react/24/outline';
import { adminWalletApi, Wallet, Currency, CreateWalletRequest, AdjustBalanceRequest, AdjustOwnerWalletRequest, WalletTransaction } from '@api/admin/wallet';
import AdminLayout from '@features/admin/components/AdminLayout';
import WalletStatsCard from '@features/admin/components/WalletStatsCard';
import { PInput, PSelect, PButton, PCard, PSkeleton, PBadge, PTextarea, UserTooltip } from '@ui';

interface WalletManagementProps {}

const WalletManagement: React.FC<WalletManagementProps> = () => {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // Modal states
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [adjustModalVisible, setAdjustModalVisible] = useState(false);
  const [quickAdjustModalVisible, setQuickAdjustModalVisible] = useState(false);
  const [transactionsModalVisible, setTransactionsModalVisible] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [transactionWallet, setTransactionWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [quickAdjustMode, setQuickAdjustMode] = useState<'delta' | 'target'>('delta');
  const [createWalletType, setCreateWalletType] = useState<'user' | 'team'>('user');
  
  // Form data
  const [createForm, setCreateForm] = useState<CreateWalletRequest>({
    currency_code: '',
    initial_balance: 0,
  });
  const [adjustForm, setAdjustForm] = useState<AdjustBalanceRequest>({
    amount: 0,
    reason: '',
  });
  const [quickAdjustForm, setQuickAdjustForm] = useState<AdjustOwnerWalletRequest & { owner_type: 'user' | 'team'; owner_id?: number }>({
    owner_type: 'user',
    owner_id: undefined,
    currency_code: '',
    amount: 0,
    reason: '',
    create_if_missing: true,
  });
  
  // Filters
  const [filters, setFilters] = useState({
    user_id: '',
    team_id: '',
    currency_code: '',
  });

  // 加载钱包列表
  const loadWallets = async (page = currentPage, size = pageSize) => {
    try {
      setLoading(true);
      const filterParams: any = { page, page_size: size };
      
      if (filters.user_id && filters.user_id.trim()) filterParams.user_id = Number(filters.user_id);
      if (filters.team_id && filters.team_id.trim()) filterParams.team_id = Number(filters.team_id);
      if (filters.currency_code && filters.currency_code.trim()) filterParams.currency_code = filters.currency_code;
      
      const response = await adminWalletApi.getWallets(filterParams);
      if (response && response.data && response.meta) {
        setWallets(response.data);
        setTotal(response.meta.total);
        setCurrentPage(response.meta.page);
        setPageSize(response.meta.page_size);
      } else {
        console.error('Invalid response format:', response);
        setWallets([]);
        setTotal(0);
      }
    } catch (error) {
      console.error('加载钱包列表失败:', error);
      setWallets([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // 加载货币列表
  const loadCurrencies = async () => {
    try {
      const response = await adminWalletApi.getCurrencies();
      if (response && response.data && Array.isArray(response.data)) {
        setCurrencies(response.data);
      } else {
        console.error('Invalid currencies response format:', response);
        setCurrencies([]);
      }
    } catch (error) {
      console.error('加载货币列表失败:', error);
      setCurrencies([]);
    }
  };

  useEffect(() => {
    loadWallets();
    loadCurrencies();
  }, []);

  useEffect(() => {
    setCurrentPage(1); // 重置到第一页
    loadWallets(1, pageSize);
  }, [filters, pageSize]);

  // 创建钱包
  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证必须选择钱包类型
    if (!createForm.user_id && !createForm.team_id) {
      uiAlert('请选择钱包类型并输入对应的ID');
      return;
    }
    
    setCreateLoading(true);
    try {
      await adminWalletApi.createWallet(createForm);
      uiAlert('钱包创建成功');
      setCreateModalVisible(false);
      setCreateForm({ currency_code: '', initial_balance: 0, user_id: undefined, team_id: undefined });
      setCreateWalletType('user');
      loadWallets();
    } catch (error: any) {
      uiAlert(error.response?.data?.error || '创建钱包失败');
    } finally {
      setCreateLoading(false);
    }
  };

  // 调整余额
  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWallet) return;
    
    setAdjustLoading(true);
    try {
      await adminWalletApi.adjustBalance(selectedWallet.id, adjustForm);
      uiAlert('余额调整成功');
      setAdjustModalVisible(false);
      setAdjustForm({ amount: 0, reason: '' });
      setSelectedWallet(null);
      loadWallets();
    } catch (error: any) {
      uiAlert(error.response?.data?.error || '调整余额失败');
    } finally {
      setAdjustLoading(false);
    }
  };

  const resetQuickAdjustForm = () => {
    setQuickAdjustForm({
      owner_type: 'user',
      owner_id: undefined,
      currency_code: '',
      amount: 0,
      reason: '',
      create_if_missing: true,
    });
  };

  const convertToSmallestUnit = (amount: number, decimalPlaces: number) => {
    const multiplier = Math.pow(10, decimalPlaces);
    return Math.trunc(amount * multiplier);
  };

  const convertFromSmallestUnit = (amount: number, decimalPlaces: number) => {
    return amount / Math.pow(10, decimalPlaces);
  };

  const resolveOwnerWallet = async () => {
    if (!quickAdjustForm.owner_id || !quickAdjustForm.currency_code) return null;

    const response = quickAdjustForm.owner_type === 'user'
      ? await adminWalletApi.getUserWallets(quickAdjustForm.owner_id)
      : await adminWalletApi.getTeamWallets(quickAdjustForm.owner_id);

    return (response.data || []).find(wallet => wallet.currency?.code === quickAdjustForm.currency_code) || null;
  };

  const handleQuickAdjust = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!quickAdjustForm.owner_id) {
      uiAlert('请输入用户或团队 ID');
      return;
    }
    if (!quickAdjustForm.currency_code) {
      uiAlert('请选择货币类型');
      return;
    }
    if (!quickAdjustForm.reason.trim()) {
      uiAlert('请输入调整原因');
      return;
    }
    if (!quickAdjustForm.amount) {
      uiAlert('调整金额不能为 0');
      return;
    }

    setAdjustLoading(true);
    try {
      let requestAmount = quickAdjustForm.amount;
      if (quickAdjustMode === 'target') {
        const existingWallet = await resolveOwnerWallet();
        const currencyMeta = existingWallet?.currency || currencies.find(currency => currency.code === quickAdjustForm.currency_code);
        if (!currencyMeta) {
          uiAlert('未找到对应货币配置');
          return;
        }
        const targetSmallest = convertToSmallestUnit(quickAdjustForm.amount, currencyMeta.decimal_places);
        const currentSmallest = existingWallet?.balance || 0;
        const deltaSmallest = targetSmallest - currentSmallest;
        requestAmount = convertFromSmallestUnit(deltaSmallest, currencyMeta.decimal_places);
        if (!requestAmount) {
          uiAlert('目标余额与当前余额相同，无需调整');
          return;
        }
      }

      if (quickAdjustForm.owner_type === 'user') {
        await adminWalletApi.adjustUserWallet(quickAdjustForm.owner_id, {
          currency_code: quickAdjustForm.currency_code,
          amount: requestAmount,
          reason: quickAdjustForm.reason,
          create_if_missing: quickAdjustForm.create_if_missing,
        });
      } else {
        await adminWalletApi.adjustTeamWallet(quickAdjustForm.owner_id, {
          currency_code: quickAdjustForm.currency_code,
          amount: requestAmount,
          reason: quickAdjustForm.reason,
          create_if_missing: quickAdjustForm.create_if_missing,
        });
      }

      uiAlert('余额调整成功');
      setQuickAdjustModalVisible(false);
      setQuickAdjustMode('delta');
      resetQuickAdjustForm();
      loadWallets();
    } catch (error: any) {
      uiAlert(error.response?.data?.error || '调整余额失败');
    } finally {
      setAdjustLoading(false);
    }
  };

  const openTransactionsModal = async (wallet: Wallet) => {
    setTransactionWallet(wallet);
    setTransactionsModalVisible(true);
    setTransactionLoading(true);
    try {
      const response = await adminWalletApi.getWalletTransactions(wallet.id, { page: 1, page_size: 50 });
      setTransactions(response.data || []);
    } catch (error: any) {
      uiAlert(error.response?.data?.error || '加载交易记录失败');
      setTransactions([]);
    } finally {
      setTransactionLoading(false);
    }
  };

  // 冻结钱包
  const handleFreezeWallet = async (wallet: Wallet) => {
    if (!await uiConfirm('确定要冻结这个钱包吗？')) return;
    
    try {
      await adminWalletApi.freezeWallet(wallet.id);
      uiAlert('钱包已冻结');
      loadWallets();
    } catch (error: any) {
      uiAlert(error.response?.data?.error || '冻结钱包失败');
    }
  };

  // 解冻钱包
  const handleUnfreezeWallet = async (wallet: Wallet) => {
    if (!await uiConfirm('确定要解冻这个钱包吗？')) return;
    
    try {
      await adminWalletApi.unfreezeWallet(wallet.id);
      uiAlert('钱包已解冻');
      loadWallets();
    } catch (error: any) {
      uiAlert(error.response?.data?.error || '解冻钱包失败');
    }
  };

  // 删除钱包
  const handleDeleteWallet = async (wallet: Wallet) => {
    if (!await uiConfirm('确定要删除这个钱包吗？只能删除余额为0的钱包。')) return;
    
    try {
      await adminWalletApi.deleteWallet(wallet.id);
      uiAlert('钱包已删除');
      loadWallets();
    } catch (error: any) {
      uiAlert(error.response?.data?.error || '删除钱包失败');
    }
  };

  // 格式化余额显示
  const formatBalance = (balance: number, currency: Currency) => {
    // 后端返回的余额是以最小单位计算的整数，需要转换为实际金额
    const actualBalance = balance / Math.pow(10, currency.decimal_places);
    return `${actualBalance.toFixed(currency.decimal_places)} ${currency.symbol}`;
  };

  // 获取钱包类型标签
  const getWalletTypeTag = (wallet: Wallet) => {
    if (wallet.user_id) {
      return <PBadge variant="info"><UsersIcon className="w-3 h-3 mr-1" />用户钱包</PBadge>;
    } else if (wallet.team_id) {
      return <PBadge variant="success"><UserGroupIcon className="w-3 h-3 mr-1" />团队钱包</PBadge>;
    }
    return <PBadge variant="default">未知类型</PBadge>;
  };

  // 获取钱包状态标签
  const getStatusTag = (status: string) => {
    switch (status) {
      case 'active': return <PBadge variant="success">活跃</PBadge>;
      case 'frozen': return <PBadge variant="error">冻结</PBadge>;
      default: return <PBadge variant="default">{status}</PBadge>;
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* 页面标题 */}
        <PCard variant="bordered" className="border-b-0 rounded-none">
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
                  <WalletIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-gray-900">钱包管理</h1>
                <p className="mt-1 text-sm text-gray-500">
                  管理用户和团队的各种货币钱包，包括余额调整、冻结解冻等操作
                </p>
              </div>
            </div>
          </div>
        </PCard>

        <div className="px-4 py-6 sm:px-6 lg:px-8">
          {/* 快速操作卡片 */}
          <PCard variant="bordered" className="mb-6">
            <div className="px-6 py-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="inline-block w-2 h-2 bg-indigo-500 rounded-full mr-2"></span>
                快速操作
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <PButton
                  onClick={() => setCreateModalVisible(true)}
                  variant="secondary"
                  className="group relative rounded-xl border border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-indigo-300 hover:shadow-md focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 transition-all duration-300"
                >
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      <PlusIcon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-gray-900">创建钱包</p>
                    <p className="text-sm text-gray-500">为用户或团队创建新钱包</p>
                  </div>
                </PButton>

                <PButton
                  onClick={() => setQuickAdjustModalVisible(true)}
                  variant="secondary"
                  className="group relative rounded-xl border border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-amber-300 hover:shadow-md focus-within:ring-2 focus-within:ring-amber-500 focus-within:ring-offset-2 transition-all duration-300"
                >
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      <PencilIcon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-gray-900">直接调余额</p>
                    <p className="text-sm text-gray-500">按用户/团队和币种快速调整</p>
                  </div>
                </PButton>

                <PButton
                  onClick={() => loadWallets()}
                  disabled={loading}
                  variant="secondary"
                  className="group relative rounded-xl border border-gray-200 bg-gradient-to-r from-blue-50 to-cyan-50 px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-blue-300 hover:shadow-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 transition-all duration-300 disabled:opacity-50"
                >
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-cyan-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      <ArrowPathIcon className={`h-5 w-5 text-white ${loading ? 'animate-spin' : ''}`} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-gray-900">刷新数据</p>
                    <p className="text-sm text-gray-500">重新加载钱包列表</p>
                  </div>
                </PButton>

                <PButton
                  onClick={() => window.open('/admin/analytics', '_blank')}
                  variant="secondary"
                  className="group relative rounded-xl border border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-green-300 hover:shadow-md focus-within:ring-2 focus-within:ring-green-500 focus-within:ring-offset-2 transition-all duration-300"
                >
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      <CurrencyDollarIcon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-gray-900">财务分析</p>
                    <p className="text-sm text-gray-500">查看钱包统计报告</p>
                  </div>
                </PButton>
              </div>
            </div>
          </PCard>

          {/* 钱包统计 */}
          <PCard variant="bordered" className="mb-6">
            <div className="px-6 py-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                钱包概览
              </h3>
              <WalletStatsCard />
            </div>
          </PCard>

          {/* 筛选器 */}
          <PCard variant="bordered" className="mb-6">
            <div className="px-6 py-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <span className="inline-block w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                  筛选条件
                </h3>
                <PButton
                  onClick={() => setFilters({ user_id: '', team_id: '', currency_code: '' })}
                  variant="secondary"
                  size="sm"
                  className="inline-flex items-center"
                >
                  <FunnelIcon className="h-4 w-4 mr-1" />
                  清除筛选
                </PButton>
              </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div>
                <PInput
                  id="user-id"
                  value={filters.user_id}
                  onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
                  placeholder="输入用户ID"
                  label={<><UsersIcon className="inline h-4 w-4 mr-1" />用户ID</>}
                  variant="rounded"
                />
              </div>
              <div>
                <PInput
                  id="team-id"
                  value={filters.team_id}
                  onChange={(e) => setFilters({ ...filters, team_id: e.target.value })}
                  placeholder="输入团队ID"
                  label={<><UserGroupIcon className="inline h-4 w-4 mr-1" />团队ID</>}
                  variant="rounded"
                />
              </div>
              <div>
                <PSelect
                  id="currency"
                  value={filters.currency_code}
                  onChange={(e) => setFilters({ ...filters, currency_code: e.target.value })}
                  label={<><CurrencyDollarIcon className="inline h-4 w-4 mr-1" />货币类型</>}
                  variant="rounded"
                >
                  <option value="">全部货币</option>
                  {Array.isArray(currencies) && currencies.map(currency => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code} - {currency.name}
                    </option>
                  ))}
                </PSelect>
              </div>
              <div>
                <PSelect
                  id="page-size"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  label="每页显示"
                  variant="rounded"
                >
                  <option value={10}>10 条</option>
                  <option value={20}>20 条</option>
                  <option value={50}>50 条</option>
                  <option value={100}>100 条</option>
                </PSelect>
              </div>
              </div>
            </div>
          </PCard>

          {/* 钱包表格 */}
          <PCard variant="bordered" className="overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  钱包列表
                </h3>
                <div className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                  共 {total} 个钱包
                </div>
              </div>
            </div>            {loading ? (
              <PSkeleton.List items={3} />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        钱包信息
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        所有者
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        货币 & 余额
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        状态
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        创建时间
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">操作</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Array.isArray(wallets) && wallets.length > 0 ? wallets.map((wallet) => (
                      <tr key={wallet.id} className="hover:bg-gray-50 transition-colors duration-200">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                <WalletIcon className="h-5 w-5 text-indigo-600" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                钱包 #{wallet.id}
                              </div>
                              <div className="text-sm text-gray-500">
                                {getWalletTypeTag(wallet)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {wallet.user && (
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8">
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                  <UsersIcon className="h-4 w-4 text-blue-600" />
                                </div>
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">
                                  <UserTooltip
                                    userId={wallet.user_id}
                                    triggerLabel={wallet.user.username || wallet.user.email}
                                    fallbackLabel={`用户 #${wallet.user_id}`}
                                    className="cursor-default border-b border-dotted border-gray-300 text-gray-900"
                                  />
                                </div>
                                <div className="text-sm text-gray-500">UID #{wallet.user_id}</div>
                              </div>
                            </div>
                          )}
                          {wallet.team && (
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8">
                                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                                  <UserGroupIcon className="h-4 w-4 text-green-600" />
                                </div>
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">{wallet.team.name}</div>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="flex items-center">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 mr-2">
                                  {wallet.currency.code}
                                </span>
                                <span className="text-xs text-gray-500">{wallet.currency.name}</span>
                              </div>
                              <div className="mt-1">
                                <span className={`text-lg font-bold ${wallet.balance > 0 ? 'text-green-600' : wallet.balance < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                  {formatBalance(wallet.balance, wallet.currency)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusTag(wallet.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(wallet.created_at).toLocaleString('zh-CN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex space-x-2">
                            <PButton
                              onClick={() => openTransactionsModal(wallet)}
                              variant="secondary"
                              size="sm"
                              className="inline-flex items-center p-2 rounded-full"
                              title="查看交易记录"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </PButton>

                            <PButton
                              onClick={() => {
                                setSelectedWallet(wallet);
                                setAdjustModalVisible(true);
                              }}
                              variant="primary"
                              size="sm"
                              className="inline-flex items-center p-2 rounded-full"
                              title="调整余额"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </PButton>
                            
                            {wallet.status === 'active' ? (
                              <PButton
                                onClick={() => handleFreezeWallet(wallet)}
                                variant="danger"
                                size="sm"
                                className="inline-flex items-center p-2 rounded-full"
                                title="冻结钱包"
                              >
                                <LockClosedIcon className="h-4 w-4" />
                              </PButton>
                            ) : (
                              <PButton
                                onClick={() => handleUnfreezeWallet(wallet)}
                                variant="secondary"
                                size="sm"
                                className="inline-flex items-center p-2 rounded-full bg-green-600 text-white hover:bg-green-700"
                                title="解冻钱包"
                              >
                                <LockOpenIcon className="h-4 w-4" />
                              </PButton>
                            )}
                            
                            <PButton
                              onClick={() => handleDeleteWallet(wallet)}
                              disabled={wallet.balance !== 0}
                              variant={wallet.balance !== 0 ? 'secondary' : 'danger'}
                              size="sm"
                              className={`inline-flex items-center p-2 rounded-full ${wallet.balance !== 0 ? 'text-gray-400 bg-gray-200 cursor-not-allowed' : ''}`}
                              title="删除钱包"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </PButton>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <div className="text-center">
                            <WalletIcon className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">暂无钱包</h3>
                            <p className="mt-1 text-sm text-gray-500">
                              开始创建第一个钱包吧
                            </p>
                            <div className="mt-6">
                              <PButton
                                onClick={() => setCreateModalVisible(true)}
                                variant="primary"
                              >
                                <PlusIcon className="h-4 w-4 mr-2" />
                                创建钱包
                              </PButton>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 分页控件 */}
            {!loading && total > 0 && (
              <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
                <div className="flex flex-1 justify-between sm:hidden">
                  <PButton
                    onClick={() => {
                      if (currentPage > 1) {
                        const newPage = currentPage - 1;
                        setCurrentPage(newPage);
                        loadWallets(newPage);
                      }
                    }}
                    disabled={currentPage <= 1}
                    variant="secondary"
                  >
                    上一页
                  </PButton>
                  <PButton
                    onClick={() => {
                      if (currentPage < totalPages) {
                        const newPage = currentPage + 1;
                        setCurrentPage(newPage);
                        loadWallets(newPage);
                      }
                    }}
                    disabled={currentPage >= totalPages}
                    variant="secondary"
                    className="ml-3"
                  >
                    下一页
                  </PButton>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      显示第 <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> 到{' '}
                      <span className="font-medium">{Math.min(currentPage * pageSize, total)}</span> 条，
                      共 <span className="font-medium">{total}</span> 条记录
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                      <PButton
                        onClick={() => {
                          if (currentPage > 1) {
                            const newPage = currentPage - 1;
                            setCurrentPage(newPage);
                            loadWallets(newPage);
                          }
                        }}
                        disabled={currentPage <= 1}
                        variant="secondary"
                        size="sm"
                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:bg-gray-100"
                      >
                        <span className="sr-only">上一页</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                        </svg>
                      </PButton>
                      
                      {/* 页码按钮 */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <PButton
                            key={pageNum}
                            onClick={() => {
                              setCurrentPage(pageNum);
                              loadWallets(pageNum);
                            }}
                            variant={currentPage === pageNum ? 'primary' : 'secondary'}
                            size="sm"
                            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 ${currentPage === pageNum ? '' : 'text-gray-900 hover:bg-gray-50'}`}
                          >
                            {pageNum}
                          </PButton>
                        );
                      })}

                      <PButton
                        onClick={() => {
                          if (currentPage < totalPages) {
                            const newPage = currentPage + 1;
                            setCurrentPage(newPage);
                            loadWallets(newPage);
                          }
                        }}
                        disabled={currentPage >= totalPages}
                        variant="secondary"
                        size="sm"
                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:bg-gray-100"
                      >
                        <span className="sr-only">下一页</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                        </svg>
                      </PButton>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </PCard>
        </div>

        {/* 创建钱包模态框 */}
        {createModalVisible && (
          <div className="fixed inset-0 !m-0 bg-black bg-opacity-60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <PCard variant="elevated" className="relative mx-auto border-0 w-full max-w-md rounded-2xl">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center mr-3">
                      <PlusIcon className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">创建钱包</h3>
                  </div>
                  <PButton
                    onClick={() => {
                      setCreateModalVisible(false);
                      setCreateForm({ currency_code: '', initial_balance: 0, user_id: undefined, team_id: undefined });
                      setCreateWalletType('user');
                    }}
                    variant="secondary"
                    size="sm"
                    className="text-gray-600 p-1"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </PButton>
                </div>
                
                <form onSubmit={handleCreateWallet} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      钱包类型 *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className={`relative flex cursor-pointer rounded-lg border p-4 shadow-sm focus:outline-none transition-colors ${
                        createWalletType === 'user'
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-300 bg-white hover:bg-gray-50'
                      }`}>
                        <input
                          type="radio"
                          name="wallet_type"
                          value="user"
                          className="sr-only"
                          checked={createWalletType === 'user'}
                          onChange={() => {
                            setCreateWalletType('user');
                            setCreateForm({ ...createForm, user_id: createForm.user_id, team_id: undefined });
                          }}
                        />
                        <span className="flex flex-1">
                          <span className="flex flex-col">
                            <span className="block text-sm font-medium text-gray-900">用户钱包</span>
                            <span className="mt-1 flex items-center text-sm text-gray-500">为特定用户创建钱包</span>
                          </span>
                        </span>
                        <svg className={`ml-3 h-5 w-5 ${createWalletType === 'user' ? 'text-indigo-600' : 'text-transparent'}`} viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L7.53 10.05a.75.75 0 00-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                        </svg>
                      </label>
                      <label className={`relative flex cursor-pointer rounded-lg border p-4 shadow-sm focus:outline-none transition-colors ${
                        createWalletType === 'team'
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-300 bg-white hover:bg-gray-50'
                      }`}>
                        <input
                          type="radio"
                          name="wallet_type"
                          value="team"
                          className="sr-only"
                          checked={createWalletType === 'team'}
                          onChange={() => {
                            setCreateWalletType('team');
                            setCreateForm({ ...createForm, team_id: createForm.team_id, user_id: undefined });
                          }}
                        />
                        <span className="flex flex-1">
                          <span className="flex flex-col">
                            <span className="block text-sm font-medium text-gray-900">团队钱包</span>
                            <span className="mt-1 flex items-center text-sm text-gray-500">为团队创建钱包</span>
                          </span>
                        </span>
                        <svg className={`ml-3 h-5 w-5 ${createWalletType === 'team' ? 'text-indigo-600' : 'text-transparent'}`} viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L7.53 10.05a.75.75 0 00-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                        </svg>
                      </label>
                    </div>
                  </div>

                  <div>
                    <PInput
                      type="number"
                      label={`${createWalletType === 'user' ? '用户' : '团队'} ID *`}
                      value={createForm.user_id || createForm.team_id || ''}
                      onChange={(e) => {
                        const value = e.target.value ? parseInt(e.target.value) : undefined;
                        if (createWalletType === 'user') {
                          setCreateForm({ ...createForm, user_id: value, team_id: undefined });
                        } else {
                          setCreateForm({ ...createForm, team_id: value, user_id: undefined });
                        }
                      }}
                      placeholder={`输入${createWalletType === 'user' ? '用户' : '团队'} ID`}
                      required
                      icon={<UsersIcon className="h-5 w-5" />}
                      variant="rounded"
                    />
                  </div>

                  <div>
                    <PSelect
                      label="货币类型 *"
                      value={createForm.currency_code}
                      onChange={(e) => setCreateForm({ ...createForm, currency_code: (e.target as HTMLSelectElement).value })}
                      required
                      variant="rounded"
                    >
                      <option value="">选择货币</option>
                      {currencies.map(currency => (
                        <option key={currency.code} value={currency.code}>
                          {currency.code} - {currency.name}
                        </option>
                      ))}
                    </PSelect>
                  </div>

                  <div>
                    <PInput
                      label="初始余额"
                      type="number"
                      step="0.01"
                      value={createForm.initial_balance}
                      onChange={(e) => setCreateForm({ ...createForm, initial_balance: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      icon={<CurrencyDollarIcon className="h-5 w-5" />}
                      variant="rounded"
                    />
                    <div className="mt-1 text-xs font-medium text-gray-500">{createForm.currency_code || 'CUR'}</div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <PButton
                      type="button"
                      onClick={() => {
                        setCreateModalVisible(false);
                        setCreateForm({ currency_code: '', initial_balance: 0, user_id: undefined, team_id: undefined });
                      }}
                      variant="secondary"
                    >
                      取消
                    </PButton>
                    <PButton
                      type="submit"
                      disabled={createLoading}
                      loading={createLoading}
                      variant="primary"
                    >
                      创建钱包
                    </PButton>
                  </div>
                </form>
              </div>
            </PCard>
          </div>
        )}

        {quickAdjustModalVisible && (
          <div className="fixed inset-0 !m-0 bg-black bg-opacity-60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <PCard variant="elevated" className="relative mx-auto border-0 w-full max-w-lg rounded-2xl">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center mr-3">
                      <PencilIcon className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">按用户/团队直接调余额</h3>
                  </div>
                  <PButton
                    onClick={() => {
                      setQuickAdjustModalVisible(false);
                      resetQuickAdjustForm();
                    }}
                    variant="secondary"
                    size="sm"
                    className="text-gray-600 p-1"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </PButton>
                </div>

                <div className="mb-6 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 text-sm text-amber-900">
                  不需要先找到钱包 ID。输入用户或团队 ID、币种和金额即可直接调整余额；若该币种钱包不存在，可自动创建。
                </div>

                <form onSubmit={handleQuickAdjust} className="space-y-4">
                  <div>
                    <PSelect
                      label="调整方式 *"
                      value={quickAdjustMode}
                      onChange={(e) => setQuickAdjustMode((e.target as HTMLSelectElement).value as 'delta' | 'target')}
                      variant="rounded"
                    >
                      <option value="delta">按增减额调整</option>
                      <option value="target">设置目标余额</option>
                    </PSelect>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <PSelect
                      label="对象类型 *"
                      value={quickAdjustForm.owner_type}
                      onChange={(e) => setQuickAdjustForm({ ...quickAdjustForm, owner_type: (e.target as HTMLSelectElement).value as 'user' | 'team' })}
                      variant="rounded"
                    >
                      <option value="user">用户</option>
                      <option value="team">团队</option>
                    </PSelect>

                    <PInput
                      type="number"
                      label={`${quickAdjustForm.owner_type === 'user' ? '用户' : '团队'} ID *`}
                      value={quickAdjustForm.owner_id || ''}
                      onChange={(e) => setQuickAdjustForm({ ...quickAdjustForm, owner_id: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                      placeholder={`输入${quickAdjustForm.owner_type === 'user' ? '用户' : '团队'} ID`}
                      variant="rounded"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <PSelect
                      label="货币类型 *"
                      value={quickAdjustForm.currency_code}
                      onChange={(e) => setQuickAdjustForm({ ...quickAdjustForm, currency_code: (e.target as HTMLSelectElement).value })}
                      variant="rounded"
                    >
                      <option value="">选择货币</option>
                      {currencies.map(currency => (
                        <option key={currency.code} value={currency.code}>
                          {currency.code} - {currency.name}
                        </option>
                      ))}
                    </PSelect>

                    <PInput
                      label={quickAdjustMode === 'delta' ? '调整金额 *' : '目标余额 *'}
                      type="number"
                      step="0.01"
                      value={quickAdjustForm.amount}
                      onChange={(e) => setQuickAdjustForm({ ...quickAdjustForm, amount: parseFloat(e.target.value) || 0 })}
                      placeholder={quickAdjustMode === 'delta' ? '正数增加，负数减少' : '设置为该余额'}
                      icon={<CurrencyDollarIcon className="h-5 w-5" />}
                      variant="rounded"
                    />
                  </div>

                  <PTextarea
                    label="调整原因 *"
                    value={quickAdjustForm.reason}
                    onChange={(e) => setQuickAdjustForm({ ...quickAdjustForm, reason: e.target.value })}
                    rows={3}
                    placeholder="例如：人工补偿、手工扣费、测试数据修正"
                    required
                  />

                  <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={quickAdjustForm.create_if_missing !== false}
                      onChange={(e) => setQuickAdjustForm({ ...quickAdjustForm, create_if_missing: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                    />
                    钱包不存在时自动创建
                  </label>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                    {quickAdjustMode === 'delta'
                      ? '当前模式下，正数表示增加余额，负数表示减少余额。'
                      : '当前模式下，系统会先查出当前余额，再自动计算出需要补差的增减额。'}
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <PButton
                      type="button"
                      onClick={() => {
                        setQuickAdjustModalVisible(false);
                        resetQuickAdjustForm();
                      }}
                      variant="secondary"
                    >
                      取消
                    </PButton>
                    <PButton
                      type="submit"
                      disabled={adjustLoading}
                      loading={adjustLoading}
                      variant="primary"
                    >
                      确认调整
                    </PButton>
                  </div>
                </form>
              </div>
            </PCard>
          </div>
        )}

        {transactionsModalVisible && transactionWallet && (
          <div className="fixed inset-0 !m-0 bg-black bg-opacity-60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <PCard variant="elevated" className="relative mx-auto border-0 w-full max-w-4xl rounded-2xl">
              <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">钱包 #{transactionWallet.id} 交易记录</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {transactionWallet.currency.code} · 当前余额 {formatBalance(transactionWallet.balance, transactionWallet.currency)}
                    </p>
                  </div>
                  <PButton
                    onClick={() => {
                      setTransactionsModalVisible(false);
                      setTransactionWallet(null);
                      setTransactions([]);
                    }}
                    variant="secondary"
                  >
                    关闭
                  </PButton>
                </div>

                {transactionLoading ? (
                  <PSkeleton.List items={3} />
                ) : transactions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-300 px-6 py-10 text-center text-sm text-gray-500">
                    暂无交易记录
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">类型</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">金额</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">状态</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">备注</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">时间</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {transactions.map(tx => (
                          <tr key={tx.id}>
                            <td className="px-4 py-3 text-sm text-gray-700">{tx.type}</td>
                            <td className={`px-4 py-3 text-sm font-semibold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatBalance(tx.amount, transactionWallet.currency)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">{tx.status}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{tx.description || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{new Date(tx.created_at).toLocaleString('zh-CN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </PCard>
          </div>
        )}

        {/* 调整余额模态框 */}
        {adjustModalVisible && selectedWallet && (
          <div className="fixed inset-0 !m-0 bg-black bg-opacity-60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <PCard variant="elevated" className="relative mx-auto border-0 w-full max-w-md rounded-2xl">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 flex items-center justify-center mr-3">
                      <PencilIcon className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      调整余额 - 钱包 #{selectedWallet.id}
                    </h3>
                  </div>
                  <PButton
                    onClick={() => {
                      setAdjustModalVisible(false);
                      setAdjustForm({ amount: 0, reason: '' });
                      setSelectedWallet(null);
                    }}
                    variant="secondary"
                    size="sm"
                    className="text-gray-600 p-1"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </PButton>
                </div>

                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                  <div className="text-sm font-medium text-blue-700 mb-1">当前余额</div>
                  <div className="text-2xl font-bold text-blue-900">
                    {formatBalance(selectedWallet.balance, selectedWallet.currency)}
                  </div>
                </div>
                
                <form onSubmit={handleAdjustBalance} className="space-y-4">
                  <div>
                    <PInput
                      label="调整金额 *"
                      type="number"
                      step="0.01"
                      value={adjustForm.amount}
                      onChange={(e) => setAdjustForm({ ...adjustForm, amount: parseFloat(e.target.value) || 0 })}
                      placeholder="输入正数增加，负数减少"
                      required
                      icon={<CurrencyDollarIcon className="h-5 w-5" />}
                      variant="rounded"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      输入正数增加余额，负数减少余额
                    </p>
                  </div>

                  <div>
                    <PTextarea
                      label="调整原因 *"
                      value={adjustForm.reason}
                      onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                      rows={3}
                      placeholder="请输入调整原因"
                      required
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <PButton
                      type="button"
                      onClick={() => {
                        setAdjustModalVisible(false);
                        setAdjustForm({ amount: 0, reason: '' });
                        setSelectedWallet(null);
                      }}
                      variant="secondary"
                    >
                      取消
                    </PButton>
                    <PButton
                      type="submit"
                      disabled={adjustLoading}
                      loading={adjustLoading}
                      variant="primary"
                    >
                      确认调整
                    </PButton>
                  </div>
                </form>
              </div>
            </PCard>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default WalletManagement;
