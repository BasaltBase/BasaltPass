import { useEffect, useState } from 'react'
import client from '@api/client'
import { useNavigate } from 'react-router-dom'
import Layout from '@features/user/components/Layout'
import { PCard, PButton, PInput } from '@ui'
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
  CameraIcon,
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
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    nickname: '',
    email: '',
    phone: ''
  })

  useEffect(() => {
    Promise.all([
      client.get('/api/v1/user/profile'),
      getUserProfile()
    ])
      .then(([profileRes, userProfileRes]) => {
        setProfile(profileRes.data)
        setUserProfile(userProfileRes.data.profile)
        setEditForm({
          nickname: profileRes.data.nickname || '',
          email: profileRes.data.email || '',
          phone: profileRes.data.phone || ''
        })
        setIsLoading(false)
      })
      .catch(() => {
        navigate(ROUTES.user.login)
      })
  }, [navigate])

  const handleSave = async () => {
    try {
      await client.put('/api/v1/user/profile', editForm)
      setProfile(prev => prev ? { ...prev, ...editForm } : null)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update profile:', error)
    }
  }

  const handleCancel = () => {
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

  if (!profile) return null

  return (
    <Layout>
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">{/* 头像和基本信息 */}
          <div className="lg:col-span-1">
            <PCard variant="bordered" size="lg">
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="h-24 w-24 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                    <UserIcon className="h-12 w-12 text-white" />
                  </div>
                  <button className="absolute bottom-0 right-0 h-8 w-8 bg-white rounded-full border-2 border-gray-200 flex items-center justify-center hover:bg-gray-50">
                    <CameraIcon className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  {profile.nickname || '未设置昵称'}
                </h3>
                <p className="text-sm text-gray-500">用户 ID: {profile.id}</p>
                <div className="mt-4 flex space-x-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    已验证
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    活跃用户
                  </span>
                </div>
              </div>
            </PCard>

            {/* 账户统计 */}
            <PCard variant="bordered" className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">账户统计</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">注册时间</span>
                  <span className="text-sm text-gray-900">
                    {new Date(profile.created_at).toLocaleDateString('zh-CN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">最后更新</span>
                  <span className="text-sm text-gray-900">
                    {new Date(profile.updated_at).toLocaleDateString('zh-CN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">账户状态</span>
                  <span className="text-sm text-green-600">正常</span>
                </div>
              </div>
            </PCard>
          </div>

          {/* 详细信息 */}
          <div className="lg:col-span-2">
            <PCard variant="bordered" size="lg">
              <h3 className="text-xl font-semibold text-gray-900 mb-8">基本信息</h3>
              
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
                  {isEditing ? (
                    <div className="relative">
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                        className="block w-full px-4 py-3 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white hover:border-gray-300"
                        placeholder="请输入邮箱地址"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <div className="h-5 w-5 text-gray-400">
                          <EnvelopeIcon className="h-5 w-5" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-100">
                      <p className="text-sm text-gray-900">{profile.email}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {isEditing ? (
                    <PhoneInput
                      label="手机号码"
                      value={editForm.phone}
                      onChange={(value, isValid) => {
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
                <div className="mt-8 flex justify-end space-x-4 pt-8 border-t border-gray-100">
                  <PButton
                    onClick={handleCancel}
                    variant="secondary"
                  >
                    取消
                  </PButton>
                  <PButton
                    onClick={handleSave}
                  >
                    保存更改
                  </PButton>
                </div>
              )}
            </PCard>

            {/* 详细资料 */}
            {userProfile && (
              <PCard variant="bordered" size="lg" className="mt-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">详细资料</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {userProfile.gender && (
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-500">
                        <UserIcon className="h-4 w-4 mr-2" />
                        性别
                      </label>
                      <p className="text-sm text-gray-900">{userProfile.gender.name_cn || userProfile.gender.name}</p>
                    </div>
                  )}
                  {userProfile.birth_date && (
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-500">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        出生日期
                      </label>
                      <p className="text-sm text-gray-900">{new Date(userProfile.birth_date).toLocaleDateString('zh-CN')}</p>
                    </div>
                  )}
                  {userProfile.language && (
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-500">
                        <GlobeAltIcon className="h-4 w-4 mr-2" />
                        语言
                      </label>
                      <p className="text-sm text-gray-900">{userProfile.language.name_local || userProfile.language.name}</p>
                    </div>
                  )}
                  {userProfile.timezone && (
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-500">
                        <GlobeAltIcon className="h-4 w-4 mr-2" />
                        时区
                      </label>
                      <p className="text-sm text-gray-900">{userProfile.timezone}</p>
                    </div>
                  )}
                  {userProfile.currency && (
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-500">
                        <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                        主要货币
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
                        所在地
                      </label>
                      <p className="text-sm text-gray-900">{userProfile.location}</p>
                    </div>
                  )}
                  {userProfile.company && (
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-500">
                        <BriefcaseIcon className="h-4 w-4 mr-2" />
                        公司
                      </label>
                      <p className="text-sm text-gray-900">{userProfile.company}</p>
                    </div>
                  )}
                  {userProfile.job_title && (
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-500">
                        <BriefcaseIcon className="h-4 w-4 mr-2" />
                        职位
                      </label>
                      <p className="text-sm text-gray-900">{userProfile.job_title}</p>
                    </div>
                  )}
                  {userProfile.website && (
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-500">
                        <LinkIcon className="h-4 w-4 mr-2" />
                        个人网站
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
                        个人简介
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
                    在设置中编辑详细资料 →
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
