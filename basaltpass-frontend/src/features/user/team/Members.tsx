import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '@features/user/components/Layout';
import { PCard, PButton, PSkeleton, PAlert, PBadge, PPageHeader } from '@ui';
import PTable, { PTableColumn, PTableAction } from '@ui/PTable';
import { teamApi } from '@api/user/team';
import { useI18n } from '@shared/i18n';

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
  const { t, locale } = useI18n();
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
      // API
      const response = await teamApi.getTeam(parseInt(id!));
      // API
      // API
      setMembers([]); // ，API
      setCurrentUserRole(response.data.data?.user_role || '');
    } catch (err: any) {
      setError(err.response?.data?.message || t('pages.teamMembers.errors.loadFailed'));
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
      owner: t('pages.teamDetail.roles.owner'),
      admin: t('pages.teamDetail.roles.admin'),
      member: t('pages.teamDetail.roles.member'),
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
        <PAlert variant="error" title={t('pages.teamMembers.errors.title')} message={error} />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/*  */}
        <div className="flex items-center justify-between">
          <PPageHeader title={t('pages.teamMembers.title')} description={t('pages.teamMembers.description')} />
          <Link
            to={`/teams/${id}`}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            {t('pages.teamMembers.actions.backToTeam')}
          </Link>
        </div>

        {/*  */}
        <div className="rounded-xl bg-white shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">{t('pages.teamMembers.memberListTitle')}</h3>
              {canManageMembers && (
                <Link to={`/teams/invite/${id}`}>
                  <PButton variant="primary">{t('pages.teamMembers.actions.inviteMembers')}</PButton>
                </Link>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            {(() => {
              const columns: PTableColumn<TeamMember>[] = [
                {
                  key: 'user',
                  title: t('pages.teamMembers.columns.user'),
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
                          {member.user.nickname || t('pages.teamMembers.noNickname')}
                        </div>
                        <div className="text-sm text-gray-500">
                          {member.user.email}
                        </div>
                      </div>
                    </div>
                  )
                },
                { key: 'role', title: t('pages.teamMembers.columns.role'), render: (m) => getRoleBadge(m.role) },
                {
                  key: 'joined_at',
                  title: t('pages.teamMembers.columns.joinedAt'),
                  sortable: true,
                  sorter: (a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime(),
                  render: (member) => new Date(member.joined_at).toLocaleDateString(locale),
                },
              ];

              const actions: PTableAction<TeamMember>[] = canManageMembers
                ? [
                    { key: 'edit', label: t('pages.teamMembers.actions.editRole'), variant: 'secondary', size: 'sm', onClick: () => {/* TODO: open role modal */} },
                    { key: 'remove', label: t('pages.teamMembers.actions.remove'), variant: 'danger', size: 'sm', onClick: () => {/* TODO: remove member */} },
                  ]
                : [];

              return (
                <PTable
                  columns={columns}
                  data={members}
                  rowKey={(row) => row.id}
                  actions={actions}
                  emptyText={t('pages.teamMembers.empty')}
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
