import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@features/user/components/Layout';
import { PCard, PButton, PSkeleton, PAlert, PBadge, PPageHeader } from '@ui';
import { teamApi, UserTeamResponse } from '@api/user/team';
import { ROUTES } from '@constants';

const TeamIndex: React.FC = () => {
  const [teams, setTeams] = useState<UserTeamResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const response = await teamApi.getUserTeams();
      setTeams(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || '加载团队失败');
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

  if (loading) {
    return (
      <Layout>
        <div className="py-4">
          <PSkeleton.List items={3} />
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
        <div className="flex justify-between items-center">
          <PPageHeader title="我的团队" description="管理您创建和加入的团队" />
          <div className="flex space-x-3">
            <Link to={ROUTES.user.invitationsInbox}>
              <PButton variant="secondary">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                邀请收件箱
              </PButton>
            </Link>
            <Link to={ROUTES.user.teamsCreate}>
              <PButton variant="primary">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                创建团队
              </PButton>
            </Link>
          </div>
        </div>

        {teams.length === 0 ? (
          <PCard className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">暂无团队</h3>
            <p className="mt-1 text-sm text-gray-500">您还没有加入任何团队，或者创建一个新团队开始协作。</p>
            <div className="mt-6">
              <Link to={ROUTES.user.teamsCreate}>
                <PButton variant="primary">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  创建团队
                </PButton>
              </Link>
            </div>
          </PCard>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <PCard key={team.team_id} variant="bordered" hoverable className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 truncate">{team.team_name}</h3>
                  {getRoleBadge(team.role)}
                </div>
                <div className="mt-4 text-sm text-gray-500">
                  加入时间: {new Date(team.joined_at).toLocaleDateString()}
                </div>
                <div className="mt-6 flex space-x-3">
                  <Link to={`/teams/${team.team_id}`} className="flex-1">
                    <PButton variant="secondary" className="w-full">查看详情</PButton>
                  </Link>
                  {(team.role === 'owner' || team.role === 'admin') && (
                    <Link to={`/teams/${team.team_id}/members`} className="flex-1">
                      <PButton variant="ghost" className="w-full">管理成员</PButton>
                    </Link>
                  )}
                </div>
              </PCard>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default TeamIndex;