import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../../../components/Layout';
import { PCard, PButton } from '../../../components';
import PTable, { PTableColumn, PTableAction } from '../../../components/PTable';
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
  const navigate = useNavigate();
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

  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin';

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
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
            <h1 className="text-2xl font-bold text-gray-900">团队成员管理</h1>
            <p className="mt-1 text-sm text-gray-500">
              管理团队成员和权限
            </p>
          </div>
          <Link
            to={`/teams/${id}`}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            返回团队
          </Link>
        </div>

        {/* 成员列表 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">成员列表</h3>
              {canManageMembers && (
                <Link
                  to={`/teams/invite/${id}`}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-blue-700"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  邀请成员
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