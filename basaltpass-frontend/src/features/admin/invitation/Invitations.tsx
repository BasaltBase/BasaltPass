import { useEffect, useState } from 'react'
import AdminLayout from '@features/admin/components/AdminLayout'
import { PButton, PInput, PSelect } from '@ui'
import PTable, { PTableColumn } from '@ui/PTable'
import { adminInvitationApi, AdminInvitationBrief } from '@api/admin/invitation'
import { adminTeamApi } from '@api/admin/team'
import { FunnelIcon, PlusIcon, ArrowPathIcon, TrashIcon } from '@heroicons/react/24/outline'

export default function AdminInvitationsPage() {
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
    if(!confirm('确认删除邀请记录?')) return
    await adminInvitationApi.remove(inv.id)
    load()
  }

  const columns: PTableColumn<AdminInvitationBrief>[] = [
    { key: 'id', title: 'ID', dataIndex: 'id', sortable: true, align: 'center' },
    { key: 'team', title: '团队', align: 'left', render: (inv) => `${inv.team_name}#${inv.team_id}` },
    { key: 'inviter', title: '邀请人', align: 'center', render: (inv) => inv.inviter_id },
    { key: 'invitee', title: '被邀请人', align: 'center', render: (inv) => inv.invitee_id },
    {
      key: 'status', title: '状态', align: 'center', render: (inv) => (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${inv.status==='pending'?'bg-yellow-100 text-yellow-800':inv.status==='accepted'?'bg-green-100 text-green-800':inv.status==='rejected'?'bg-red-100 text-red-800':'bg-gray-100 text-gray-600'}`}>{inv.status}</span>
      )
    },
    { key: 'remark', title: '备注', className: 'max-w-xs truncate', render: (inv) => inv.remark || '' },
    { key: 'created_at', title: '创建时间', sortable: true, render: (inv) => new Date(inv.created_at).toLocaleString() },
    {
      key: 'actions', title: '操作', align: 'right', render: (inv) => (
        <div className='flex items-center justify-end space-x-2'>
          {inv.status==='pending' && <>
            <PButton size='sm' variant='secondary' onClick={()=>updateStatus(inv,'accepted')}>接受</PButton>
            <PButton size='sm' variant='ghost' onClick={()=>updateStatus(inv,'rejected')}>拒绝</PButton>
            <PButton size='sm' variant='ghost' onClick={()=>updateStatus(inv,'revoked')}>撤回</PButton>
          </>}
          <PButton size='sm' variant='danger' leftIcon={<TrashIcon className='h-4 w-4'/>} onClick={()=>removeInvitation(inv)}/>
        </div>
      )
    },
  ]

  return (
    <AdminLayout title="邀请管理" actions={<PButton size='sm' leftIcon={<PlusIcon className='h-4 w-4'/>} onClick={()=>setShowCreate(true)}>新建邀请</PButton>}>
      <div className='space-y-6'>
        <div className='flex flex-wrap items-center gap-4'>
          <div className='w-56'><PInput placeholder='搜索备注/团队' value={keyword} onChange={e=>{setPage(1); setKeyword(e.target.value)}}/></div>
          <div className='w-40'>
            <PSelect value={status} onChange={e=>{setPage(1); setStatus(e.target.value)}}>
              <option value=''>全部状态</option>
              <option value='pending'>待处理</option>
              <option value='accepted'>已接受</option>
              <option value='rejected'>已拒绝</option>
              <option value='revoked'>已撤回</option>
            </PSelect>
          </div>
          <div className='w-48'>
            <PSelect value={teamId} onChange={e=>{setPage(1); setTeamId(e.target.value)}}>
              <option value=''>全部团队</option>
              {teamOptions.map(o=> <option key={o.value} value={o.value}>{o.label}</option>)}
            </PSelect>
          </div>
          <PButton variant='ghost' size='sm' leftIcon={<FunnelIcon className='h-4 w-4'/>}>筛选</PButton>
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
            <h2 className='text-lg font-semibold'>新建邀请</h2>
            <PSelect value={createForm.team_id} onChange={e=>setCreateForm(f=>({...f, team_id:e.target.value}))}>
              <option value=''>选择团队</option>
              {teamOptions.map(o=> <option key={o.value} value={o.value}>{o.label}</option>)}
            </PSelect>
            <PInput placeholder='被邀请用户ID(多个逗号分隔)' value={createForm.invitee_ids} onChange={e=>setCreateForm(f=>({...f, invitee_ids:e.target.value}))}/>
            <PInput placeholder='备注' value={createForm.remark} onChange={e=>setCreateForm(f=>({...f, remark:e.target.value}))}/>
            <div className='flex justify-end space-x-2'>
              <PButton variant='ghost' onClick={()=>setShowCreate(false)}>取消</PButton>
              <PButton onClick={handleCreate}>创建</PButton>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
