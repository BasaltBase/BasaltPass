import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import Layout from '@features/user/components/Layout'
import { PSelect, PCard, PToggle, PButton, PInput, PSkeleton, PTextarea, PPageHeader } from '@ui'
import { 
  UserIcon, 
  BellIcon, 
  ShieldCheckIcon,
  GlobeAltIcon,
  CreditCardIcon,
  KeyIcon
} from '@heroicons/react/24/outline'
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
  type UpdateProfileData
} from '@api/user/profile'

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
} | null) => ({
  gender_id: profile?.gender_id,
  language_id: profile?.language_id,
  currency_id: profile?.currency_id,
  timezone: profile?.timezone || 'UTC',
  birth_date: normalizeDateInput(profile?.birth_date),
  bio: profile?.bio || '',
  location: profile?.location || '',
  website: profile?.website || '',
  company: profile?.company || '',
  job_title: profile?.job_title || ''
})

export default function Settings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // 选项数据
  const [genders, setGenders] = useState<Gender[]>([])
  const [languages, setLanguages] = useState<Language[]>([])
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [timezones, setTimezones] = useState<Timezone[]>([])

  // 用户资料
  const [profile, setProfile] = useState({
    gender_id: undefined as number | undefined,
    language_id: undefined as number | undefined,
    currency_id: undefined as number | undefined,
    timezone: 'UTC',
    birth_date: '',
    bio: '',
    location: '',
    website: '',
    company: '',
    job_title: ''
  })

  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    push: true,
    security: true
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [profileRes, gendersRes, languagesRes, currenciesRes, timezonesRes] = await Promise.all([
          getUserProfile(),
          getGenders(),
          getLanguages(),
          getCurrencies(true),
          getTimezones()
        ])

        if (profileRes.data.profile) {
          setProfile(toSettingsProfile(profileRes.data.profile))
        }

        setGenders(gendersRes.data.genders)
        setLanguages(languagesRes.data.languages)
        setCurrencies(currenciesRes.data.currencies)
        setTimezones(timezonesRes.data.timezones)
      } catch (err) {
        console.error('Failed to load settings:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const persistProfileChanges = async (changes: UpdateProfileData, silent = false) => {
    try {
      setSaving(true)
      const response = await updateUserProfile(changes)
      if (!silent) {
        // 全量保存时才用服务端响应覆盖本地 state
        setProfile(toSettingsProfile(response.data.profile))
        uiAlert('设置已保存')
      }
      // silent=true 的 inline 保存：本地 state 已由调用方乐观更新，不用服务端响应覆盖
      // 否则服务端若返回不完整 profile 会把用户刚选的值清回 null
    } catch (err) {
      console.error('Failed to save settings:', err)
      uiAlert('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    await persistProfileChanges({
      gender_id: profile.gender_id || null,
      language_id: profile.language_id || null,
      currency_id: profile.currency_id || null,
      timezone: profile.timezone,
      birth_date: profile.birth_date || null,
      bio: profile.bio,
      location: profile.location,
      website: profile.website,
      company: profile.company,
      job_title: profile.job_title
    })
  }

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

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
        {/* 页面标题 */}
        <PPageHeader title="系统设置" description="管理您的账户设置和偏好" />

        <div className="grid grid-cols-1 gap-6">
          
          {/* 个人信息 */}
          <PCard>
            <div className="flex items-center mb-4">
              <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">个人信息</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <PSelect
                  value={profile.gender_id?.toString() || ''}
                  onChange={(e) => {
                    const genderId = e.target.value ? Number(e.target.value) : undefined
                    setProfile(prev => ({ ...prev, gender_id: genderId }))
                    void persistProfileChanges({ gender_id: genderId || null }, true)
                  }}
                  label="性别"
                >
                  <option value="">请选择</option>
                  {genders.map(g => (
                    <option key={g.id} value={g.id}>{g.name_cn || g.name}</option>
                  ))}
                </PSelect>
              </div>
              <div>
                <PInput
                  type="date"
                  value={profile.birth_date}
                  onChange={(e) => setProfile(prev => ({ ...prev, birth_date: e.target.value }))}
                  label="出生日期"
                />
              </div>
              <div>
                <PInput
                  value={profile.location}
                  onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))}
                  label="所在地"
                  placeholder="例如：北京，中国"
                />
              </div>
              <div>
                <PInput
                  value={profile.company}
                  onChange={(e) => setProfile(prev => ({ ...prev, company: e.target.value }))}
                  label="公司"
                  placeholder="您的公司名称"
                />
              </div>
              <div>
                <PInput
                  value={profile.job_title}
                  onChange={(e) => setProfile(prev => ({ ...prev, job_title: e.target.value }))}
                  label="职位"
                  placeholder="您的职位"
                />
              </div>
              <div>
                <PInput
                  value={profile.website}
                  onChange={(e) => setProfile(prev => ({ ...prev, website: e.target.value }))}
                  label="个人网站"
                  placeholder="https://example.com"
                />
              </div>
              <div className="md:col-span-2">
                <PTextarea
                  label="个人简介"
                  value={profile.bio}
                  onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                  rows={3}
                  placeholder="介绍一下自己..."
                />
              </div>
            </div>
          </PCard>

          {/* 区域设置 */}
          <PCard>
            <div className="flex items-center mb-4">
              <GlobeAltIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">区域设置</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <PSelect
                  value={profile.language_id?.toString() || ''}
                  onChange={(e) => {
                    const languageId = e.target.value ? Number(e.target.value) : undefined
                    setProfile(prev => ({ ...prev, language_id: languageId }))
                    void persistProfileChanges({ language_id: languageId || null }, true)
                  }}
                  label="语言"
                >
                  <option value="">请选择</option>
                  {languages.map(l => (
                    <option key={l.id} value={l.id}>{l.name_local || l.name}</option>
                  ))}
                </PSelect>
              </div>
              <div>
                <PSelect
                  value={profile.timezone}
                  onChange={(e) => {
                    setProfile(prev => ({ ...prev, timezone: e.target.value }))
                    void persistProfileChanges({ timezone: e.target.value }, true)
                  }}
                  label="时区"
                >
                  {timezones.map(tz => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label} ({tz.offset})
                    </option>
                  ))}
                </PSelect>
              </div>
              <div>
                <PSelect
                  value={profile.currency_id?.toString() || ''}
                  onChange={(e) => {
                    const currencyId = e.target.value ? Number(e.target.value) : undefined
                    setProfile(prev => ({ ...prev, currency_id: currencyId }))
                    void persistProfileChanges({ currency_id: currencyId || null }, true)
                  }}
                  label="主要货币"
                >
                  <option value="">请选择</option>
                  {currencies.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name_cn || c.name} ({c.code})
                    </option>
                  ))}
                </PSelect>
              </div>
            </div>
          </PCard>

          {/* 通知设置 */}
          <PCard>
            <div className="flex items-center mb-4">
              <BellIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">通知设置</h3>
            </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">邮件通知</p>
                    <p className="text-sm text-gray-500">接收重要更新和交易通知</p>
                  </div>
                  <PToggle
                    checked={notifications.email}
                    onChange={() => handleNotificationChange('email')}
                    aria-label="邮件通知"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">短信通知</p>
                    <p className="text-sm text-gray-500">接收安全验证和紧急通知</p>
                  </div>
                  <PToggle
                    checked={notifications.sms}
                    onChange={() => handleNotificationChange('sms')}
                    aria-label="短信通知"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">推送通知</p>
                    <p className="text-sm text-gray-500">接收实时交易和系统通知</p>
                  </div>
                  <PToggle
                    checked={notifications.push}
                    onChange={() => handleNotificationChange('push')}
                    aria-label="推送通知"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">安全通知</p>
                    <p className="text-sm text-gray-500">接收登录和安全事件通知</p>
                  </div>
                  <PToggle
                    checked={notifications.security}
                    onChange={() => handleNotificationChange('security')}
                    aria-label="安全通知"
                  />
                </div>
              </div>
          </PCard>
        </div>

        {/* 保存按钮 */}
        <div className="flex justify-end">
          <PButton 
            type="button" 
            variant="primary" 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '保存中...' : '保存设置'}
          </PButton>
        </div>
      </div>
    </Layout>
  )
} 