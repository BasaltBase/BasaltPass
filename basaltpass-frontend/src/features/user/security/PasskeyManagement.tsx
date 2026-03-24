import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import { Link } from 'react-router-dom'
import { listPasskeys, createPasskey, deletePasskey, PasskeyInfo } from '@api/oauth/passkey'
import { isPasskeySupported } from '@utils/webauthn'
import Layout from '@features/user/components/Layout'
import { ROUTES } from '@constants'
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
import { PSkeleton, PAlert, PButton, PInput } from '@ui'

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
    if (!await uiConfirm(`确定要删除Passkey "${name}" 吗？此操作无法撤销。`)) {
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
                to={ROUTES.user.security} 
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
            
            <PAlert variant="warning" title="浏览器不支持Passkey" message="您的浏览器不支持WebAuthn/Passkey功能。请使用支持的浏览器，如Chrome、Safari或Edge的最新版本。" />
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
              to={ROUTES.user.security} 
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
          {error && <PAlert variant="error" message={error} dismissible onDismiss={() => setError('')} />}
          {success && <PAlert variant="success" message={success} dismissible onDismiss={() => setSuccess('')} />}

          {/* Passkey介绍 */}
          <PAlert variant="info" title="关于Passkey" message="Passkey是一种安全、便捷的无密码登录方式。它使用设备上的生物识别功能（如指纹、面容ID）或硬件安全密钥来验证您的身份，比传统密码更安全、更方便。" />

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
                  <PButton
                    variant="primary"
                    onClick={() => setShowCreateForm(true)}
                    leftIcon={<PlusIcon className="h-4 w-4" />}
                  >
                    添加Passkey
                  </PButton>
                ) : (
                  <form onSubmit={handleCreatePasskey} className="space-y-4">
                    <PInput
                      type="text"
                      id="passkey-name"
                      label="Passkey名称"
                      value={newPasskeyName}
                      onChange={(e) => setNewPasskeyName(e.target.value)}
                      placeholder="例如：我的iPhone、工作电脑等"
                    />
                    <div className="flex space-x-3">
                      <PButton
                        type="submit"
                        variant="primary"
                        disabled={isCreating}
                        loading={isCreating}
                        leftIcon={<ShieldCheckIcon className="h-4 w-4" />}
                      >
                        创建Passkey
                      </PButton>
                      <PButton
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setShowCreateForm(false)
                          setNewPasskeyName('')
                          setError('')
                        }}
                      >
                        取消
                      </PButton>
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
                <PSkeleton.List items={3} />
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
                              <PButton
                                variant="danger"
                                size="sm"
                                onClick={() => handleDeletePasskey(passkey.id.toString(), passkey.name)}
                                leftIcon={<TrashIcon className="h-4 w-4" />}
                              >
                                删除
                              </PButton>
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