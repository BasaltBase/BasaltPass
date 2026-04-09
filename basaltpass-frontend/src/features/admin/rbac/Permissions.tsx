import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import AdminLayout from '@features/admin/components/AdminLayout'
import { listPermissions, createPermission, updatePermission, deletePermission, type Permission } from '@api/admin/permissions'
import { PButton, PInput, PAlert } from '@ui'
import { useI18n } from '@shared/i18n'

export default function PermissionsPage() {
  const { t } = useI18n()
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
      setError(e.response?.data?.error || t('adminPermissions.errors.loadFailed'))
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
    if (!code.trim()) { setError(t('adminPermissions.errors.codeRequired')); return }
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
      setError(e.response?.data?.error || t('adminPermissions.errors.saveFailed'))
    }
  }

  const onEdit = (p: Permission) => { setEditing(p); setCode(p.Code); setDesc(p.Desc || '') }

  const onDelete = async (id: number) => {
    if (!await uiConfirm(t('adminPermissions.confirmDelete'))) return
    try {
      await deletePermission(id)
      await load()
    } catch (e: any) {
      uiAlert(e.response?.data?.error || t('adminPermissions.errors.deleteFailed'))
    }
  }

  return (
    <AdminLayout title={t('adminPermissions.layoutTitle')}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{t('adminPermissions.title')}</h1>
        </div>

        <div className="bg-white shadow rounded-lg p-4">
          <form onSubmit={onSubmit} className="grid grid-cols-3 gap-4">
            <PInput value={code} onChange={e=>setCode(e.target.value)} placeholder={t('adminPermissions.placeholders.code')} />
            <PInput value={desc} onChange={e=>setDesc(e.target.value)} placeholder={t('adminPermissions.placeholders.description')} />
            <div className="flex items-center gap-2">
              <PButton type="submit">{editing ? t('adminPermissions.actions.update') : t('adminPermissions.actions.create')}</PButton>
              {editing && <PButton type="button" variant="secondary" onClick={resetForm}>{t('adminPermissions.actions.cancelEdit')}</PButton>}
            </div>
          </form>
          {error && <PAlert variant="error" message={error} className="mt-2" />}
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="p-4 flex items-center justify-between border-b">
            <PInput value={keyword} onChange={e=>setKeyword(e.target.value)} placeholder={t('adminPermissions.searchPlaceholder')} className="w-80" />
            {loading && <span className="text-sm text-gray-500">{t('adminPermissions.loading')}</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
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
                      <PButton size="sm" variant="secondary" onClick={()=>onEdit(p)}>{t('adminPermissions.actions.edit')}</PButton>
                      <PButton size="sm" variant="danger" onClick={()=>onDelete(p.ID)}>{t('adminPermissions.actions.delete')}</PButton>
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
