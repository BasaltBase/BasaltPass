import { useEffect, useMemo, useState } from 'react'
import AdminLayout from '@components/AdminLayout'
import axios from 'axios'

interface SettingDTO {
  key: string
  value: any
  category?: string
  description?: string
}

const categories = [
  { key: 'general', name: '通用' },
  { key: 'auth', name: '认证' },
  { key: 'security', name: '安全' },
  { key: 'cors', name: 'CORS' },
  { key: 'billing', name: '计费/订阅' },
  { key: 'oauth', name: 'OAuth' },
]

export default function AdminSettingsPage() {
  const [activeCategory, setActiveCategory] = useState('general')
  const [settings, setSettings] = useState<SettingDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string|null>(null)

  const filtered = useMemo(() => Array.isArray(settings) ? settings.filter(s => (s.category || 'general') === activeCategory) : [], [settings, activeCategory])

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true)
  const res = await axios.get('/api/v1/admin/settings')
  const data = res?.data
  const list = Array.isArray(data) ? data : (Array.isArray((data as any)?.data) ? (data as any).data : [])
  setSettings(list)
        setError(null)
      } catch (e: any) {
        setError(e?.message || '加载失败')
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const updateLocal = (key: string, value: any) => {
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s))
  }

  const save = async () => {
    try {
      setSaving(true)
  await axios.put('/api/v1/admin/settings/bulk', Array.isArray(settings) ? settings : [])
      alert('已保存设置')
    } catch (e: any) {
      alert(e?.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const renderField = (s: SettingDTO) => {
    const value = s.value
    const onChange = (v: any) => updateLocal(s.key, v)

    // 简单根据 key 提供不同控件（可继续丰富）
    if (s.key === 'auth.enable_register' || s.key === 'security.enforce_2fa') {
      return (
        <label className="inline-flex items-center">
          <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} className="form-checkbox h-4 w-4 text-indigo-600" />
          <span className="ml-2 text-sm text-gray-700">启用</span>
        </label>
      )
    }

    if (typeof value === 'number') {
      return (
        <input type="number" value={value} onChange={e => onChange(Number(e.target.value))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
      )
    }

    if (Array.isArray(value)) {
      return (
        <textarea value={value.join('\n')} onChange={e => onChange(e.target.value.split('\n').filter(Boolean))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" rows={4} />
      )
    }

    if (typeof value === 'object' && value !== null) {
      return (
        <textarea value={JSON.stringify(value, null, 2)} onChange={e => {
          try { onChange(JSON.parse(e.target.value)) } catch { /* ignore */ }
        }} className="mt-1 block w-full font-mono text-xs rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" rows={6} />
      )
    }

    return (
      <input type="text" value={value ?? ''} onChange={e => onChange(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
    )
  }

  return (
    <AdminLayout title="系统设置">
      <div className="flex gap-6">
        <aside className="w-64 bg-white border rounded-lg p-4 h-fit">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">设置分类</h3>
          <ul className="space-y-1">
            {categories.map(cat => (
              <li key={cat.key}>
                <button onClick={() => setActiveCategory(cat.key)} className={`w-full text-left px-3 py-2 rounded-md text-sm ${activeCategory === cat.key ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100 text-gray-700'}`}>
                  {cat.name}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="flex-1">
          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{categories.find(c => c.key === activeCategory)?.name}</h2>
                <p className="text-sm text-gray-500">编辑系统运行时参数与默认行为</p>
              </div>
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-60">
                {saving ? '保存中...' : '保存'}
              </button>
            </div>

            {loading ? (
              <div className="py-10 text-center text-gray-500">加载中...</div>
            ) : error ? (
              <div className="py-10 text-center text-red-600">{error}</div>
            ) : (
              <div className="mt-6 space-y-6">
                {filtered.length === 0 ? (
                  <div className="text-gray-500">暂无该分类的设置项</div>
                ) : filtered.map(s => (
                  <div key={s.key} className="border-b pb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      {s.description || s.key}
                    </label>
                    {renderField(s)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </AdminLayout>
  )
}
