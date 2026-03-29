import React, { useEffect, useMemo, useState } from 'react'
import { uiAlert } from '@contexts/DialogContext'
import Layout from '@features/user/components/Layout'
import { PCard, PButton, PInput, PSelect, PSkeleton, PTextarea, PPageHeader } from '@ui'
import { UserIcon, BellIcon, GlobeAltIcon } from '@heroicons/react/24/outline'
import {
  getUserProfile,
  updateUserProfile,
  getGenders,
  getLanguages,
  getCurrencies,
  getTimezones,
  type Gender,
  type Language,
  type Currency,
  type Timezone,
  type UpdateProfileData,
} from '@api/user/profile'
import { userNotificationApi, type UserNotificationSettings } from '@api/user/notification'

type SettingsProfileState = {
  gender_id: number | undefined
  language_id: number | undefined
  currency_id: number | undefined
  timezone: string
  birth_date: string
  bio: string
  location: string
  website: string
  company: string
  job_title: string
}

const normalizeDateInput = (value?: string | null) => {
  if (!value) return ''
  return value.slice(0, 10)
}

const toSettingsProfile = (profile?: {
  gender_id?: number
  language_id?: number
  currency_id?: number
  timezone?: string
  birth_date?: string | null
  bio?: string
  location?: string
  website?: string
  company?: string
  job_title?: string
} | null): SettingsProfileState => ({
  gender_id: profile?.gender_id,
  language_id: profile?.language_id,
  currency_id: profile?.currency_id,
  timezone: profile?.timezone || 'UTC',
  birth_date: normalizeDateInput(profile?.birth_date),
  bio: profile?.bio || '',
  location: profile?.location || '',
  website: profile?.website || '',
  company: profile?.company || '',
  job_title: profile?.job_title || '',
})

const pickNumber = (value: unknown) => {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? undefined : parsed
  }
  return undefined
}

const pickString = (value: unknown) => (typeof value === 'string' ? value : '')

const normalizeGender = (item: any): Gender => ({
  id: pickNumber(item?.id ?? item?.ID) ?? 0,
  code: pickString(item?.code ?? item?.Code),
  name: pickString(item?.name ?? item?.Name),
  name_cn: pickString(item?.name_cn ?? item?.NameCN),
  sort_order: pickNumber(item?.sort_order ?? item?.SortOrder) ?? 0,
  is_active: Boolean(item?.is_active ?? item?.IsActive),
})

const normalizeLanguage = (item: any): Language => ({
  id: pickNumber(item?.id ?? item?.ID) ?? 0,
  code: pickString(item?.code ?? item?.Code),
  name: pickString(item?.name ?? item?.Name),
  name_local: pickString(item?.name_local ?? item?.NameLocal),
  is_active: Boolean(item?.is_active ?? item?.IsActive),
  sort_order: pickNumber(item?.sort_order ?? item?.SortOrder) ?? 0,
})

const normalizeCurrency = (item: any): Currency => ({
  id: pickNumber(item?.id ?? item?.ID) ?? 0,
  code: pickString(item?.code ?? item?.Code),
  name: pickString(item?.name ?? item?.Name),
  name_cn: pickString(item?.name_cn ?? item?.NameCN),
  symbol: pickString(item?.symbol ?? item?.Symbol),
  decimal_places: pickNumber(item?.decimal_places ?? item?.DecimalPlaces) ?? 2,
  type: pickString(item?.type ?? item?.Type),
  is_active: Boolean(item?.is_active ?? item?.IsActive),
  sort_order: pickNumber(item?.sort_order ?? item?.SortOrder) ?? 0,
})

function SectionLabel({ title, value }: { title: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="text-sm font-medium text-gray-700">{title}</div>
      <div className="text-xs text-gray-500">当前：{value || '未选择'}</div>
    </div>
  )
}

function ToggleCheckbox({
  checked,
  title,
  description,
  onChange,
}: {
  checked: boolean
  title: string
  description: string
  onChange: () => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-4 py-4">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        <div className="mt-1 text-sm text-gray-500">{description}</div>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-5 w-5 flex-shrink-0 accent-indigo-600"
      />
    </label>
  )
}

