import { useEffect, useState } from 'react'
import { listLogs } from '../../api/admin'
import { Link } from 'react-router-dom'

interface Log {
  id: number
  user_id: number
  action: string
  ip: string
  data: string
  created_at: string
}

export default function Logs() {
  const [logs, setLogs] = useState<Log[]>([])

  useEffect(() => {
    listLogs().then((r) => setLogs(r.data))
  }, [])

  return (
    <div className="p-8 overflow-x-auto">
      <h2 className="text-2xl mb-4">Audit Logs</h2>
      <Link className="text-blue-600" to="/admin">
        ← Back
      </Link>
      <table className="min-w-full border mt-4">
        <thead>
          <tr>
            <th className="border px-2">ID</th>
            <th className="border px-2">User</th>
            <th className="border px-2">Action</th>
            <th className="border px-2">IP</th>
            <th className="border px-2">Time</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id}>
              <td className="border px-2">{l.id}</td>
              <td className="border px-2">{l.user_id}</td>
              <td className="border px-2">{l.action}</td>
              <td className="border px-2">{l.ip}</td>
              <td className="border px-2">{new Date(l.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
} 