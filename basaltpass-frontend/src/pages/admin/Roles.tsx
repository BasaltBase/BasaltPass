import { useEffect, useState } from 'react'
import client from '../../api/client'

interface Role {
  id: number
  name: string
  description: string
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
    <div className="p-8">
      <h2 className="text-2xl mb-4">Roles</h2>
      <div className="mb-4 flex gap-2">
        <input className="border p-2" placeholder="name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="border p-2" placeholder="description" value={desc} onChange={(e) => setDesc(e.target.value)} />
        <button className="bg-blue-600 text-white px-4" onClick={createRole}>
          Add
        </button>
      </div>
      {error && <p className="text-red-600 mb-2">{error}</p>}
      <table className="min-w-full border">
        <thead>
          <tr>
            <th className="border px-2">ID</th>
            <th className="border px-2">Name</th>
            <th className="border px-2">Description</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((r) => (
            <tr key={r.id}>
              <td className="border px-2">{r.id}</td>
              <td className="border px-2">{r.name}</td>
              <td className="border px-2">{r.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
} 