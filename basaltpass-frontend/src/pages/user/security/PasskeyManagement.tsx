import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { listPasskeys, createPasskey, deletePasskey, PasskeyInfo } from '@api/oauth/passkey'
import { isPasskeySupported } from '../../../utils/webauthn'
import Layout from '../../../components/Layout'
import { 
  TrashIcon, 
  PlusIcon, 
  ShieldCheckIcon, 
  DevicePhoneMobileIcon, 
  ComputerDesktopIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

function PasskeyManagement() {
  const [passkeys, setPasskeys] = useState<PasskeyInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [newPasskeyName, setNewPasskeyName] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    loadPasskeys()
  }, [])

  const loadPasskeys = async () => {
    try {
      setIsLoading(true)
      const data = await listPasskeys()
      setPasskeys(Array.isArray(data) ? data : [])
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.error || '加载Passkey失败')
      setPasskeys([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreatePasskey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPasskeyName.trim()) {
      setError('请输入Passkey名称')
      return
    }

    setIsCreating(true)
    setError('')
    setSuccess('')

    try {
      await createPasskey(newPasskeyName.trim())
      setSuccess('Passkey创建成功')
      setNewPasskeyName('')
      setShowCreateForm(false)
      await loadPasskeys()
    } catch (err: any) {
      setError(err.message || 'Passkey创建失败')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeletePasskey = async (id: string, name: string) => {
    if (!confirm(`确定要删除Passkey "${name}" 吗？此操作无法撤销。`)) {
      return
    }

    try {
      await deletePasskey(Number(id))
      setSuccess('Passkey删除成功')
      await loadPasskeys()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Passkey删除失败')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPasskeyIcon = (name: string) => {
    const lowerName = name.toLowerCase()
    if (lowerName.includes('手机') || lowerName.includes('phone') || lowerName.includes('mobile')) {
      return DevicePhoneMobileIcon
    } else if (lowerName.includes('电脑') || lowerName.includes('desktop') || lowerName.includes('computer')) {
      return ComputerDesktopIcon
    }
    return ShieldCheckIcon
  }

  if (!isPasskeySupported()) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="space-y-6">
            {/* 页面标题 */}
            <div className="flex items-center">
              <Link 
                to="/security" 
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Passkey管理</h1>
                <p className="mt-1 text-sm text-gray-500">
                  管理您的Passkey，享受无密码登录的便利和安全
                </p>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    浏览器不支持Passkey
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>您的浏览器不支持WebAuthn/Passkey功能。请使用支持的浏览器，如Chrome、Safari或Edge的最新版本。</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* 页面标题 */}
          <div className="flex items-center">
            <Link 
              to="/security" 
              className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Passkey管理</h1>
              <p className="mt-1 text-sm text-gray-500">
                管理您的Passkey，享受无密码登录的便利和安全
              </p>
            </div>
          </div>

          {/* 成功和错误消息 */}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">错误</h3>
                  <div className="mt-2 text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">成功</h3>
                  <div className="mt-2 text-sm text-green-700">{success}</div>
                </div>
              </div>
            </div>
          )}

          {/* Passkey介绍 */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <ShieldCheckIcon className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  关于Passkey
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    Passkey是一种安全、便捷的无密码登录方式。它使用设备上的生物识别功能（如指纹、面容ID）或硬件安全密钥来验证您的身份，
                    比传统密码更安全、更方便。
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 添加新Passkey */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                添加新的Passkey
              </h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>为您的设备创建一个新的Passkey，您可以为不同的设备创建多个Passkey。</p>
              </div>
              <div className="mt-5">
                {!showCreateForm ? (
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    添加Passkey
                  </button>
                ) : (
                  <form onSubmit={handleCreatePasskey} className="space-y-4">
                    <div>
                      <label htmlFor="passkey-name" className="block text-sm font-medium text-gray-700">
                        Passkey名称
                      </label>
                      <input
                        type="text"
                        id="passkey-name"
                        value={newPasskeyName}
                        onChange={(e) => setNewPasskeyName(e.target.value)}
                        placeholder="例如：我的iPhone、工作电脑等"
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="submit"
                        disabled={isCreating}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        <ShieldCheckIcon className="h-4 w-4 mr-2" />
                        {isCreating ? '创建中...' : '创建Passkey'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateForm(false)
                          setNewPasskeyName('')
                          setError('')
                        }}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        取消
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* Passkey列表 */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                您的Passkey
              </h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>管理您已注册的Passkey。您可以删除不再使用的设备上的Passkey。</p>
              </div>
              
              {isLoading ? (
                <div className="mt-6 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (passkeys?.length || 0) === 0 ? (
                <div className="mt-6 text-center">
                  <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">没有Passkey</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    您还没有创建任何Passkey。点击上方按钮添加您的第一个Passkey。
                  </p>
                </div>
              ) : (
                <div className="mt-6">
                  <ul className="divide-y divide-gray-200">
                    {(passkeys || []).map((passkey) => {
                      const IconComponent = getPasskeyIcon(passkey.name)
                      return (
                        <li key={passkey.id} className="py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                <IconComponent className="h-6 w-6 text-gray-400" />
                              </div>
                              <div className="ml-4">
                                <p className="text-sm font-medium text-gray-900">
                                  {passkey.name}
                                </p>
                                <p className="text-sm text-gray-500">
                                  创建于 {formatDate(passkey.created_at)}
                                  {passkey.last_used_at && (
                                    <span className="ml-2">
                                      · 最后使用：{formatDate(passkey.last_used_at)}
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <button
                                onClick={() => handleDeletePasskey(passkey.id.toString(), passkey.name)}
                                className="inline-flex items-center p-2 border border-transparent rounded-full text-red-400 hover:bg-red-50 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                title="删除Passkey"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default PasskeyManagement 