import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import client from '@api/client'
import { PlusIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { listPermissions, getRolePermissions, setRolePermissions, type Permission } from '@api/admin/permissions'
import { Link } from 'react-router-dom'
import AdminLayout from '@features/admin/components/AdminLayout'
import { PCheckbox, PButton, PInput, PAlert } from '@ui'
import PTable, { PTableColumn } from '@ui/PTable'
import { ROUTES } from '@constants'
import { useI18n } from '@shared/i18n'

interface RawRole {
  ID: number
  Name?: string
  Description?: string
  name?: string
  description?: string
  code?: string
  tenant_id?: number
  is_system?: boolean
}

interface Role {
  ID: number
  name: string
  description: string
}

export default function Roles() {
  const { t } = useI18n()
  const [roles, setRoles] = useState<Role[]>([])
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [assigningRole, setAssigningRole] = useState<Role | null>(null)
  const [allPerms, setAllPerms] = useState<Permission[]>([])
  const [checked, setChecked] = useState<Record<number, boolean>>({})
  const [savingPerms, setSavingPerms] = useState(false)

  const load = () => {
    client.get<RawRole[]>('/api/v1/admin/roles').then((r) => {
      const normalized: Role[] = (r.data || []).map((item) => ({
        ID: item.ID,
        name: item.name ?? item.Name ?? '',
        description: item.description ?? item.Description ?? '',
      }))
      setRoles(normalized)
    })
  }

  useEffect(load, [])
  useEffect(() => {
    listPermissions().then(r => setAllPerms(r.data)).catch(()=>{})
  }, [])

  const createRole = async () => {
    if (!name.trim()) {
      setError(t('adminRoles.errors.roleNameRequired'))
      return
    }

    try {
      setCreating(true)
      setError('')
      await client.post('/api/v1/admin/roles', { name, description: desc })
      setName('')
      setDesc('')
      setShowCreateModal(false)
      load()
    } catch (e: any) {
      setError(e.response?.data?.error || t('adminRoles.errors.createRoleFailed'))
    } finally {
      setCreating(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createRole()
  }

  const openAssign = async (role: Role) => {
    setAssigningRole(role)
    try {
      const r = await getRolePermissions(role.ID)
      const preset: Record<number, boolean> = {}
      r.data.forEach(p => { preset[p.ID] = true })
      setChecked(preset)
    } catch {}
  }

  const togglePerm = (pid: number) => setChecked(prev => ({ ...prev, [pid]: !prev[pid] }))

  const saveAssign = async () => {
    if (!assigningRole) return
    setSavingPerms(true)
    try {
      const ids = Object.keys(checked).filter(k => checked[Number(k)]).map(Number)
      await setRolePermissions(assigningRole.ID, ids)
      setAssigningRole(null)
    } catch (e:any) {
      uiAlert(e.response?.data?.error || t('adminRoles.errors.saveFailed'))
    } finally {
      setSavingPerms(false)
    }
  }

  return (
    <AdminLayout title={t('adminRoles.layoutTitle')}>
      <div className="space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('adminRoles.header.title')}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {t('adminRoles.header.description')}
            </p>
          </div>
          <PButton
            onClick={() => setShowCreateModal(true)}
            variant="primary"
            leftIcon={<PlusIcon className="h-4 w-4" />}
          >
            {t('adminRoles.actions.addRole')}
          </PButton>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">{t('adminRoles.list.title')}</h3>
          </div>
          <div className="overflow-x-auto">
            {(() => {
              const columns: PTableColumn<Role>[] = [
                { key: 'id', title: 'ID', dataIndex: 'ID', sortable: true },
                { key: 'name', title: t('adminRoles.table.name'), dataIndex: 'name', sortable: true },
                { key: 'description', title: t('adminRoles.table.description'), dataIndex: 'description' },
                {
                  key: 'actions',
                  title: t('adminRoles.table.actions'),
                  align: 'right',
                  render: (r) => (
                    <PButton variant="secondary" size="sm" onClick={() => openAssign(r)}>{t('adminRoles.actions.assignPermissions')}</PButton>
                  )
                }
              ]

              return (
                <PTable
                  columns={columns}
                  data={roles}
                  rowKey={(row) => row.ID}
                  emptyText={t('adminRoles.list.empty')}
                  defaultSort={{ key: 'id', order: 'asc' }}
                />
              )
            })()}
          </div>
        </div>

        {showCreateModal && (
        <div className="fixed inset-0 !m-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-10">
          <div className="w-3/4 max-w-4xl p-6 border shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">{t('adminRoles.createModal.title')}</h2>
              <PButton 
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ✕
              </PButton>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <PInput
                  type="text"
                  label={<>{t('adminRoles.createModal.roleNameLabel')} <span className="text-red-500">*</span></>}
                  placeholder={t('adminRoles.createModal.roleNamePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <PInput
                  type="text"
                  label={t('adminRoles.createModal.roleDescLabel')}
                  placeholder={t('adminRoles.createModal.roleDescPlaceholder')}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
              </div>

              {error && <PAlert variant="error" message={error} />}

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <PButton
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  {t('adminRoles.actions.cancel')}
                </PButton>
                <PButton
                  type="submit"
                  variant="primary"
                  disabled={creating}
                  loading={creating}
                >
                  {t('adminRoles.actions.createRole')}
                </PButton>
              </div>
            </form>
          </div>
        </div>
      )}
      {assigningRole && (
        <div className="fixed inset-0 !m-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-10">
          <div className="w-3/4 max-w-4xl p-6 border shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">{t('adminRoles.assignModal.title', { role: assigningRole.name })}</h2>
              <PButton 
                variant="ghost"
                size="sm"
                onClick={() => setAssigningRole(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >✕</PButton>
            </div>
            <div className="h-[480px] overflow-auto border rounded p-4 grid grid-cols-2 gap-3">
              {allPerms.map(p => (
                <div key={p.ID} className="flex items-center gap-3 text-sm">
                  <PCheckbox 
                    checked={!!checked[p.ID]} 
                    onChange={() => togglePerm(p.ID)}
                    label={
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-gray-800">{p.Code}</span>
                        <span className="text-gray-500">{p.Desc}</span>
                      </div>
                    }
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <PButton variant="secondary" onClick={() => setAssigningRole(null)}>{t('adminRoles.actions.cancel')}</PButton>
              <PButton variant="primary" disabled={savingPerms} loading={savingPerms} onClick={saveAssign}>{t('adminRoles.actions.save')}</PButton>
            </div>
          </div>
        </div>
      )}
    </div>
    </AdminLayout>
  )
} 
