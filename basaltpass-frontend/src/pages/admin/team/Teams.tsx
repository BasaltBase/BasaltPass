import { useEffect, useState } from 'react'
import AdminLayout from '@components/AdminLayout'
import { PButton, PInput, PCard, PSelect } from '@components/index'
import { adminTeamApi, AdminTeamBrief } from '@api/admin/team'
import { PlusIcon, PencilIcon, TrashIcon, UsersIcon } from '@heroicons/react/24/outline'

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<AdminTeamBrief[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', description: '', owner_user_id: '' })
  const [memberTeam, setMemberTeam] = useState<AdminTeamBrief|null>(null)
  const [members, setMembers] = useState<any[]>([])
  const [editTeam, setEditTeam] = useState<AdminTeamBrief|null>(null)
  const [editForm, setEditForm] = useState({ name: '', description: '', avatar_url: '', is_active: true })
  const [memberLoading, setMemberLoading] = useState(false)
  const [newMember, setNewMember] = useState({ user_id: '', role: 'member' })
  const [transferring, setTransferring] = useState(false)
  const limit = 20

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminTeamApi.list({ page, limit, keyword })
      setTeams(res.teams)
      setTotal(res.total)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [page, keyword])

  const totalPages = Math.ceil(total / limit)

  const handleCreate = async () => {
    if(!createForm.name) return
    await adminTeamApi.create({ name: createForm.name, description: createForm.description, owner_user_id: createForm.owner_user_id ? Number(createForm.owner_user_id) : undefined })
    setShowCreate(false)
    setCreateForm({ name: '', description: '', owner_user_id: '' })
    load()
  }

  const toggleActive = async (team: AdminTeamBrief) => {
    await adminTeamApi.toggleActive(team.id, !team.is_active)
    if(editTeam && editTeam.id === team.id){
      setEditTeam({...editTeam, is_active: !team.is_active})
      setEditForm(f=>({...f, is_active: !team.is_active}))
    }
    load()
  }
  const openEdit = (team: AdminTeamBrief) => {
    setEditTeam(team)
    setEditForm({ name: team.name, description: team.description, avatar_url: (team as any).avatar_url || '', is_active: team.is_active })
  }

  const saveEdit = async () => {
    if(!editTeam) return
    if(!editForm.name.trim()) return
    await adminTeamApi.update(editTeam.id, { name: editForm.name, description: editForm.description, avatar_url: editForm.avatar_url, is_active: editForm.is_active })
    setEditTeam(null)
    load()
  }

  const toggleEditActive = () => {
    setEditForm(f=>({...f, is_active: !f.is_active}))
  }

  const openMembers = async (team: AdminTeamBrief) => {
    setMemberTeam(team)
    setMembers([])
    setMemberLoading(true)
    try {
      const res = await adminTeamApi.listMembers(team.id)
      setMembers(res)
    } finally { setMemberLoading(false) }
  }

  const reloadMembers = async () => {
    if(!memberTeam) return
    setMemberLoading(true)
    try { setMembers(await adminTeamApi.listMembers(memberTeam.id)) } finally { setMemberLoading(false) }
  }

  const addMember = async () => {
    if(!memberTeam) return
    if(!newMember.user_id) return
    await adminTeamApi.addMember(memberTeam.id, { user_id: Number(newMember.user_id), role: newMember.role })
    setNewMember({ user_id: '', role: 'member' })
    reloadMembers()
  }

  const removeMember = async (m: any) => {
    if(!memberTeam) return
    if(!confirm('确认移除成员?')) return
    await adminTeamApi.removeMember(memberTeam.id, m.user_id)
    reloadMembers()
  }

  const changeRole = async (m: any, role: string) => {
    if(!memberTeam) return
    await adminTeamApi.updateMemberRole(memberTeam.id, m.user_id, role)
    reloadMembers()
  }

  const transferOwner = async (m: any) => {
    if(!memberTeam) return
    if(!confirm('确认将所有者转移给该成员?')) return
    setTransferring(true)
    try { await adminTeamApi.transferOwnership(memberTeam.id, m.user_id); load(); reloadMembers() } finally { setTransferring(false) }
  }

  const removeTeam = async (team: AdminTeamBrief) => {
    if(!confirm('确认删除团队?')) return
    await adminTeamApi.remove(team.id)
    load()
  }

  return (
    <AdminLayout title="团队管理" actions={<PButton size="sm" leftIcon={<PlusIcon className='h-4 w-4'/>} onClick={()=>setShowCreate(true)}>新建团队</PButton>}>
      <div className='space-y-6'>
        <div className='flex items-center space-x-4'>
          <div className='w-64'>
            <PInput placeholder='搜索团队名称/描述' value={keyword} onChange={e=>{setPage(1); setKeyword(e.target.value)}}/>
          </div>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {teams.map(t=> (
            <PCard key={t.id} className='flex flex-col justify-between'>
              <div className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <h3 className='text-lg font-semibold'>{t.name}</h3>
                  <PButton size='sm' variant={t.is_active? 'secondary':'primary'} onClick={()=>toggleActive(t)}>
                    {t.is_active? '停用':'启用'}
                  </PButton>
                </div>
                <p className='text-sm text-gray-500 line-clamp-2'>{t.description}</p>
                <div className='text-xs text-gray-400'>成员 {t.member_count} · 创建 {new Date(t.created_at).toLocaleDateString()}</div>
              </div>
              <div className='mt-4 flex space-x-2'>
                <PButton size='sm' variant='secondary' leftIcon={<UsersIcon className='h-4 w-4'/>} onClick={()=>openMembers(t)}>成员</PButton>
                <PButton size='sm' variant='ghost' leftIcon={<PencilIcon className='h-4 w-4'/>} onClick={()=>openEdit(t)}>编辑</PButton>
                <PButton size='sm' variant='danger' leftIcon={<TrashIcon className='h-4 w-4'/>} onClick={()=>removeTeam(t)}>删除</PButton>
              </div>
            </PCard>
          ))}
        </div>
        {totalPages>1 && (
          <div className='flex space-x-2'>
            {Array.from({length: totalPages}, (_,i)=>i+1).map(p=> (
              <button key={p} onClick={()=>setPage(p)} className={`px-3 py-1 rounded-md text-sm ${p===page? 'bg-indigo-600 text-white':'bg-white border text-gray-600'}`}>{p}</button>
            ))}
          </div>) }
      </div>

      {showCreate && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/30'>
          <div className='bg-white rounded-lg shadow-lg w-full max-w-md p-6 space-y-4'>
            <h2 className='text-lg font-semibold'>新建团队</h2>
            <PInput placeholder='名称' value={createForm.name} onChange={e=>setCreateForm(f=>({...f,name:e.target.value}))}/>
            <PInput placeholder='描述' value={createForm.description} onChange={e=>setCreateForm(f=>({...f,description:e.target.value}))}/>
            <PInput placeholder='所有者用户ID(可选)' value={createForm.owner_user_id} onChange={e=>setCreateForm(f=>({...f,owner_user_id:e.target.value}))}/>
            <div className='flex justify-end space-x-2'>
              <PButton variant='ghost' onClick={()=>setShowCreate(false)}>取消</PButton>
              <PButton onClick={handleCreate}>创建</PButton>
            </div>
          </div>
        </div>
      )}

      {editTeam && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/30'>
          <div className='bg-white rounded-lg shadow-lg w-full max-w-md p-6 space-y-4'>
            <h2 className='text-lg font-semibold'>编辑团队</h2>
            <PInput placeholder='名称' value={editForm.name} onChange={e=>setEditForm(f=>({...f,name:e.target.value}))}/>
            <PInput placeholder='描述' value={editForm.description} onChange={e=>setEditForm(f=>({...f,description:e.target.value}))}/>
            <PInput placeholder='头像URL' value={editForm.avatar_url} onChange={e=>setEditForm(f=>({...f,avatar_url:e.target.value}))}/>
            <div className='flex items-center justify-between border rounded-md px-3 py-2 text-sm'>
              <span>当前状态: {editForm.is_active? '启用':'停用'}</span>
              <PButton size='sm' variant={editForm.is_active? 'secondary':'primary'} onClick={toggleEditActive}>{editForm.is_active? '标记停用':'标记启用'}</PButton>
            </div>
            <div className='flex justify-end space-x-2'>
              <PButton variant='ghost' onClick={()=>setEditTeam(null)}>取消</PButton>
              <PButton onClick={saveEdit}>保存</PButton>
            </div>
          </div>
        </div>
      )}

      {memberTeam && (
        <div className='fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-auto py-10'>
          <div className='bg-white rounded-lg shadow-lg w-full max-w-3xl p-6 space-y-4'>
            <div className='flex items-center justify-between'>
              <h2 className='text-lg font-semibold'>成员管理 - {memberTeam.name}</h2>
              <PButton size='sm' variant='ghost' onClick={()=>{setMemberTeam(null); setMembers([])}}>关闭</PButton>
            </div>
            <div className='border rounded-md p-3 space-y-3'>
              <div className='flex space-x-2 items-end'>
                <PInput className='w-40' placeholder='用户ID' value={newMember.user_id} onChange={e=>setNewMember(v=>({...v,user_id:e.target.value}))}/>
                <PSelect className='w-36' value={newMember.role} onChange={e=>setNewMember(v=>({...v,role:e.target.value}))}>
                  <option value='member'>成员</option>
                  <option value='tenant'>管理员</option>
                </PSelect>
                <PButton size='sm' onClick={addMember}>添加</PButton>
              </div>
              <div className='text-sm text-gray-500'>当前成员 ({members.length})</div>
              <div className='divide-y border rounded-md'>
                {memberLoading && <div className='p-4 text-sm text-gray-500'>加载中...</div>}
                {!memberLoading && members.map(m=> (
                  <div key={m.user_id} className='p-3 flex items-center justify-between'>
                    <div className='space-y-1'>
                      <div className='font-medium text-sm'>UID {m.user_id} {m.is_owner && <span className='ml-2 text-xs px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-600'>所有者</span>}</div>
                      <div className='text-xs text-gray-500'>加入: {m.joined_at ? new Date(m.joined_at).toLocaleDateString(): '-'}</div>
                    </div>
                    <div className='flex items-center space-x-2'>
                      <PSelect className='w-32 text-sm' value={m.role} onChange={e=>changeRole(m, e.target.value)} disabled={m.is_owner}>
                        <option value='member'>成员</option>
                        <option value='tenant'>管理员</option>
                        <option value='owner' disabled>所有者</option>
                      </PSelect>
                      {!m.is_owner && <PButton size='sm' variant='danger' onClick={()=>removeMember(m)}>移除</PButton>}
                      {!m.is_owner && <PButton size='sm' variant='secondary' disabled={transferring} onClick={()=>transferOwner(m)}>转移所有者</PButton>}
                    </div>
                  </div>
                ))}
                {!memberLoading && members.length===0 && <div className='p-4 text-sm text-gray-500'>暂无成员</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
