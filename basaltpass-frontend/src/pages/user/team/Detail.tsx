import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../../../components/Layout';
import { teamApi, TeamResponse } from '../../../api/team';
import { invitationApi, Invitation } from '../../../api/invitation';
import { XMarkIcon, ClockIcon } from '@heroicons/react/24/outline';

const TeamDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [team, setTeam] = useState<TeamResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [outgoingInvitations, setOutgoingInvitations] = useState<Invitation[]>([]);
  const [showInvitations, setShowInvitations] = useState(false);
  const [invitationsLoading, setInvitationsLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadTeam();
    }
  }, [id]);

  const loadTeam = async () => {
    try {
      setLoading(true);
      const response = await teamApi.getTeam(parseInt(id!));
      setTeam(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || '加载团队信息失败');
    } finally {
      setLoading(false);
    }
  };

  const loadOutgoingInvitations = async () => {
    if (!team) return;
    
    setInvitationsLoading(true);
    try {
      const response = await invitationApi.listOutgoing(team.id);
      setOutgoingInvitations(response.data);
    } catch (error) {
      console.error('加载邀请列表失败:', error);
    } finally {
      setInvitationsLoading(false);
    }
  };

  const revokeInvitation = async (invitationId: number) => {
    if (!team) return;
    
    try {
      await invitationApi.revoke(team.id, invitationId);
      loadOutgoingInvitations(); // 重新加载列表
    } catch (error: any) {
      alert(error.response?.data?.message || '撤回邀请失败');
    }
  };

  const handleDeleteTeam = async () => {
    if (!team) return;

    try {
      await teamApi.deleteTeam(team.id);
      navigate('/teams', { 
        state: { message: '团队删除成功！' }
      });
    } catch (err: any) {
      setError(err.response?.data?.message || '删除团队失败');
    }
  };

  const handleLeaveTeam = async () => {
    if (!team) return;

    try {
      await teamApi.leaveTeam(team.id);
      navigate('/teams', { 
        state: { message: '已成功离开团队！' }
      });
    } catch (err: any) {
      setError(err.response?.data?.message || '离开团队失败');
    }
  };

  const getRoleBadge = (role: string) => {
    const roleColors = {
      owner: 'bg-red-100 text-red-800',
      admin: 'bg-blue-100 text-blue-800',
      member: 'bg-gray-100 text-gray-800',
    };
    
    const roleNames = {
      owner: '所有者',
      admin: '管理员',
      member: '成员',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${roleColors[role as keyof typeof roleColors]}`}>
        {roleNames[role as keyof typeof roleNames]}
      </span>
    );
  };

  const getInvitationStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { text: '待处理', class: 'bg-yellow-100 text-yellow-800' },
      accepted: { text: '已接受', class: 'bg-green-100 text-green-800' },
      rejected: { text: '已拒绝', class: 'bg-red-100 text-red-800' },
      revoked: { text: '已撤回', class: 'bg-gray-100 text-gray-800' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.class}`}>
        {config.text}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (error || !team) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">加载失败</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* 头部 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
            <p className="mt-1 text-sm text-gray-500">{team.description}</p>
          </div>
          <div className="flex items-center space-x-3">
            {team.user_role && getRoleBadge(team.user_role)}
            <Link
              to="/teams"
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              返回列表
            </Link>
          </div>
        </div>

        {/* 团队信息卡片 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">团队信息</h3>
          </div>
          <div className="px-6 py-4">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">团队名称</dt>
                <dd className="mt-1 text-sm text-gray-900">{team.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">成员数量</dt>
                <dd className="mt-1 text-sm text-gray-900">{team.member_count} 人</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">创建时间</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(team.created_at).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">最后更新</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(team.updated_at).toLocaleString()}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">团队描述</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {team.description || '暂无描述'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">团队操作</h3>
          </div>
          <div className="px-6 py-4">
            <div className="flex flex-wrap gap-3">
              <Link
                to={`/teams/${team.id}/members`}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-blue-700"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                管理成员
              </Link>

              {(team.user_role === 'owner' || team.user_role === 'admin') && (
                <>
                  <Link
                    to={`/teams/invite/${team.id}`}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    邀请成员
                  </Link>

                  <button
                    onClick={() => {
                      setShowInvitations(!showInvitations);
                      if (!showInvitations) {
                        loadOutgoingInvitations();
                      }
                    }}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <ClockIcon className="w-4 h-4 mr-2" />
                    管理邀请
                  </button>

                  <Link
                    to={`/teams/${team.id}/edit`}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    编辑团队
                  </Link>
                </>
              )}

              {team.user_role === 'owner' && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  删除团队
                </button>
              )}

              {team.user_role !== 'owner' && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  离开团队
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 邀请管理 */}
        {showInvitations && (team.user_role === 'owner' || team.user_role === 'admin') && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">已发出的邀请</h3>
            </div>
            <div className="px-6 py-4">
              {invitationsLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                </div>
              ) : outgoingInvitations.length === 0 ? (
                <p className="text-gray-500 text-center py-4">暂无已发出的邀请</p>
              ) : (
                <div className="space-y-3">
                  {outgoingInvitations.map((invitation) => (
                    <div key={invitation.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {invitation.invitee?.nickname || invitation.invitee?.email}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(invitation.created_at)}
                            </p>
                          </div>
                          {getInvitationStatusBadge(invitation.status)}
                        </div>
                        {invitation.remark && (
                          <p className="mt-1 text-xs text-gray-600 italic">
                            备注: {invitation.remark}
                          </p>
                        )}
                      </div>
                      {invitation.status === 'pending' && (
                        <button
                          onClick={() => revokeInvitation(invitation.id)}
                          className="ml-3 inline-flex items-center px-2 py-1 border border-red-300 text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100"
                        >
                          <XMarkIcon className="w-3 h-3 mr-1" />
                          撤回
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 删除确认对话框 - 移到 space-y-6 容器外 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {team.user_role === 'owner' ? '确认删除团队' : '确认离开团队'}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {team.user_role === 'owner' 
                  ? '删除团队后，所有成员将被移除，此操作不可撤销。'
                  : '离开团队后，您将失去对该团队的访问权限。'
                }
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    if (team.user_role === 'owner') {
                      handleDeleteTeam();
                    } else {
                      handleLeaveTeam();
                    }
                  }}
                  className={`px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                    team.user_role === 'owner' 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-indigo-600 hover:bg-blue-700'
                  }`}
                >
                  {team.user_role === 'owner' ? '确认删除' : '确认离开'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default TeamDetail; 