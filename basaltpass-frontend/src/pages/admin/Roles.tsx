import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import client from '../../api/client'

interface Role {
  ID: number
  Name: string
  Description: string
}

export default function Roles() {
  const [roles, setRoles] = useState<Role[]>([])
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [error, setError] = useState('')

  const load = () => {
    client.get<Role[]>('/api/v1/admin/roles').then((r) => setRoles(r.data))
  }

  useEffect(load, [])

  const createRole = async () => {
    try {
      await client.post('/api/v1/admin/roles', { name, description: desc })
      setName('')
      setDesc('')
      load()
    } catch (e: any) {
      setError(e.response?.data?.error || 'error')
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">角色管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            管理系统角色和权限
          </p>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">创建新角色</h3>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">角色名称</label>
                <input 
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
                  placeholder="输入角色名称" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">角色描述</label>
                <input 
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
                  placeholder="输入角色描述" 
                  value={desc} 
                  onChange={(e) => setDesc(e.target.value)} 
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button 
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" 
                onClick={createRole}
              >
                添加角色
              </button>
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
          </div>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{r.Name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.Description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
} 