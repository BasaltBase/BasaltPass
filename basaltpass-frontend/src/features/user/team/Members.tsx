import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '@features/user/components/Layout';
import { PCard, PButton, PSkeleton, PAlert, PBadge, PPageHeader } from '@ui';
import PTable, { PTableColumn, PTableAction } from '@ui/PTable';
import { teamApi } from '@api/user/team';

interface TeamMember {
  id: number;
  user_id: number;
  team_id: number;
  role: string;
  joined_at: string;
  user: {
    id: number;
    email: string;
    nickname: string;
  };
}

const TeamMembers: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');

  useEffect(() => {
    if (id) {
      loadMembers();
    }
  }, [id]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      // 这里需要根据实际的API调整
      const response = await teamApi.getTeam(parseInt(id!));
      // 假设API返回的数据包含成员信息
      // 实际实现需要根据后端API调整
      setMembers([]); // 暂时设为空数组，需要根据实际API调整
      setCurrentUserRole(response.data.data?.user_role || '');
    } catch (err: any) {
      setError(err.response?.data?.message || '加载成员失败');
    } finally {
      setLoading(false);
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

  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin';

  if (loading) {
    return (
      <Layout>
        <div className="py-4">
          <PSkeleton.List items={4} />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <PAlert variant="error" title="加载失败" message={error} />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* 头部 */}
        <div className="flex items-center justify-between">
          <PPageHeader title="团队成员管理" description="管理团队成员和权限" />
          <Link
            to={`/teams/${id}`}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            返回团队
          </Link>
        </div>

        {/* 成员列表 */}
        <div className="rounded-xl bg-white shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">成员列表</h3>
              {canManageMembers && (
                <Link to={`/teams/invite/${id}`}>
                  <PButton variant="primary">邀请成员</PButton>
                </Link>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            {(() => {
              const columns: PTableColumn<TeamMember>[] = [
                {
                  key: 'user',
                  title: '用户',
                  render: (member) => (
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {member.user.nickname?.charAt(0) || member.user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {member.user.nickname || '未设置昵称'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {member.user.email}
                        </div>
                      </div>
                    </div>
                  )
                },
                { key: 'role', title: '角色', render: (m) => getRoleBadge(m.role) },
                { key: 'joined_at', title: '加入时间', dataIndex: 'joined_at', sortable: true, sorter: (a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime() },
              ];

              const actions: PTableAction<TeamMember>[] = canManageMembers
                ? [
                    { key: 'edit', label: '编辑角色', variant: 'secondary', size: 'sm', onClick: () => {/* TODO: open role modal */} },
                    { key: 'remove', label: '移除', variant: 'danger', size: 'sm', onClick: () => {/* TODO: remove member */} },
                  ]
                : [];

              return (
                <PTable
                  columns={columns}
                  data={members}
                  rowKey={(row) => row.id}
                  actions={actions}
                  emptyText="暂无成员"
                  striped
                />
              );
            })()}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TeamMembers; 
