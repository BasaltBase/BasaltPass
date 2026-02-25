import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import AdminLayout from '@features/admin/components/AdminLayout'
import { listPermissions, createPermission, updatePermission, deletePermission, type Permission } from '@api/admin/permissions'

export default function PermissionsPage() {
  const [perms, setPerms] = useState<Permission[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [keyword, setKeyword] = useState('')

  // form
  const [code, setCode] = useState('')
  const [desc, setDesc] = useState('')
  const [editing, setEditing] = useState<Permission | null>(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const r = await listPermissions()
      setPerms(r.data)
    } catch (e: any) {
      setError(e.response?.data?.error || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase()
    if (!k) return perms
    return perms.filter(p => p.Code.toLowerCase().includes(k) || (p.Desc || '').toLowerCase().includes(k))
  }, [perms, keyword])

  const resetForm = () => { setCode(''); setDesc(''); setEditing(null) }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) { setError('请输入权限代码'); return }
    try {
      setError('')
      if (editing) {
        await updatePermission(editing.ID, { code, desc })
      } else {
        await createPermission({ code, desc })
      }
      resetForm()
      await load()
    } catch (e: any) {
      setError(e.response?.data?.error || '保存失败')
    }
  }

  const onEdit = (p: Permission) => { setEditing(p); setCode(p.Code); setDesc(p.Desc || '') }

  const onDelete = async (id: number) => {
    if (!await uiConfirm('确定删除该权限吗？')) return
    try {
      await deletePermission(id)
      await load()
    } catch (e: any) {
      uiAlert(e.response?.data?.error || '删除失败')
    }
  }

  return (
    <AdminLayout title="权限管理">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">权限管理</h1>
        </div>

        <div className="bg-white shadow rounded-lg p-4">
          <form onSubmit={onSubmit} className="grid grid-cols-3 gap-4">
            <input value={code} onChange={e=>setCode(e.target.value)} placeholder="权限代码（唯一）" className="border rounded px-3 py-2" />
            <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="描述（可选）" className="border rounded px-3 py-2" />
            <div className="flex items-center gap-2">
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded">{editing ? '更新' : '创建'}</button>
              {editing && <button type="button" className="px-3 py-2 border rounded" onClick={resetForm}>取消编辑</button>}
            </div>
          </form>
          {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="p-4 flex items-center justify-between border-b">
            <input value={keyword} onChange={e=>setKeyword(e.target.value)} placeholder="搜索代码或描述" className="border rounded px-3 py-2 w-80" />
            {loading && <span className="text-sm text-gray-500">加载中...</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">代码</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">描述</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map(p => (
                  <tr key={p.ID}>
                    <td className="px-6 py-4 text-sm">{p.ID}</td>
                    <td className="px-6 py-4 text-sm font-medium">{p.Code}</td>
                    <td className="px-6 py-4 text-sm">{p.Desc}</td>
                    <td className="px-6 py-4 text-sm text-right space-x-2">
                      <button className="px-3 py-1 border rounded" onClick={()=>onEdit(p)}>编辑</button>
                      <button className="px-3 py-1 border rounded text-red-600" onClick={()=>onDelete(p.ID)}>删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
