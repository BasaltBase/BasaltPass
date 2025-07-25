import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { listUsers, banUser } from '../../api/admin'

interface User {
  ID: number
  Email: string
  Phone: string
  Nickname: string
  Banned: boolean
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([])

  const load = () => {
    listUsers().then((r) => setUsers(r.data))
  }
  useEffect(load, [])

  const toggleBan = async (u: User) => {
    await banUser(u.ID, !u.Banned)
    load()
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            管理系统用户和账户状态
          </p>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">用户列表</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">邮箱</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">手机</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">昵称</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((u) => (
                  <tr key={u.ID} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.ID}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.Email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.Phone}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.Nickname}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        u.Banned 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {u.Banned ? '已禁用' : '正常'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        className={`px-3 py-1 text-sm font-medium rounded-md ${
                          u.Banned 
                            ? 'bg-green-600 hover:bg-green-700 text-white' 
                            : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                        onClick={() => toggleBan(u)}
                      >
                        {u.Banned ? '启用' : '禁用'}
                      </button>
                    </td>
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