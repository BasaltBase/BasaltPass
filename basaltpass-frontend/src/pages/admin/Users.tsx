import { useEffect, useState } from 'react'
import { listUsers, banUser } from '../../api/admin'

interface User {
  id: number
  email: string
  phone: string
  nickname: string
  banned: boolean
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([])

  const load = () => {
    listUsers().then((r) => setUsers(r.data))
  }
  useEffect(load, [])

  const toggleBan = async (u: User) => {
    await banUser(u.id, !u.banned)
    load()
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl mb-4">Users</h2>
      <table className="min-w-full border">
        <thead>
          <tr>
            <th className="border px-2">ID</th>
            <th className="border px-2">Email</th>
            <th className="border px-2">Phone</th>
            <th className="border px-2">Nickname</th>
            <th className="border px-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td className="border px-2">{u.id}</td>
              <td className="border px-2">{u.email}</td>
              <td className="border px-2">{u.phone}</td>
              <td className="border px-2">{u.nickname}</td>
              <td className="border px-2">
                <button
                  className={`px-2 ${u.banned ? 'bg-green-600' : 'bg-red-600'} text-white`}
                  onClick={() => toggleBan(u)}
                >
                  {u.banned ? 'Unban' : 'Ban'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
} 