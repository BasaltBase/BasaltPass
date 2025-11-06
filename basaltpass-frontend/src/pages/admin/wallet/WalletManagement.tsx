import React, { useState, useEffect } from 'react';
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
import { adminWalletApi, Wallet, Currency, CreateWalletRequest, AdjustBalanceRequest } from '../../../api/adminWallet';
import AdminLayout from '../../../components/AdminLayout';
import WalletStatsCard from '../../../components/admin/WalletStatsCard';
import { PInput, PSelect, PButton, PCard } from '../../../components';

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
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  
  // Form data
  const [createForm, setCreateForm] = useState<CreateWalletRequest>({
    currency_code: '',
    initial_balance: 0,
  });
  const [adjustForm, setAdjustForm] = useState<AdjustBalanceRequest>({
    amount: 0,
    reason: '',
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
      alert('请选择钱包类型并输入对应的ID');
      return;
    }
    
    setCreateLoading(true);
    try {
      await adminWalletApi.createWallet(createForm);
      alert('钱包创建成功');
      setCreateModalVisible(false);
      setCreateForm({ currency_code: '', initial_balance: 0, user_id: undefined, team_id: undefined });
      loadWallets();
    } catch (error: any) {
      alert(error.response?.data?.error || '创建钱包失败');
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
      alert('余额调整成功');
      setAdjustModalVisible(false);
      setAdjustForm({ amount: 0, reason: '' });
      setSelectedWallet(null);
      loadWallets();
    } catch (error: any) {
      alert(error.response?.data?.error || '调整余额失败');
    } finally {
      setAdjustLoading(false);
    }
  };

  // 冻结钱包
  const handleFreezeWallet = async (wallet: Wallet) => {
    if (!confirm('确定要冻结这个钱包吗？')) return;
    
    try {
      await adminWalletApi.freezeWallet(wallet.id);
      alert('钱包已冻结');
      loadWallets();
    } catch (error: any) {
      alert(error.response?.data?.error || '冻结钱包失败');
    }
  };

  // 解冻钱包
  const handleUnfreezeWallet = async (wallet: Wallet) => {
    if (!confirm('确定要解冻这个钱包吗？')) return;
    
    try {
      await adminWalletApi.unfreezeWallet(wallet.id);
      alert('钱包已解冻');
      loadWallets();
    } catch (error: any) {
      alert(error.response?.data?.error || '解冻钱包失败');
    }
  };

  // 删除钱包
  const handleDeleteWallet = async (wallet: Wallet) => {
    if (!confirm('确定要删除这个钱包吗？只能删除余额为0的钱包。')) return;
    
    try {
      await adminWalletApi.deleteWallet(wallet.id);
      alert('钱包已删除');
      loadWallets();
    } catch (error: any) {
      alert(error.response?.data?.error || '删除钱包失败');
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
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <UsersIcon className="w-3 h-3 mr-1" />
          用户钱包
        </span>
      );
    } else if (wallet.team_id) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <UserGroupIcon className="w-3 h-3 mr-1" />
          团队钱包
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        未知类型
      </span>
    );
  };

  // 获取钱包状态标签
  const getStatusTag = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            活跃
          </span>
        );
      case 'frozen':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            冻结
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
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
                                <div className="text-sm font-medium text-gray-900">{wallet.user.username}</div>
                                <div className="text-sm text-gray-500">{wallet.user.email}</div>
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
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
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
                      <label className="relative flex cursor-pointer rounded-lg border border-gray-300 bg-white p-4 shadow-sm focus:outline-none hover:bg-gray-50">
                        <input
                          type="radio"
                          name="wallet_type"
                          value="user"
                          className="sr-only"
                          onChange={() => setCreateForm({ ...createForm, team_id: undefined })}
                        />
                        <span className="flex flex-1">
                          <span className="flex flex-col">
                            <span className="block text-sm font-medium text-gray-900">用户钱包</span>
                            <span className="mt-1 flex items-center text-sm text-gray-500">为特定用户创建钱包</span>
                          </span>
                        </span>
                        <svg className="h-5 w-5 text-indigo-600 ml-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L7.53 10.05a.75.75 0 00-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                        </svg>
                      </label>
                      <label className="relative flex cursor-pointer rounded-lg border border-gray-300 bg-white p-4 shadow-sm focus:outline-none hover:bg-gray-50">
                        <input
                          type="radio"
                          name="wallet_type"
                          value="team"
                          className="sr-only"
                          onChange={() => setCreateForm({ ...createForm, user_id: undefined })}
                        />
                        <span className="flex flex-1">
                          <span className="flex flex-col">
                            <span className="block text-sm font-medium text-gray-900">团队钱包</span>
                            <span className="mt-1 flex items-center text-sm text-gray-500">为团队创建钱包</span>
                          </span>
                        </span>
                        <svg className="h-5 w-5 text-indigo-600 ml-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L7.53 10.05a.75.75 0 00-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                        </svg>
                      </label>
                    </div>
                  </div>

                  <div>
                    <PInput
                      type="number"
                      label="用户/团队 ID *"
                      value={createForm.user_id || createForm.team_id || ''}
                      onChange={(e) => {
                        const value = e.target.value ? parseInt(e.target.value) : undefined;
                        const walletType = document.querySelector('input[name="wallet_type"]:checked')?.getAttribute('value');
                        if (walletType === 'user') {
                          setCreateForm({ ...createForm, user_id: value, team_id: undefined });
                        } else {
                          setCreateForm({ ...createForm, team_id: value, user_id: undefined });
                        }
                      }}
                      placeholder="输入用户或团队 ID"
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

        {/* 调整余额模态框 */}
        {adjustModalVisible && selectedWallet && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      调整原因 *
                    </label>
                    <textarea
                      value={adjustForm.reason}
                      onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                      className="block w-full rounded-xl border-gray-200 bg-white/80 placeholder-gray-400 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:text-sm"
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
