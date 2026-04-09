import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '@features/user/components/Layout';
import { PCard, PButton, PSkeleton, PAlert, PBadge, PPageHeader } from '@ui';
import { teamApi, TeamResponse } from '@api/user/team';
import { invitationApi, Invitation } from '@api/user/invitation';
import { XMarkIcon, ClockIcon } from '@heroicons/react/24/outline';
import { ROUTES } from '@constants';
import { useI18n } from '@shared/i18n';

const TeamDetail: React.FC = () => {
  const { t, locale } = useI18n();
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
      setError(err.response?.data?.message || t('pages.teamDetail.errors.loadTeamFailed'));
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
      console.error(t('pages.teamDetail.logs.loadInvitationsFailed'), error);
    } finally {
      setInvitationsLoading(false);
    }
  };

  const revokeInvitation = async (invitationId: number) => {
    if (!team) return;
    
    try {
      await invitationApi.revoke(team.id, invitationId);
      loadOutgoingInvitations(); // 
    } catch (error: any) {
      uiAlert(error.response?.data?.message || t('pages.teamDetail.errors.revokeInviteFailed'));
    }
  };

  const handleDeleteTeam = async () => {
    if (!team) return;

    try {
      await teamApi.deleteTeam(team.id);
      navigate(ROUTES.user.teams, { 
        state: { message: t('pages.teamDetail.messages.teamDeletedSuccess') }
      });
    } catch (err: any) {
      setError(err.response?.data?.message || t('pages.teamDetail.errors.deleteFailed'));
    }
  };

  const handleLeaveTeam = async () => {
    if (!team) return;

    try {
      await teamApi.leaveTeam(team.id);
      navigate(ROUTES.user.teams, { 
        state: { message: t('pages.teamDetail.messages.teamLeftSuccess') }
      });
    } catch (err: any) {
      setError(err.response?.data?.message || t('pages.teamDetail.errors.leaveFailed'));
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

  const getInvitationStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { text: t('pages.teamDetail.invitationStatus.pending'), variant: 'warning' as const },
      accepted: { text: t('pages.teamDetail.invitationStatus.accepted'), variant: 'success' as const },
      rejected: { text: t('pages.teamDetail.invitationStatus.rejected'), variant: 'error' as const },
      revoked: { text: t('pages.teamDetail.invitationStatus.revoked'), variant: 'default' as const },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <PBadge variant={config.variant}>{config.text}</PBadge>;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale) + ' ' + date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
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
        <PAlert variant="error" title={t('pages.teamDetail.errors.loadFailedTitle')} message={error || t('pages.teamDetail.errors.teamNotFound')} />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/*  */}
        <div className="flex items-center justify-between">
          <PPageHeader title={team.name} description={team.description || t('pages.teamDetail.header.defaultDescription')} />
          <div className="flex items-center space-x-3">
            {team.user_role && getRoleBadge(team.user_role)}
            <Link
              to={ROUTES.user.teams}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              {t('pages.teamDetail.header.backToList')}
            </Link>
          </div>
        </div>

        {/*  */}
        <div className="rounded-xl bg-white shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">{t('pages.teamDetail.sections.teamInfo')}</h3>
          </div>
          <div className="px-6 py-4">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">{t('pages.teamDetail.fields.teamName')}</dt>
                <dd className="mt-1 text-sm text-gray-900">{team.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">{t('pages.teamDetail.fields.memberCount')}</dt>
                <dd className="mt-1 text-sm text-gray-900">{team.member_count} {t('pages.teamDetail.common.peopleUnit')}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">{t('pages.teamDetail.fields.createdAt')}</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(team.created_at).toLocaleString(locale)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">{t('pages.teamDetail.fields.updatedAt')}</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(team.updated_at).toLocaleString(locale)}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">{t('pages.teamDetail.fields.description')}</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {team.description || t('pages.teamDetail.common.noDescription')}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/*  */}
        <div className="rounded-xl bg-white shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">{t('pages.teamDetail.sections.teamActions')}</h3>
          </div>
          <div className="px-6 py-4">
            <div className="flex flex-wrap gap-3">
              <Link to={`/teams/${team.id}/members`}>
                <PButton variant="primary">{t('pages.teamDetail.actions.manageMembers')}</PButton>
              </Link>

              {(team.user_role === 'owner' || team.user_role === 'admin') && (
                <>
                  <Link to={`/teams/invite/${team.id}`}>
                    <PButton variant="secondary">{t('pages.teamDetail.actions.inviteMembers')}</PButton>
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
                    {t('pages.teamDetail.actions.manageInvitations')}
                  </PButton>

                  <Link to={`/teams/${team.id}/edit`}>
                    <PButton variant="secondary">{t('pages.teamDetail.actions.editTeam')}</PButton>
                  </Link>
                </>
              )}

              {team.user_role === 'owner' && (
                <PButton variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                  {t('pages.teamDetail.actions.deleteTeam')}
                </PButton>
              )}

              {team.user_role !== 'owner' && (
                <PButton variant="ghost" onClick={() => setShowDeleteConfirm(true)}>
                  {t('pages.teamDetail.actions.leaveTeam')}
                </PButton>
              )}
            </div>
          </div>
        </div>

        {/*  */}
        {showInvitations && (team.user_role === 'owner' || team.user_role === 'admin') && (
          <div className="rounded-xl bg-white shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">{t('pages.teamDetail.sections.outgoingInvitations')}</h3>
            </div>
            <div className="px-6 py-4">
              {invitationsLoading ? (
                <PSkeleton variant="rect" width="100%" height="1.5rem" />
              ) : outgoingInvitations.length === 0 ? (
                <p className="text-gray-500 text-center py-4">{t('pages.teamDetail.invitations.empty')}</p>
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
                            {t('pages.teamDetail.invitations.remarkPrefix', { remark: invitation.remark })}
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
                          {t('pages.teamDetail.actions.revoke')}
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

      {/*  -  space-y-6  */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 !m-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto w-96 rounded-2xl border bg-white p-5 shadow-xl">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {team.user_role === 'owner' ? t('pages.teamDetail.confirm.titleDelete') : t('pages.teamDetail.confirm.titleLeave')}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {team.user_role === 'owner' 
                  ? t('pages.teamDetail.confirm.messageDelete')
                  : t('pages.teamDetail.confirm.messageLeave')
                }
              </p>
              <div className="flex justify-center space-x-3">
                <PButton variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                  {t('pages.teamDetail.confirm.cancel')}
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
                  {team.user_role === 'owner' ? t('pages.teamDetail.confirm.confirmDelete') : t('pages.teamDetail.confirm.confirmLeave')}
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
