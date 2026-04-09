import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import AdminLayout from '@features/admin/components/AdminLayout'
import { PButton, PInput, PSelect, PBadge } from '@ui'
import PTable, { PTableColumn } from '@ui/PTable'
import { adminInvitationApi, AdminInvitationBrief } from '@api/admin/invitation'
import { adminTeamApi } from '@api/admin/team'
import { FunnelIcon, PlusIcon, ArrowPathIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useI18n } from '@shared/i18n'

export default function AdminInvitationsPage() {
  const { t, locale } = useI18n()
  const [list, setList] = useState<AdminInvitationBrief[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('')
  const [keyword, setKeyword] = useState('')
  const [teamOptions, setTeamOptions] = useState<{label:string; value:string}[]>([])
  const [teamId, setTeamId] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ team_id: '', invitee_ids: '', remark: '' })
  const limit = 20

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminInvitationApi.list({ page, limit, status, keyword, team_id: teamId? Number(teamId): undefined })
      setList(res.invitations)
      setTotal(res.total)
    } finally { setLoading(false) }
  }
  useEffect(()=>{ load() }, [page, status, keyword, teamId])

  useEffect(()=>{ // load team options once
    (async()=>{
      const res = await adminTeamApi.list({ page:1, limit:100 })
      setTeamOptions(res.teams.map(t=>({label:t.name, value:String(t.id)})))
    })()
  },[])

  const totalPages = Math.ceil(total/limit)

  const handleCreate = async () => {
    if(!createForm.team_id || !createForm.invitee_ids) return
    const inviteeIDs = createForm.invitee_ids.split(',').map(s=>Number(s.trim())).filter(Boolean)
    await adminInvitationApi.create({ team_id: Number(createForm.team_id), invitee_ids: inviteeIDs, remark: createForm.remark })
    setShowCreate(false)
    setCreateForm({ team_id: '', invitee_ids: '', remark: '' })
    load()
  }

  const updateStatus = async (inv: AdminInvitationBrief, next: string) => {
    await adminInvitationApi.updateStatus(inv.id, next)
    load()
  }

  const removeInvitation = async (inv: AdminInvitationBrief) => {
    if(!await uiConfirm(t('adminInvitations.confirmDelete'))) return
    await adminInvitationApi.remove(inv.id)
    load()
  }

  const getStatusText = (statusValue: string) => {
    if (statusValue === 'pending') return t('adminInvitations.status.pending')
    if (statusValue === 'accepted') return t('adminInvitations.status.accepted')
    if (statusValue === 'rejected') return t('adminInvitations.status.rejected')
    if (statusValue === 'revoked') return t('adminInvitations.status.revoked')
    return statusValue
  }

  const columns: PTableColumn<AdminInvitationBrief>[] = [
    { key: 'id', title: 'ID', dataIndex: 'id', sortable: true, align: 'center' },
    { key: 'team', title: t('adminInvitations.columns.team'), align: 'left', render: (inv) => `${inv.team_name}#${inv.team_id}` },
    { key: 'inviter', title: t('adminInvitations.columns.inviter'), align: 'center', render: (inv) => inv.inviter_id },
    { key: 'invitee', title: t('adminInvitations.columns.invitee'), align: 'center', render: (inv) => inv.invitee_id },
    {
      key: 'status', title: t('adminInvitations.columns.status'), align: 'center', render: (inv) => (
        <PBadge variant={inv.status==='pending'?'warning':inv.status==='accepted'?'success':inv.status==='rejected'?'error':'default'}>
          {getStatusText(inv.status)}
        </PBadge>
      )
    },
    { key: 'remark', title: t('adminInvitations.columns.remark'), className: 'max-w-xs truncate', render: (inv) => inv.remark || '' },
    { key: 'created_at', title: t('adminInvitations.columns.createdAt'), sortable: true, render: (inv) => new Date(inv.created_at).toLocaleString(locale) },
    {
      key: 'actions', title: t('adminInvitations.columns.actions'), align: 'right', render: (inv) => (
        <div className='flex items-center justify-end space-x-2'>
          {inv.status==='pending' && <>
            <PButton size='sm' variant='secondary' onClick={()=>updateStatus(inv,'accepted')}>{t('adminInvitations.actions.accept')}</PButton>
            <PButton size='sm' variant='ghost' onClick={()=>updateStatus(inv,'rejected')}>{t('adminInvitations.actions.reject')}</PButton>
            <PButton size='sm' variant='ghost' onClick={()=>updateStatus(inv,'revoked')}>{t('adminInvitations.actions.revoke')}</PButton>
          </>}
          <PButton size='sm' variant='danger' leftIcon={<TrashIcon className='h-4 w-4'/>} onClick={()=>removeInvitation(inv)}/>
        </div>
      )
    },
  ]

  return (
    <AdminLayout title={t('adminInvitations.title')} actions={<PButton size='sm' leftIcon={<PlusIcon className='h-4 w-4'/>} onClick={()=>setShowCreate(true)}>{t('adminInvitations.actions.createInvitation')}</PButton>}>
      <div className='space-y-6'>
        <div className='flex flex-wrap items-center gap-4'>
          <div className='w-56'><PInput placeholder={t('adminInvitations.filters.searchPlaceholder')} value={keyword} onChange={e=>{setPage(1); setKeyword(e.target.value)}}/></div>
          <div className='w-40'>
            <PSelect value={status} onChange={e=>{setPage(1); setStatus(e.target.value)}}>
              <option value=''>{t('adminInvitations.filters.allStatus')}</option>
              <option value='pending'>{t('adminInvitations.status.pending')}</option>
              <option value='accepted'>{t('adminInvitations.status.accepted')}</option>
              <option value='rejected'>{t('adminInvitations.status.rejected')}</option>
              <option value='revoked'>{t('adminInvitations.status.revoked')}</option>
            </PSelect>
          </div>
          <div className='w-48'>
            <PSelect value={teamId} onChange={e=>{setPage(1); setTeamId(e.target.value)}}>
              <option value=''>{t('adminInvitations.filters.allTeams')}</option>
              {teamOptions.map(o=> <option key={o.value} value={o.value}>{o.label}</option>)}
            </PSelect>
          </div>
          <PButton variant='ghost' size='sm' leftIcon={<FunnelIcon className='h-4 w-4'/>}>{t('adminInvitations.filters.filter')}</PButton>
        </div>
        <PTable
          columns={columns}
          data={list}
          rowKey={(row)=> row.id}
          loading={loading}
          defaultSort={{ key: 'created_at', order: 'desc' }}
        />
        {totalPages>1 && (
          <div className='flex space-x-2'>
            {Array.from({length: totalPages}, (_,i)=>i+1).map(p=> (
              <PButton key={p} size='sm' variant={p===page ? 'primary' : 'secondary'} onClick={()=>setPage(p)}>{p}</PButton>
            ))}
          </div>) }
      </div>

      {showCreate && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/30'>
          <div className='bg-white rounded-lg shadow-lg w-full max-w-md p-6 space-y-4'>
            <h2 className='text-lg font-semibold'>{t('adminInvitations.createModal.title')}</h2>
            <PSelect value={createForm.team_id} onChange={e=>setCreateForm(f=>({...f, team_id:e.target.value}))}>
              <option value=''>{t('adminInvitations.createModal.selectTeam')}</option>
              {teamOptions.map(o=> <option key={o.value} value={o.value}>{o.label}</option>)}
            </PSelect>
            <PInput placeholder={t('adminInvitations.createModal.inviteePlaceholder')} value={createForm.invitee_ids} onChange={e=>setCreateForm(f=>({...f, invitee_ids:e.target.value}))}/>
            <PInput placeholder={t('adminInvitations.createModal.remarkPlaceholder')} value={createForm.remark} onChange={e=>setCreateForm(f=>({...f, remark:e.target.value}))}/>
            <div className='flex justify-end space-x-2'>
              <PButton variant='ghost' onClick={()=>setShowCreate(false)}>{t('adminInvitations.actions.cancel')}</PButton>
              <PButton onClick={handleCreate}>{t('adminInvitations.actions.create')}</PButton>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
