import { useEffect, useState } from 'react'
import client from '@api/client'
import { PlusIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { listPermissions, getRolePermissions, setRolePermissions, type Permission } from '@api/admin/permissions'
import { Link } from 'react-router-dom'
import AdminLayout from '@components/AdminLayout'
import { PCheckbox, PButton, PInput } from '../../../components'

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
      setError('请输入角色名称')
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
      setError(e.response?.data?.error || '创建角色失败')
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
      alert(e.response?.data?.error || '保存失败')
    } finally {
      setSavingPerms(false)
    }
  }

  return (
    <AdminLayout title="角色管理">
      <div className="space-y-6">
        {/* 面包屑导航 */}
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-4">
            <li>
              <Link to="/dashboard" className="text-gray-400 hover:text-gray-500">
                仪表板
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <ChevronRightIcon className="flex-shrink-0 h-5 w-5 text-gray-400" />
                <span className="ml-4 text-sm font-medium text-gray-500">角色管理</span>
              </div>
            </li>
          </ol>
        </nav>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">角色管理</h1>
            <p className="mt-1 text-sm text-gray-500">
              管理系统角色和权限
            </p>
          </div>
          <PButton
            onClick={() => setShowCreateModal(true)}
            variant="primary"
            leftIcon={<PlusIcon className="h-4 w-4" />}
          >
            添加角色
          </PButton>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">角色列表</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">描述</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {roles.map((r) => (
                  <tr key={r.ID} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.ID}</td>
          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{r.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <PButton variant="secondary" size="sm" onClick={() => openAssign(r)}>分配权限</PButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 创建角色模态框 */}
        {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-10">
          <div className="w-3/4 max-w-4xl p-6 border shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">创建新角色</h2>
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
              {/* 第一行：角色名称和角色描述 */}
              <div className="grid grid-cols-2 gap-6">
                <PInput
                  type="text"
                  label={<>角色名称 <span className="text-red-500">*</span></>}
                  placeholder="输入角色名称"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <PInput
                  type="text"
                  label="角色描述"
                  placeholder="输入角色描述"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
              </div>

              {/* 错误信息显示 */}
              {error && (
                <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              {/* 按钮区域 */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <PButton
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  取消
                </PButton>
                <PButton
                  type="submit"
                  variant="primary"
                  disabled={creating}
                  loading={creating}
                >
                  创建角色
                </PButton>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* 权限分配模态框 */}
      {assigningRole && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-10">
          <div className="w-3/4 max-w-4xl p-6 border shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">为角色分配权限 - {assigningRole.name}</h2>
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
              <PButton variant="secondary" onClick={() => setAssigningRole(null)}>取消</PButton>
              <PButton variant="primary" disabled={savingPerms} loading={savingPerms} onClick={saveAssign}>保存</PButton>
            </div>
          </div>
        </div>
      )}
    </div>
    </AdminLayout>
  )
} 