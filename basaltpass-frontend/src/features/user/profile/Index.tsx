import { useEffect, useState } from 'react'
import client from '@api/client'
import { Link } from 'react-router-dom'
import Layout from '@features/user/components/Layout'
import { PCard, PButton } from '@ui'
import PhoneInput from '@ui/common/PhoneInput'
import { formatPhoneForDisplay } from '@utils/phoneValidator'
import { getUserProfile, type UserProfile } from '@api/user/profile'
import { ROUTES } from '@constants'
import { 
  UserIcon, 
  EnvelopeIcon, 
  PhoneIcon, 
  IdentificationIcon,
  PencilIcon,
  GlobeAltIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  BriefcaseIcon,
  LinkIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'

interface Profile {
  id: string
  email: string
  phone: string
  nickname: string
  created_at: string
  updated_at: string
}

function Profile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    nickname: '',
    email: '',
    phone: ''
  })

  const loadProfile = async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const [profileRes, userProfileRes] = await Promise.all([
        client.get('/api/v1/user/profile'),
        getUserProfile()
      ])
      setProfile(profileRes.data)
      setUserProfile(userProfileRes.data.profile)
      setEditForm({
        nickname: profileRes.data.nickname || '',
        email: profileRes.data.email || '',
        phone: profileRes.data.phone || ''
      })
    } catch {
      setLoadError('åŠ è½½ä¸ªäººèµ„æ–™å¤±è´¥ï¼Œè¯·æ£€æŸ¥ç½‘ç»œåŽé‡è¯•')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadProfile()
  }, [])

  const handleSave = async () => {
    setSaveError('')
    setIsSaving(true)
    try {
      await client.put('/api/v1/user/profile', {
        nickname: editForm.nickname,
        phone: editForm.phone
      })
      setProfile(prev => prev ? { ...prev, nickname: editForm.nickname, phone: editForm.phone } : null)
      setIsEditing(false)
    } catch (error: any) {
      setSaveError(error?.response?.data?.error || 'ä¿å­˜å¤±è´¥ï¼Œè¯·ç¨åŽé‡è¯•')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setSaveError('')
    setEditForm({
      nickname: profile?.nickname || '',
      email: profile?.email || '',
      phone: profile?.phone || ''
    })
    setIsEditing(false)
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  if (loadError) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center">
          <div className="space-y-4 text-center">
            <div className="text-red-600" role="alert">{loadError}</div>
            <PButton onClick={() => void loadProfile()} variant="secondary">
              é‡è¯•
            </PButton>
          </div>
        </div>
      </Layout>
    )
  }

  if (!profile) return null

  return (
    <Layout>
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">{/* å¤´åƒå’ŒåŸºæœ¬ä¿¡æ¯ */}
          <div className="lg:col-span-1">
            <PCard variant="bordered" size="lg">
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="h-24 w-24 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                    <UserIcon className="h-12 w-12 text-white" />
                  </div>
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  {profile.nickname || 'æœªè®¾ç½®æ˜µç§°'}
                </h3>
                <p className="text-sm text-gray-500">ç”¨æˆ· ID: {profile.id}</p>
                <div className="mt-4 flex space-x-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    å·²éªŒè¯
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    æ´»è·ƒç”¨æˆ·
                  </span>
                </div>
              </div>
            </PCard>

            {/* è´¦æˆ·ç»Ÿè®¡ */}
            <PCard variant="bordered" className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">è´¦æˆ·ç»Ÿè®¡</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">æ³¨å†Œæ—¶é—´</span>
                  <span className="text-sm text-gray-900">
                    {new Date(profile.created_at).toLocaleDateString('zh-CN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">æœ€åŽæ›´æ–°</span>
                  <span className="text-sm text-gray-900">
                    {new Date(profile.updated_at).toLocaleDateString('zh-CN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">è´¦æˆ·çŠ¶æ€</span>
                  <span className="text-sm text-green-600">æ­£å¸¸</span>
                </div>
              </div>
            </PCard>
          </div>

          {/* è¯¦ç»†ä¿¡æ¯ */}
          <div className="lg:col-span-2">
            <PCard variant="bordered" size="lg">
              <div className="mb-8 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">基本信息</h3>
                {!isEditing && (
                  <PButton onClick={() => setIsEditing(true)} variant="secondary" leftIcon={<PencilIcon className="h-4 w-4" />}>
                    编辑资料
                  </PButton>
                )}
              </div>
              
              <div className="space-y-8">
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-semibold text-gray-700">
                    <IdentificationIcon className="h-5 w-5 mr-2 text-indigo-500" />
                    用户昵称
                  </label>
                  {isEditing ? (
                    <div className="relative">
                      <input
                        type="text"
                        value={editForm.nickname}
                        onChange={(e) => setEditForm(prev => ({ ...prev, nickname: e.target.value }))}
                        className="block w-full px-4 py-3 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white hover:border-gray-300"
                        placeholder="请输入昵称"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <div className="h-5 w-5 text-gray-400">
                          <IdentificationIcon className="h-5 w-5" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-100">
                      <p className="text-sm text-gray-900">
                        {profile.nickname || '未设置昵称'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center text-sm font-semibold text-gray-700">
                    <EnvelopeIcon className="h-5 w-5 mr-2 text-indigo-500" />
                    邮箱地址
                  </label>
                  <div className="space-y-2">
                    <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-100">
                      <p className="text-sm text-gray-900">{profile.email}</p>
                    </div>
                    {isEditing && (
                      <p className="text-xs text-gray-500">
                        邮箱修改需走安全校验流程，请前往{' '}
                        <Link to={ROUTES.user.security} className="text-blue-600 hover:underline">
                          安全设置
                        </Link>{' '}
                        操作。
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {isEditing ? (
                    <PhoneInput
                      label="手机号码"
                      value={editForm.phone}
                      onChange={(value) => {
                        setEditForm(prev => ({ ...prev, phone: value }))
                      }}
                      placeholder="请输入手机号码"
                      showValidation={true}
                    />
                  ) : (
                    <>
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        <PhoneIcon className="h-5 w-5 mr-2 text-indigo-500" />
                        手机号码
                      </label>
                      <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-100">
                        <p className="text-sm text-gray-900">{formatPhoneForDisplay(profile.phone) || '未设置'}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="mt-8 space-y-4 pt-8 border-t border-gray-100">
                  {saveError && (
                    <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700" role="alert" aria-live="assertive">
                      {saveError}
                    </div>
                  )}
                  <div className="flex justify-end space-x-4">
                    <PButton
                      onClick={handleCancel}
                      variant="secondary"
                      disabled={isSaving}
                    >
                      取消
                    </PButton>
                    <PButton
                      onClick={handleSave}
                      loading={isSaving}
                      disabled={isSaving}
                    >
                      保存更改
                    </PButton>
                  </div>
                </div>
              )}
            </PCard>

            {/* è¯¦ç»†èµ„æ–™ */}
            {userProfile && (
              <PCard variant="bordered" size="lg" className="mt-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">è¯¦ç»†èµ„æ–™</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {userProfile.gender && (
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-500">
                        <UserIcon className="h-4 w-4 mr-2" />
                        æ€§åˆ«
                      </label>
                      <p className="text-sm text-gray-900">{userProfile.gender.name_cn || userProfile.gender.name}</p>
                    </div>
                  )}
                  {userProfile.birth_date && (
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-500">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        å‡ºç”Ÿæ—¥æœŸ
                      </label>
                      <p className="text-sm text-gray-900">{new Date(userProfile.birth_date).toLocaleDateString('zh-CN')}</p>
                    </div>
                  )}
                  {userProfile.language && (
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-500">
                        <GlobeAltIcon className="h-4 w-4 mr-2" />
                        è¯­è¨€
                      </label>
                      <p className="text-sm text-gray-900">{userProfile.language.name_local || userProfile.language.name}</p>
                    </div>
                  )}
                  {userProfile.timezone && (
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-500">
                        <GlobeAltIcon className="h-4 w-4 mr-2" />
                        æ—¶åŒº
                      </label>
                      <p className="text-sm text-gray-900">{userProfile.timezone}</p>
                    </div>
                  )}
                  {userProfile.currency && (
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-500">
                        <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                        ä¸»è¦è´§å¸
                      </label>
                      <p className="text-sm text-gray-900">
                        {userProfile.currency.name_cn || userProfile.currency.name} ({userProfile.currency.code})
                      </p>
                    </div>
                  )}
                  {userProfile.location && (
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-500">
                        <MapPinIcon className="h-4 w-4 mr-2" />
                        æ‰€åœ¨åœ°
                      </label>
                      <p className="text-sm text-gray-900">{userProfile.location}</p>
                    </div>
                  )}
                  {userProfile.company && (
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-500">
                        <BriefcaseIcon className="h-4 w-4 mr-2" />
                        å…¬å¸
                      </label>
                      <p className="text-sm text-gray-900">{userProfile.company}</p>
                    </div>
                  )}
                  {userProfile.job_title && (
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-500">
                        <BriefcaseIcon className="h-4 w-4 mr-2" />
                        èŒä½
                      </label>
                      <p className="text-sm text-gray-900">{userProfile.job_title}</p>
                    </div>
                  )}
                  {userProfile.website && (
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-500">
                        <LinkIcon className="h-4 w-4 mr-2" />
                        ä¸ªäººç½‘ç«™
                      </label>
                      <a 
                        href={userProfile.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {userProfile.website}
                      </a>
                    </div>
                  )}
                  {userProfile.bio && (
                    <div className="space-y-2 md:col-span-2">
                      <label className="flex items-center text-sm font-medium text-gray-500">
                        <UserIcon className="h-4 w-4 mr-2" />
                        ä¸ªäººç®€ä»‹
                      </label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{userProfile.bio}</p>
                    </div>
                  )}
                </div>
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <a 
                    href={ROUTES.user.settings}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    åœ¨è®¾ç½®ä¸­ç¼–è¾‘è¯¦ç»†èµ„æ–™ â†’
                  </a>
                </div>
              </PCard>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Profile

