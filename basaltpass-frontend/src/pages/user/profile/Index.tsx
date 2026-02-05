import { useEffect, useState } from 'react'
import client from '../../../api/client'
import { useNavigate } from 'react-router-dom'
import Layout from '../../../components/Layout'
import { PCard, PButton, PInput } from '../../../components'
import PhoneInput from '../../../components/common/PhoneInput'
import { formatPhoneForDisplay } from '../../../utils/phoneValidator'
import { 
  UserIcon, 
  EnvelopeIcon, 
  PhoneIcon, 
  IdentificationIcon,
  PencilIcon,
  CameraIcon
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
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    nickname: '',
    email: '',
    phone: ''
  })

  useEffect(() => {
    client
      .get('/api/v1/user/profile')
      .then((res) => {
        setProfile(res.data)
        setEditForm({
          nickname: res.data.nickname || '',
          email: res.data.email || '',
          phone: res.data.phone || ''
        })
        setIsLoading(false)
      })
      .catch(() => {
        navigate('/login')
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
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">个人资料</h1>
            <p className="mt-1 text-sm text-gray-500">
              管理您的个人信息和账户设置
            </p>
          </div>
          <PButton
            onClick={() => setIsEditing(!isEditing)}
            variant="secondary"
          >
            <PencilIcon className="h-5 w-5 mr-2" />
            {isEditing ? '取消编辑' : '编辑资料'}
          </PButton>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* 头像和基本信息 */}
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
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Profile
