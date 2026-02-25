import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import { useParams, Navigate } from 'react-router-dom'
import AdminLayout from '@features/admin/components/AdminLayout'
import PInput from '@ui/PInput'
import PTextarea from '@ui/PTextarea'
import PButton from '@ui/PButton'
import PSelect from '@ui/PSelect'
import PToggle from '@ui/PToggle'
import PCard from '@ui/PCard'
import client from '@api/client'
import { adminSettingsCategories } from './categories'

interface SettingDTO {
  key: string
  value: any
  category?: string
  description?: string
}

export default function SettingsCategoryPage() {
  const { category } = useParams<{ category: string }>()
  const [settings, setSettings] = useState<SettingDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string|null>(null)

  const categoryInfo = adminSettingsCategories.find(c => c.key === category)
  
  // 如果分类不存在，重定向到第一个分类
  if (!categoryInfo) {
    return <Navigate to={`/admin/settings/${adminSettingsCategories[0].key}`} replace />
  }

  const filtered = settings
    .map(s => ({
      ...s,
      category: s.category && s.category.trim() ? s.category : (s.key?.split?.('.')?.[0] || 'general')
    }))
    .filter(s => s.category === category)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true)
        const res = await client.get('/api/v1/admin/settings')
        const data = res?.data
        const listRaw = Array.isArray(data) ? data : (Array.isArray((data as any)?.data) ? (data as any).data : [])
        const list = listRaw.map((s: any) => ({
          ...s,
          category: s?.category && String(s.category).trim() ? s.category : (s?.key?.split?.('.')?.[0] || 'general')
        }))
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
      await client.put('/api/v1/admin/settings/bulk', Array.isArray(settings) ? settings : [])
      uiAlert('已保存设置')
    } catch (e: any) {
      uiAlert(e?.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const renderField = (s: SettingDTO) => {
    const value = s.value
    const onChange = (v: any) => updateLocal(s.key, v)

    switch (s.key) {
      case 'logging.level':
        return (
          <PSelect value={String(value || 'info')} onChange={e => onChange((e.target as HTMLSelectElement).value)}>
            <option value="debug">debug</option>
            <option value="info">info</option>
            <option value="warn">warn</option>
            <option value="error">error</option>
          </PSelect>
        )
      case 'logging.format':
        return (
          <PSelect value={String(value || 'text')} onChange={e => onChange((e.target as HTMLSelectElement).value)}>
            <option value="text">text</option>
            <option value="json">json</option>
          </PSelect>
        )
      case 'general.theme':
        return (
          <PSelect value={String(value || 'light')} onChange={e => onChange((e.target as HTMLSelectElement).value)}>
            <option value="light">浅色</option>
            <option value="dark">深色</option>
            <option value="system">跟随系统</option>
          </PSelect>
        )
      case 'general.timezone': {
        const timezones = ['Asia/Shanghai','UTC','Asia/Tokyo','Europe/Berlin','America/New_York']
        return (
          <PSelect value={String(value || 'Asia/Shanghai')} onChange={e => onChange((e.target as HTMLSelectElement).value)}>
            {timezones.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </PSelect>
        )
      }
      case 'general.locale': {
        const locales = [
          { value: 'zh-CN', label: '简体中文 (zh-CN)' },
          { value: 'en-US', label: 'English (en-US)' },
          { value: 'ja-JP', label: '日本語 (ja-JP)' },
        ]
        return (
          <PSelect value={String(value || 'zh-CN')} onChange={e => onChange((e.target as HTMLSelectElement).value)}>
            {locales.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </PSelect>
        )
      }
      case 'uploads.max_size_mb':
      case 'session.max_age_seconds':
      case 'auth.password_policy.min_length':
      case 'smtp.port':
      case 'jwt.exp_minutes':
      case 'jwt.refresh_exp_minutes':
      case 'logging.retention_days':
      case 'audit.retention_days':
      case 'pagination.default_page_size':
      case 'pagination.max_page_size':
      case 'security.rate_limit.requests_per_minute':
      case 'security.account_lockout.max_attempts':
      case 'security.account_lockout.window_minutes':
      case 'webhooks.timeout_seconds':
      case 'webhooks.max_retries':
      case 'cors.max_age_seconds':
        return (
          <PInput type="number" value={Number(value) || 0} onChange={e => onChange(Number((e.target as HTMLInputElement).value))} />
        )
      case 'session.same_site':
        return (
          <PSelect value={String(value || 'Lax')} onChange={e => onChange((e.target as HTMLSelectElement).value)}>
            <option value="Lax">Lax</option>
            <option value="Strict">Strict</option>
            <option value="None">None</option>
          </PSelect>
        )
      case 'uploads.storage':
        return (
          <PSelect value={String(value || 'local')} onChange={e => onChange((e.target as HTMLSelectElement).value)}>
            <option value="local">本地 (local)</option>
            <option value="s3">Amazon S3</option>
            <option value="azure">Azure Blob</option>
            <option value="gcs">Google Cloud Storage</option>
          </PSelect>
        )
      case 'jwt.algorithm':
        return (
          <PSelect value={String(value || 'HS256')} onChange={e => onChange((e.target as HTMLSelectElement).value)}>
            <option value="HS256">HS256</option>
            <option value="RS256">RS256</option>
            <option value="ES256">ES256</option>
          </PSelect>
        )
      case 'analytics.provider':
        return (
          <PSelect value={String(value || 'none')} onChange={e => onChange((e.target as HTMLSelectElement).value)}>
            <option value="none">不启用</option>
            <option value="umami">Umami</option>
            <option value="ga4">Google Analytics 4</option>
            <option value="plausible">Plausible</option>
          </PSelect>
        )
      case 'captcha.provider':
        return (
          <PSelect value={String(value || 'none')} onChange={e => onChange((e.target as HTMLSelectElement).value)}>
            <option value="none">不启用</option>
            <option value="recaptcha">reCAPTCHA</option>
            <option value="hcaptcha">hCaptcha</option>
          </PSelect>
        )
      default:
        break
    }

    if (typeof value === 'boolean') {
      return (
        <PToggle checked={!!value} onChange={e => onChange((e.target as HTMLInputElement).checked)} label={value ? '已启用' : '未启用'} />
      )
    }

    if (typeof value === 'number') {
      return (
        <PInput type="number" value={value} onChange={e => onChange(Number(e.target.value))} />
      )
    }

    if (Array.isArray(value)) {
      return (
        <PTextarea value={value.join('\n')} onChange={e => onChange((e.target as HTMLTextAreaElement).value.split('\n').map(v => v.trim()).filter(Boolean))} rows={4} />
      )
    }

    if (typeof value === 'object' && value !== null) {
      return (
        <PTextarea value={JSON.stringify(value, null, 2)} onChange={e => {
          try { onChange(JSON.parse((e.target as HTMLTextAreaElement).value)) } catch { /* ignore */ }
        }} className="font-mono text-xs" rows={6} />
      )
    }

    if (typeof value === 'string') {
      const lowerKey = s.key.toLowerCase()
      const isSecret = /password|secret|api_key|access_key|token/.test(lowerKey)
      return (
        <PInput
          type={isSecret ? 'password' : 'text'}
          value={value ?? ''}
          onChange={e => onChange((e.target as HTMLInputElement).value)}
        />
      )
    }

    return <PInput type="text" value={String(value ?? '')} onChange={e => onChange((e.target as HTMLInputElement).value)} />
  }

  return (
    <AdminLayout title={`${categoryInfo.name} 设置`}>
      <PCard variant="bordered">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{categoryInfo.name}</h2>
            <p className="text-sm text-gray-500">配置 {categoryInfo.name} 相关参数</p>
          </div>
          <PButton onClick={save} loading={saving}>
            保存
          </PButton>
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
              <div key={s.key} className="border-b pb-4 last:border-b-0">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {s.description || s.key}
                </label>
                <div className="text-xs text-gray-500 mb-1 font-mono">{s.key}</div>
                {renderField(s)}
              </div>
            ))}
          </div>
        )}
      </PCard>
    </AdminLayout>
  )
}
