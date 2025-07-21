import { useEffect, useState } from 'react'
import client from '../../api/client'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
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
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PencilIcon className="h-4 w-4 mr-2" />
            {isEditing ? '取消编辑' : '编辑资料'}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* 头像和基本信息 */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
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
              </div>
            </div>

            {/* 账户统计 */}
            <div className="mt-6 bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
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
              </div>
            </div>
          </div>

          {/* 详细信息 */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-6">基本信息</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <div className="flex items-center">
                        <IdentificationIcon className="h-4 w-4 mr-2 text-gray-400" />
                        用户昵称
                      </div>
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.nickname}
                        onChange={(e) => setEditForm(prev => ({ ...prev, nickname: e.target.value }))}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="请输入昵称"
                      />
                    ) : (
                      <p className="text-sm text-gray-900">
                        {profile.nickname || '未设置昵称'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <div className="flex items-center">
                        <EnvelopeIcon className="h-4 w-4 mr-2 text-gray-400" />
                        邮箱地址
                      </div>
                    </label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="请输入邮箱地址"
                      />
                    ) : (
                      <p className="text-sm text-gray-900">{profile.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <div className="flex items-center">
                        <PhoneIcon className="h-4 w-4 mr-2 text-gray-400" />
                        手机号码
                      </div>
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="请输入手机号码"
                      />
                    ) : (
                      <p className="text-sm text-gray-900">{profile.phone}</p>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="mt-6 flex space-x-3">
                    <button
                      onClick={handleSave}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      保存更改
                    </button>
                    <button
                      onClick={handleCancel}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      取消
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Profile 