export default function Settings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [genders, setGenders] = useState<Gender[]>([])
  const [languages, setLanguages] = useState<Language[]>([])
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [timezones, setTimezones] = useState<Timezone[]>([])

  const [profile, setProfile] = useState<SettingsProfileState>({
    gender_id: undefined,
    language_id: undefined,
    currency_id: undefined,
    timezone: 'UTC',
    birth_date: '',
    bio: '',
    location: '',
    website: '',
    company: '',
    job_title: '',
  })

  const [notifications, setNotifications] = useState<UserNotificationSettings>({
    email_enabled: true,
    sms_enabled: false,
    push_enabled: true,
    security_enabled: true,
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [profileRes, gendersRes, languagesRes, currenciesRes, timezonesRes, notificationSettingsRes] = await Promise.all([
          getUserProfile(),
          getGenders(),
          getLanguages(),
          getCurrencies(true),
          getTimezones(),
          userNotificationApi.getNotificationSettings(),
        ])

        if (profileRes.data.profile) {
          setProfile(toSettingsProfile(profileRes.data.profile))
        }

        setGenders((gendersRes.data.genders || []).map(normalizeGender).filter((item) => item.id > 0))
        setLanguages((languagesRes.data.languages || []).map(normalizeLanguage).filter((item) => item.id > 0))
        setCurrencies((currenciesRes.data.currencies || []).map(normalizeCurrency).filter((item) => item.id > 0))
        setTimezones(timezonesRes.data.timezones)
        setNotifications(notificationSettingsRes.data.data)
      } catch (err) {
        console.error('Failed to load settings:', err)
        uiAlert('设置加载失败，请刷新重试')
      } finally {
        setLoading(false)
      }
    }

    void fetchData()
  }, [])

  const persistProfileChanges = async (changes: UpdateProfileData, silent = false) => {
    try {
      setSaving(true)
      const response = await updateUserProfile(changes)
      setProfile(toSettingsProfile(response.data.profile))
      if (!silent) uiAlert('设置已保存')
    } catch (err) {
      console.error('Failed to save settings:', err)
      uiAlert('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const updateProfileField = (changes: Partial<SettingsProfileState>) => {
    setProfile((prev) => ({ ...prev, ...changes }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const [profileResponse, notificationResponse] = await Promise.all([
        updateUserProfile({
          gender_id: profile.gender_id || null,
          language_id: profile.language_id || null,
          currency_id: profile.currency_id || null,
          timezone: profile.timezone,
          birth_date: profile.birth_date || null,
          bio: profile.bio,
          location: profile.location,
          website: profile.website,
          company: profile.company,
          job_title: profile.job_title,
        }),
        userNotificationApi.updateNotificationSettings({
          email_enabled: notifications.email_enabled,
          sms_enabled: notifications.sms_enabled,
          push_enabled: notifications.push_enabled,
          security_enabled: notifications.security_enabled,
        }),
      ])

      setProfile(toSettingsProfile(profileResponse.data.profile))
      setNotifications(notificationResponse.data.data)
      uiAlert('设置已保存')
    } catch (err) {
      console.error('Failed to save settings:', err)
      uiAlert('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const handleNotificationChange = (key: keyof UserNotificationSettings) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const genderLabel = useMemo(() => {
    const item = genders.find((entry) => Number(entry.id) === Number(profile.gender_id))
    return item ? item.name_cn || item.name : ''
  }, [genders, profile.gender_id])

  const languageLabel = useMemo(() => {
    const item = languages.find((entry) => Number(entry.id) === Number(profile.language_id))
    return item ? item.name_local || item.name : ''
  }, [languages, profile.language_id])

  const currencyLabel = useMemo(() => {
    const item = currencies.find((entry) => Number(entry.id) === Number(profile.currency_id))
    return item ? `${item.name_cn || item.name} (${item.code})` : ''
  }, [currencies, profile.currency_id])

  const timezoneLabel = useMemo(() => {
    const item = timezones.find((entry) => entry.value === profile.timezone)
    return item ? `${item.label} (${item.offset})` : profile.timezone
  }, [profile.timezone, timezones])

  const currentSelectionSummary = [
    genderLabel ? `性别: ${genderLabel}` : '性别: 未选择',
    languageLabel ? `语言: ${languageLabel}` : '语言: 未选择',
    currencyLabel ? `货币: ${currencyLabel}` : '货币: 未选择',
    timezoneLabel ? `时区: ${timezoneLabel}` : '时区: 未选择',
  ].join(' | ')

  if (loading) {
    return (
      <Layout>
        <div className="py-6">
          <PSkeleton.Content cards={3} />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <PPageHeader title="系统设置" description="管理您的账户设置和偏好" />
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          当前选择：{currentSelectionSummary}
        </div>

        <div className="grid grid-cols-1 gap-6">
          <PCard className="rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="mb-5 flex items-center">
              <UserIcon className="mr-2 h-5 w-5 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900">个人信息</h3>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <SectionLabel title="性别" value={genderLabel} />
                <PSelect
                  value={profile.gender_id !== undefined ? String(profile.gender_id) : ''}
                  onChange={(event) =>
                    updateProfileField({
                      gender_id: event.target.value ? Number(event.target.value) : undefined,
                    })
                  }
                  variant="rounded"
                >
                  <option value="">请选择</option>
                  {genders.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name_cn || item.name}
                    </option>
                  ))}
                </PSelect>
              </div>

              <PInput
                type="date"
                value={profile.birth_date}
                onChange={(event) => setProfile((prev) => ({ ...prev, birth_date: event.target.value }))}
                label="出生日期"
              />

              <PInput
                value={profile.location}
                onChange={(event) => setProfile((prev) => ({ ...prev, location: event.target.value }))}
                label="所在地"
                placeholder="例如：北京，中国"
              />

              <PInput
                value={profile.company}
                onChange={(event) => setProfile((prev) => ({ ...prev, company: event.target.value }))}
                label="公司"
                placeholder="您的公司名称"
              />

              <PInput
                value={profile.job_title}
                onChange={(event) => setProfile((prev) => ({ ...prev, job_title: event.target.value }))}
                label="职位"
                placeholder="您的职位"
              />

              <PInput
                value={profile.website}
                onChange={(event) => setProfile((prev) => ({ ...prev, website: event.target.value }))}
                label="个人网站"
                placeholder="https://example.com"
              />

              <div className="md:col-span-2">
                <PTextarea
                  label="个人简介"
                  value={profile.bio}
                  onChange={(event) => setProfile((prev) => ({ ...prev, bio: event.target.value }))}
                  rows={4}
                  placeholder="介绍一下自己..."
                />
              </div>
            </div>
          </PCard>

          <PCard className="rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="mb-5 flex items-center">
              <GlobeAltIcon className="mr-2 h-5 w-5 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900">区域设置</h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <SectionLabel title="语言" value={languageLabel} />
                <PSelect
                  value={profile.language_id !== undefined ? String(profile.language_id) : ''}
                  onChange={(event) =>
                    updateProfileField({
                      language_id: event.target.value ? Number(event.target.value) : undefined,
                    })
                  }
                  variant="rounded"
                >
                  <option value="">请选择</option>
                  {languages.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name_local || item.name}
                    </option>
                  ))}
                </PSelect>
              </div>

              <div className="space-y-3">
                <SectionLabel title="主要货币" value={currencyLabel} />
                <PSelect
                  value={profile.currency_id !== undefined ? String(profile.currency_id) : ''}
                  onChange={(event) =>
                    updateProfileField({
                      currency_id: event.target.value ? Number(event.target.value) : undefined,
                    })
                  }
                  variant="rounded"
                >
                  <option value="">请选择</option>
                  {currencies.map((item) => (
                    <option key={item.id} value={item.id}>
                      {`${item.name_cn || item.name} (${item.code})`}
                    </option>
                  ))}
                </PSelect>
              </div>

              <div className="space-y-3">
                <SectionLabel title="时区" value={timezoneLabel} />
                <PSelect
                  value={profile.timezone}
                  onChange={(event) => updateProfileField({ timezone: event.target.value })}
                  variant="rounded"
                >
                  {timezones.map((item) => (
                    <option key={item.value} value={item.value}>
                      {`${item.label} (${item.offset})`}
                    </option>
                  ))}
                </PSelect>
              </div>
            </div>
          </PCard>

          <PCard className="rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="mb-5 flex items-center">
              <BellIcon className="mr-2 h-5 w-5 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900">通知设置</h3>
            </div>

            <div className="space-y-4">
              <ToggleCheckbox
                title="邮件通知"
                description="接收重要更新和交易通知"
                checked={notifications.email_enabled}
                onChange={() => handleNotificationChange('email_enabled')}
              />

              <ToggleCheckbox
                title="短信通知"
                description="接收安全验证和紧急通知"
                checked={notifications.sms_enabled}
                onChange={() => handleNotificationChange('sms_enabled')}
              />

              <ToggleCheckbox
                title="推送通知"
                description="接收实时交易和系统通知"
                checked={notifications.push_enabled}
                onChange={() => handleNotificationChange('push_enabled')}
              />

              <ToggleCheckbox
                title="安全通知"
                description="接收登录和安全事件通知"
                checked={notifications.security_enabled}
                onChange={() => handleNotificationChange('security_enabled')}
              />
            </div>
          </PCard>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            先选择页面上的选项，确认顶部“当前选择”变化后，再点右侧“保存设置”提交。
          </div>
          <PButton type="button" variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存设置'}
          </PButton>
        </div>
      </div>
    </Layout>
  )
}
