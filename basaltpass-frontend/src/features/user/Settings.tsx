import { useState, useEffect } from 'react'
import Layout from '@features/user/components/Layout'
import { PSelect, PCard, PToggle, PButton, PInput } from '@ui'
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
  type Timezone
} from '@api/user/profile'

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
          const p = profileRes.data.profile
          setProfile({
            gender_id: p.gender_id,
            language_id: p.language_id,
            currency_id: p.currency_id,
            timezone: p.timezone || 'UTC',
            birth_date: p.birth_date || '',
            bio: p.bio || '',
            location: p.location || '',
            website: p.website || '',
            company: p.company || '',
            job_title: p.job_title || ''
          })
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

  const handleSave = async () => {
    try {
      setSaving(true)
      await updateUserProfile({
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
      alert('设置已保存')
    } catch (err) {
      console.error('Failed to save settings:', err)
      alert('保存失败，请重试')
    } finally {
      setSaving(false)
    }
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
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>
          <p className="mt-1 text-sm text-gray-500">
            管理您的账户设置和偏好
          </p>
        </div>

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
                  onChange={(e) => setProfile(prev => ({ ...prev, gender_id: e.target.value ? Number(e.target.value) : undefined }))}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">个人简介</label>
                <textarea
                  value={profile.bio}
                  onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
                  onChange={(e) => setProfile(prev => ({ ...prev, language_id: e.target.value ? Number(e.target.value) : undefined }))}
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
                  onChange={(e) => setProfile(prev => ({ ...prev, timezone: e.target.value }))}
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
                  onChange={(e) => setProfile(prev => ({ ...prev, currency_id: e.target.value ? Number(e.target.value) : undefined }))}
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