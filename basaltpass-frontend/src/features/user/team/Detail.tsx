import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '@features/user/components/Layout';
import { PCard, PButton, PSkeleton, PAlert, PBadge, PPageHeader } from '@ui';
import { teamApi, TeamResponse } from '@api/user/team';
import { invitationApi, Invitation } from '@api/user/invitation';
import { XMarkIcon, ClockIcon } from '@heroicons/react/24/outline';
import { ROUTES } from '@constants';

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
      uiAlert(error.response?.data?.message || '撤回邀请失败');
    }
  };

  const handleDeleteTeam = async () => {
    if (!team) return;

    try {
      await teamApi.deleteTeam(team.id);
      navigate(ROUTES.user.teams, { 
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
      navigate(ROUTES.user.teams, { 
        state: { message: '已成功离开团队！' }
      });
    } catch (err: any) {
      setError(err.response?.data?.message || '离开团队失败');
    }
  };

  const getRoleBadge = (role: string) => {
    const roleVariants = {
      owner: 'error' as const,
      admin: 'info' as const,
      member: 'default' as const,
    };
    const roleNames = {
      owner: '所有者',
      admin: '管理员',
      member: '成员',
    } as const;
    return (
      <PBadge variant={roleVariants[role as keyof typeof roleVariants] || 'default'}>
        {roleNames[role as keyof typeof roleNames] || role}
      </PBadge>
    );
  };

  const getInvitationStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { text: '待处理', variant: 'warning' as const },
      accepted: { text: '已接受', variant: 'success' as const },
      rejected: { text: '已拒绝', variant: 'error' as const },
      revoked: { text: '已撤回', variant: 'default' as const },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <PBadge variant={config.variant}>{config.text}</PBadge>;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <Layout>
        <div className="py-6">
          <PSkeleton.DetailPage />
        </div>
      </Layout>
    );
  }

  if (error || !team) {
    return (
      <Layout>
        <PAlert variant="error" title="加载失败" message={error || '团队不存在'} />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* 头部 */}
        <div className="flex items-center justify-between">
          <PPageHeader title={team.name} description={team.description || '查看团队详情、成员和邀请信息'} />
          <div className="flex items-center space-x-3">
            {team.user_role && getRoleBadge(team.user_role)}
            <Link
              to={ROUTES.user.teams}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              返回列表
            </Link>
          </div>
        </div>

        {/* 团队信息卡片 */}
        <div className="rounded-xl bg-white shadow-sm">
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
        <div className="rounded-xl bg-white shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">团队操作</h3>
          </div>
          <div className="px-6 py-4">
            <div className="flex flex-wrap gap-3">
              <Link to={`/teams/${team.id}/members`}>
                <PButton variant="primary">管理成员</PButton>
              </Link>

              {(team.user_role === 'owner' || team.user_role === 'admin') && (
                <>
                  <Link to={`/teams/invite/${team.id}`}>
                    <PButton variant="secondary">邀请成员</PButton>
                  </Link>

                  <PButton
                    variant="secondary"
                    onClick={() => {
                      setShowInvitations(!showInvitations);
                      if (!showInvitations) {
                        loadOutgoingInvitations();
                      }
                    }}
                    leftIcon={<ClockIcon className="w-4 h-4" />}
                  >
                    管理邀请
                  </PButton>

                  <Link to={`/teams/${team.id}/edit`}>
                    <PButton variant="secondary">编辑团队</PButton>
                  </Link>
                </>
              )}

              {team.user_role === 'owner' && (
                <PButton variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                  删除团队
                </PButton>
              )}

              {team.user_role !== 'owner' && (
                <PButton variant="ghost" onClick={() => setShowDeleteConfirm(true)}>
                  离开团队
                </PButton>
              )}
            </div>
          </div>
        </div>

        {/* 邀请管理 */}
        {showInvitations && (team.user_role === 'owner' || team.user_role === 'admin') && (
          <div className="rounded-xl bg-white shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">已发出的邀请</h3>
            </div>
            <div className="px-6 py-4">
              {invitationsLoading ? (
                <PSkeleton variant="rect" width="100%" height="1.5rem" />
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
                        <PButton
                          variant="danger"
                          size="sm"
                          onClick={() => revokeInvitation(invitation.id)}
                          leftIcon={<XMarkIcon className="w-3 h-3" />}
                        >
                          撤回
                        </PButton>
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
        <div className="fixed inset-0 !m-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto w-96 rounded-2xl border bg-white p-5 shadow-xl">
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
                <PButton variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                  取消
                </PButton>
                <PButton
                  variant={team.user_role === 'owner' ? 'danger' : 'primary'}
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    if (team.user_role === 'owner') {
                      handleDeleteTeam();
                    } else {
                      handleLeaveTeam();
                    }
                  }}
                >
                  {team.user_role === 'owner' ? '确认删除' : '确认离开'}
                </PButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default TeamDetail; 
