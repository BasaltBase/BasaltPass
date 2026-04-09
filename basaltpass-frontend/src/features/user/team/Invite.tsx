import React, { useState } from 'react'
import { uiAlert } from '@contexts/DialogContext'
import Layout from '@features/user/components/Layout'
import { invitationApi } from '@api/user/invitation'
import { EntitySearchSelect, type BaseEntityItem, PButton, PTextarea } from '@ui'
import { useNavigate, useParams } from 'react-router-dom'
import { DocumentTextIcon } from '@heroicons/react/24/outline'
import { useI18n } from '@shared/i18n'

const Invite: React.FC = () => {
  const { t } = useI18n()
  const { id } = useParams<{ id: string }>()
  const teamId = Number(id)
  const [selectedUsers, setSelectedUsers] = useState<BaseEntityItem[]>([])
  const [remark, setRemark] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  // ，

  // 
  const submit = async () => {
    if (selectedUsers.length === 0) {
      uiAlert(t('pages.teamInvite.alerts.selectAtLeastOneUser'))
      return
    }
    
    setLoading(true)
    try {
      const userIds = selectedUsers.map(u => Number(u.id))
      await invitationApi.create(teamId, userIds, remark)
      uiAlert(t('pages.teamInvite.alerts.inviteSuccess', { count: selectedUsers.length }))
      navigate(`/teams/${teamId}`)
    } catch (error: any) {
      uiAlert(error.response?.data?.message || t('pages.teamInvite.alerts.inviteFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-gray-900">{t('pages.teamInvite.title')}</h1>
            <p className="text-sm text-gray-500">
              {t('pages.teamInvite.description')}
            </p>
          </div>
          <PButton
            onClick={() => navigate(`/teams/${teamId}`)}
            variant="secondary"
            size="sm"
          >
            {t('pages.teamInvite.actions.backToTeam')}
          </PButton>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 space-y-1">
            <h2 className="text-sm font-semibold text-gray-900">{t('pages.teamInvite.selectUsersTitle')}</h2>
            <p className="text-sm text-gray-500">{t('pages.teamInvite.selectUsersDescription')}</p>
          </div>
          <EntitySearchSelect
            entity="user"
            context="user"
            value={selectedUsers}
            onChange={setSelectedUsers}
            placeholder={t('pages.teamInvite.searchPlaceholder')}
            limit={10}
            variant="chips"
          />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <label className="flex items-center text-sm font-semibold text-gray-700">
              <DocumentTextIcon className="mr-2 h-5 w-5 text-gray-400" />
              {t('pages.teamInvite.remarkLabel')}
            </label>
            <PTextarea
              value={remark}
              onChange={e => setRemark(e.target.value)}
              rows={3}
              placeholder={t('pages.teamInvite.remarkPlaceholder')}
              variant="rounded"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 border-t border-gray-200 pt-4">
          <PButton
            onClick={() => navigate(`/teams/${teamId}`)}
            variant="secondary"
          >
            {t('pages.teamInvite.actions.cancel')}
          </PButton>
          <PButton
            disabled={loading || selectedUsers.length === 0}
            loading={loading}
            onClick={submit}
            variant="primary"
          >
            {t('pages.teamInvite.actions.sendInvites', { count: selectedUsers.length })}
          </PButton>
        </div>
      </div>

    </Layout>
  )
}

export default Invite 
