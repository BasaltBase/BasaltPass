import React, { useEffect, useState } from 'react'
import { uiConfirm } from '@contexts/DialogContext'
import TenantLayout from '@features/tenant/components/TenantLayout'
import { PButton, PInput, PCard, PSelect } from '@ui'
import { tenantTeamApi, TenantTeamBrief } from '@api/tenant/tenantTeam'
import { PlusIcon, PencilIcon, TrashIcon, UsersIcon } from '@heroicons/react/24/outline'
import { useI18n } from '@shared/i18n'

export default function TenantTeamsPage() {
  const { t, locale } = useI18n()
  const [teams, setTeams] = useState<TenantTeamBrief[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', description: '', owner_user_id: '' })
  const [memberTeam, setMemberTeam] = useState<TenantTeamBrief | null>(null)
  const [members, setMembers] = useState<any[]>([])
  const [editTeam, setEditTeam] = useState<TenantTeamBrief | null>(null)
  const [editForm, setEditForm] = useState({ name: '', description: '', avatar_url: '', is_active: true })
  const [memberLoading, setMemberLoading] = useState(false)
  const [newMember, setNewMember] = useState({ user_id: '', role: 'member' })
  const [transferring, setTransferring] = useState(false)
  const limit = 20

  const load = async () => {
    setLoading(true)
    try {
      const res = await tenantTeamApi.list({ page, limit, keyword })
      setTeams(res.teams)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [page, keyword])

  const totalPages = Math.ceil(total / limit)

  const handleCreate = async () => {
    if (!createForm.name) return
    await tenantTeamApi.create({
      name: createForm.name,
      description: createForm.description,
      owner_user_id: createForm.owner_user_id ? Number(createForm.owner_user_id) : undefined,
    })
    setShowCreate(false)
    setCreateForm({ name: '', description: '', owner_user_id: '' })
    load()
  }

  const toggleActive = async (team: TenantTeamBrief) => {
    await tenantTeamApi.toggleActive(team.id, !team.is_active)
    if (editTeam && editTeam.id === team.id) {
      setEditTeam({ ...editTeam, is_active: !team.is_active })
      setEditForm((form) => ({ ...form, is_active: !team.is_active }))
    }
    load()
  }

  const openEdit = (team: TenantTeamBrief) => {
    setEditTeam(team)
    setEditForm({
      name: team.name,
      description: team.description,
      avatar_url: (team as any).avatar_url || '',
      is_active: team.is_active,
    })
  }

  const saveEdit = async () => {
    if (!editTeam) return
    if (!editForm.name.trim()) return
    await tenantTeamApi.update(editTeam.id, {
      name: editForm.name,
      description: editForm.description,
      avatar_url: editForm.avatar_url,
      is_active: editForm.is_active,
    })
    setEditTeam(null)
    load()
  }

  const toggleEditActive = () => {
    setEditForm((form) => ({ ...form, is_active: !form.is_active }))
  }

  const openMembers = async (team: TenantTeamBrief) => {
    setMemberTeam(team)
    setMembers([])
    setMemberLoading(true)
    try {
      const res = await tenantTeamApi.listMembers(team.id)
      setMembers(res)
    } finally {
      setMemberLoading(false)
    }
  }

  const reloadMembers = async () => {
    if (!memberTeam) return
    setMemberLoading(true)
    try {
      setMembers(await tenantTeamApi.listMembers(memberTeam.id))
    } finally {
      setMemberLoading(false)
    }
  }

  const addMember = async () => {
    if (!memberTeam) return
    if (!newMember.user_id) return
    await tenantTeamApi.addMember(memberTeam.id, { user_id: Number(newMember.user_id), role: newMember.role })
    setNewMember({ user_id: '', role: 'member' })
    reloadMembers()
  }

  const removeMember = async (member: any) => {
    if (!memberTeam) return
    if (!(await uiConfirm(t('tenantTeams.confirm.removeMember')))) return
    await tenantTeamApi.removeMember(memberTeam.id, member.user_id)
    reloadMembers()
  }

  const changeRole = async (member: any, role: string) => {
    if (!memberTeam) return
    await tenantTeamApi.updateMemberRole(memberTeam.id, member.user_id, role)
    reloadMembers()
  }

  const transferOwner = async (member: any) => {
    if (!memberTeam) return
    if (!(await uiConfirm(t('tenantTeams.confirm.transferOwner')))) return
    setTransferring(true)
    try {
      await tenantTeamApi.transferOwnership(memberTeam.id, member.user_id)
      load()
      reloadMembers()
    } finally {
      setTransferring(false)
    }
  }

  const removeTeam = async (team: TenantTeamBrief) => {
    if (!(await uiConfirm(t('tenantTeams.confirm.removeTeam')))) return
    await tenantTeamApi.remove(team.id)
    load()
  }

  return (
    <TenantLayout
      title={t('tenantTeams.layoutTitle')}
      actions={
        <PButton size="sm" leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
          {t('tenantTeams.actions.createTeam')}
        </PButton>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <div className="w-64">
            <PInput
              placeholder={t('tenantTeams.search.placeholder')}
              value={keyword}
              onChange={(e) => {
                setPage(1)
                setKeyword(e.target.value)
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {!loading &&
            teams.map((team) => (
              <PCard key={team.id} className="flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{team.name}</h3>
                    <PButton size="sm" variant={team.is_active ? 'secondary' : 'primary'} onClick={() => toggleActive(team)}>
                      {team.is_active ? t('tenantTeams.actions.deactivate') : t('tenantTeams.actions.activate')}
                    </PButton>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2">{team.description}</p>
                  <div className="text-xs text-gray-400">
                    {t('tenantTeams.card.meta', {
                      count: team.member_count,
                      date: new Date(team.created_at).toLocaleDateString(locale),
                    })}
                  </div>
                </div>
                <div className="mt-4 flex space-x-2">
                  <PButton size="sm" variant="secondary" leftIcon={<UsersIcon className="h-4 w-4" />} onClick={() => openMembers(team)}>
                    {t('tenantTeams.actions.members')}
                  </PButton>
                  <PButton size="sm" variant="ghost" leftIcon={<PencilIcon className="h-4 w-4" />} onClick={() => openEdit(team)}>
                    {t('tenantTeams.actions.edit')}
                  </PButton>
                  <PButton size="sm" variant="danger" leftIcon={<TrashIcon className="h-4 w-4" />} onClick={() => removeTeam(team)}>
                    {t('tenantTeams.actions.delete')}
                  </PButton>
                </div>
              </PCard>
            ))}
          {loading && <div className="text-sm text-gray-500">{t('tenantTeams.common.loading')}</div>}
        </div>

        {totalPages > 1 && (
          <div className="flex space-x-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((current) => (
              <button
                key={current}
                onClick={() => setPage(current)}
                className={`px-3 py-1 rounded-md text-sm ${
                  current === page ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-600'
                }`}
              >
                {current}
              </button>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">{t('tenantTeams.createModal.title')}</h2>
            <PInput
              placeholder={t('tenantTeams.createModal.namePlaceholder')}
              value={createForm.name}
              onChange={(e) => setCreateForm((form) => ({ ...form, name: e.target.value }))}
            />
            <PInput
              placeholder={t('tenantTeams.createModal.descriptionPlaceholder')}
              value={createForm.description}
              onChange={(e) => setCreateForm((form) => ({ ...form, description: e.target.value }))}
            />
            <PInput
              placeholder={t('tenantTeams.createModal.ownerUserIdPlaceholder')}
              value={createForm.owner_user_id}
              onChange={(e) => setCreateForm((form) => ({ ...form, owner_user_id: e.target.value }))}
            />
            <div className="flex justify-end space-x-2">
              <PButton variant="ghost" onClick={() => setShowCreate(false)}>
                {t('tenantTeams.actions.cancel')}
              </PButton>
              <PButton onClick={handleCreate}>{t('tenantTeams.actions.create')}</PButton>
            </div>
          </div>
        </div>
      )}

      {editTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">{t('tenantTeams.editModal.title')}</h2>
            <PInput
              placeholder={t('tenantTeams.editModal.namePlaceholder')}
              value={editForm.name}
              onChange={(e) => setEditForm((form) => ({ ...form, name: e.target.value }))}
            />
            <PInput
              placeholder={t('tenantTeams.editModal.descriptionPlaceholder')}
              value={editForm.description}
              onChange={(e) => setEditForm((form) => ({ ...form, description: e.target.value }))}
            />
            <PInput
              placeholder={t('tenantTeams.editModal.avatarUrlPlaceholder')}
              value={editForm.avatar_url}
              onChange={(e) => setEditForm((form) => ({ ...form, avatar_url: e.target.value }))}
            />
            <div className="flex items-center justify-between border rounded-md px-3 py-2 text-sm">
              <span>
                {t('tenantTeams.editModal.currentStatus')}:{' '}
                {editForm.is_active ? t('tenantTeams.status.active') : t('tenantTeams.status.inactive')}
              </span>
              <PButton size="sm" variant={editForm.is_active ? 'secondary' : 'primary'} onClick={toggleEditActive}>
                {editForm.is_active ? t('tenantTeams.actions.markInactive') : t('tenantTeams.actions.markActive')}
              </PButton>
            </div>
            <div className="flex justify-end space-x-2">
              <PButton variant="ghost" onClick={() => setEditTeam(null)}>
                {t('tenantTeams.actions.cancel')}
              </PButton>
              <PButton onClick={saveEdit}>{t('tenantTeams.actions.save')}</PButton>
            </div>
          </div>
        </div>
      )}

      {memberTeam && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-auto py-10">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t('tenantTeams.membersModal.title', { teamName: memberTeam.name })}</h2>
              <PButton
                size="sm"
                variant="ghost"
                onClick={() => {
                  setMemberTeam(null)
                  setMembers([])
                }}
              >
                {t('tenantTeams.actions.close')}
              </PButton>
            </div>
            <div className="border rounded-md p-3 space-y-3">
              <div className="flex space-x-2 items-end">
                <PInput
                  className="w-40"
                  placeholder={t('tenantTeams.membersModal.userIdPlaceholder')}
                  value={newMember.user_id}
                  onChange={(e) => setNewMember((value) => ({ ...value, user_id: e.target.value }))}
                />
                <PSelect className="w-36" value={newMember.role} onChange={(e) => setNewMember((value) => ({ ...value, role: e.target.value }))}>
                  <option value="member">{t('tenantTeams.roles.member')}</option>
                  <option value="tenant">{t('tenantTeams.roles.admin')}</option>
                </PSelect>
                <PButton size="sm" onClick={addMember}>
                  {t('tenantTeams.actions.add')}
                </PButton>
              </div>
              <div className="text-sm text-gray-500">{t('tenantTeams.membersModal.memberCount', { count: members.length })}</div>
              <div className="divide-y border rounded-md">
                {memberLoading && <div className="p-4 text-sm text-gray-500">{t('tenantTeams.common.loading')}</div>}
                {!memberLoading &&
                  members.map((member) => (
                    <div key={member.user_id} className="p-3 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-medium text-sm">
                          UID {member.user_id}{' '}
                          {member.is_owner && (
                            <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-600">{t('tenantTeams.roles.owner')}</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {t('tenantTeams.membersModal.joinedAt', {
                            date: member.joined_at ? new Date(member.joined_at).toLocaleDateString(locale) : '-',
                          })}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <PSelect
                          className="w-32 text-sm"
                          value={member.role}
                          onChange={(e) => changeRole(member, e.target.value)}
                          disabled={member.is_owner}
                        >
                          <option value="member">{t('tenantTeams.roles.member')}</option>
                          <option value="tenant">{t('tenantTeams.roles.admin')}</option>
                          <option value="owner" disabled>
                            {t('tenantTeams.roles.owner')}
                          </option>
                        </PSelect>
                        {!member.is_owner && (
                          <PButton size="sm" variant="danger" onClick={() => removeMember(member)}>
                            {t('tenantTeams.actions.remove')}
                          </PButton>
                        )}
                        {!member.is_owner && (
                          <PButton size="sm" variant="secondary" disabled={transferring} onClick={() => transferOwner(member)}>
                            {t('tenantTeams.actions.transferOwner')}
                          </PButton>
                        )}
                      </div>
                    </div>
                  ))}
                {!memberLoading && members.length === 0 && <div className="p-4 text-sm text-gray-500">{t('tenantTeams.membersModal.empty')}</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </TenantLayout>
  )
}
