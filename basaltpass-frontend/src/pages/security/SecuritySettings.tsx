import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { 
  getSecurityStatus, 
  SecurityStatus, 
  changePassword, 
  updateContact,
  disable2FA,
  resendEmailVerification,
  resendPhoneVerification
} from '../../api/security'
import { listPasskeys, PasskeyInfo } from '../../api/passkey'
import { isPasskeySupported } from '../../utils/webauthn'
import { 
  ShieldCheckIcon,
  KeyIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  CogIcon,
  LockClosedIcon,
  FingerPrintIcon
} from '@heroicons/react/24/outline'

export default function SecuritySettings() {
  const navigate = useNavigate()
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null)
  const [passkeys, setPasskeys] = useState<PasskeyInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // 密码修改相关
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  
  // 联系方式修改相关
  const [showContactForm, setShowContactForm] = useState(false)
  const [contactForm, setContactForm] = useState({
    email: '',
    phone: ''
  })

  useEffect(() => {
    loadSecurityData()
  }, [])

  const loadSecurityData = async () => {
    try {
      setIsLoading(true)
      const [statusRes, passkeysData] = await Promise.all([
        getSecurityStatus(),
        listPasskeys().catch(() => [])
      ])
      
      setSecurityStatus(statusRes.data)
      setPasskeys(Array.isArray(passkeysData) ? passkeysData : [])
      setContactForm({
        email: statusRes.data.email,
        phone: statusRes.data.phone || ''
      })
      setError('')
    } catch (err: any) {
      setError('加载安全设置失败')
      setPasskeys([]) // 确保即使出错也设置为空数组
    } finally {
      setIsLoading(false)
    }
  }

  const calculateSecurityScore = () => {
    if (!securityStatus) return 0
    
    let score = 0
    if (securityStatus.password_set) score += 20
    if (securityStatus.two_fa_enabled) score += 30
    if (securityStatus.passkeys_count > 0) score += 25
    if (securityStatus.email_verified) score += 15
    if (securityStatus.phone_verified) score += 10
    
    return Math.min(score, 100)
  }

  const getSecurityLevel = (score: number) => {
    if (score >= 90) return { text: '极强', color: 'text-green-600', bg: 'bg-green-100' }
    if (score >= 70) return { text: '强', color: 'text-blue-600', bg: 'bg-blue-100' }
    if (score >= 50) return { text: '中等', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    return { text: '弱', color: 'text-red-600', bg: 'bg-red-100' }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError('新密码与确认密码不匹配')
      return
    }
    
    if (passwordForm.new_password.length < 8) {
      setError('新密码长度至少8位')
      return
    }

    try {
      await changePassword(passwordForm)
      setSuccess('密码修改成功')
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
      setShowPasswordForm(false)
      await loadSecurityData()
    } catch (err: any) {
      setError(err.response?.data?.error || '密码修改失败')
    }
  }

  const handleContactUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      await updateContact(contactForm)
      setSuccess('联系方式更新成功')
      setShowContactForm(false)
      await loadSecurityData()
    } catch (err: any) {
      setError(err.response?.data?.error || '联系方式更新失败')
    }
  }

  const handleDisable2FA = async () => {
    const code = prompt('请输入验证器应用中的6位验证码以确认禁用两步验证：')
    if (!code) return

    try {
      await disable2FA(code)
      setSuccess('两步验证已禁用')
      await loadSecurityData()
    } catch (err: any) {
      setError('验证码无效或禁用失败')
    }
  }

  const handleResendVerification = async (type: 'email' | 'phone') => {
    try {
      if (type === 'email') {
        await resendEmailVerification()
        setSuccess('验证邮件已发送')
      } else {
        await resendPhoneVerification()
        setSuccess('验证短信已发送')
      }
    } catch (err: any) {
      setError(`发送${type === 'email' ? '邮件' : '短信'}失败`)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (!securityStatus) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center text-red-600">加载安全设置失败</div>
      </div>
    )
  }

  const securityScore = calculateSecurityScore()
  const securityLevel = getSecurityLevel(securityScore)

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* 页面标题 */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">安全设置</h1>
            <p className="mt-2 text-sm text-gray-600">
              管理您的账户安全设置和验证方式
            </p>
          </div>

          {/* 消息提示 */}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
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
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">成功</h3>
                  <div className="mt-2 text-sm text-green-700">{success}</div>
                </div>
              </div>
            </div>
          )}

          {/* 安全状态概览 */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    账户安全评分
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    当前安全级别评估
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900">{securityScore}</div>
                  <div className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${securityLevel.bg} ${securityLevel.color}`}>
                    {securityLevel.text}
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <div className="bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${securityScore}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* 验证方式管理 */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">
                验证方式管理
              </h3>
              
              <div className="space-y-6">
                {/* 密码设置 */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <LockClosedIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-4">
                      <h4 className="text-sm font-medium text-gray-900">登录密码</h4>
                      <p className="text-sm text-gray-500">
                        {securityStatus.password_set ? '已设置密码' : '未设置密码'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {securityStatus.password_set && (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    )}
                    <button
                      onClick={() => setShowPasswordForm(!showPasswordForm)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <CogIcon className="h-4 w-4 mr-1" />
                      {securityStatus.password_set ? '修改密码' : '设置密码'}
                    </button>
                  </div>
                </div>

                {/* 密码修改表单 */}
                {showPasswordForm && (
                  <form onSubmit={handlePasswordChange} className="bg-gray-50 p-4 rounded-lg space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">当前密码</label>
                      <div className="mt-1 relative">
                        <input
                          type={showPasswords.current ? 'text' : 'password'}
                          value={passwordForm.current_password}
                          onChange={(e) => setPasswordForm({...passwordForm, current_password: e.target.value})}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm pr-10"
                          required
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                        >
                          {showPasswords.current ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">新密码</label>
                      <div className="mt-1 relative">
                        <input
                          type={showPasswords.new ? 'text' : 'password'}
                          value={passwordForm.new_password}
                          onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm pr-10"
                          required
                          minLength={8}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                        >
                          {showPasswords.new ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">确认新密码</label>
                      <div className="mt-1 relative">
                        <input
                          type={showPasswords.confirm ? 'text' : 'password'}
                          value={passwordForm.confirm_password}
                          onChange={(e) => setPasswordForm({...passwordForm, confirm_password: e.target.value})}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm pr-10"
                          required
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                        >
                          {showPasswords.confirm ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="submit"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        确认修改
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPasswordForm(false)
                          setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
                        }}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        取消
                      </button>
                    </div>
                  </form>
                )}

                {/* Passkey设置 */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <FingerPrintIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-4">
                      <h4 className="text-sm font-medium text-gray-900">Passkey</h4>
                      <p className="text-sm text-gray-500">
                        {isPasskeySupported() 
                          ? `已注册 ${passkeys?.length || 0} 个 Passkey` 
                          : '浏览器不支持Passkey'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {(passkeys?.length || 0) > 0 && (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    )}
                    {isPasskeySupported() && (
                      <Link
                        to="/security/passkey"
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <CogIcon className="h-4 w-4 mr-1" />
                        管理Passkey
                      </Link>
                    )}
                  </div>
                </div>

                {/* 两步验证设置 */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ShieldCheckIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-4">
                      <h4 className="text-sm font-medium text-gray-900">两步验证 (TOTP)</h4>
                      <p className="text-sm text-gray-500">
                        {securityStatus.two_fa_enabled ? '已启用两步验证' : '未启用两步验证'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {securityStatus.two_fa_enabled && (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    )}
                    {securityStatus.two_fa_enabled ? (
                      <button
                        onClick={handleDisable2FA}
                        className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <TrashIcon className="h-4 w-4 mr-1" />
                        禁用
                      </button>
                    ) : (
                      <Link
                        to="/security/2fa"
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <PlusIcon className="h-4 w-4 mr-1" />
                        启用
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 联系方式管理 */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  联系方式管理
                </h3>
                <button
                  onClick={() => setShowContactForm(!showContactForm)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <CogIcon className="h-4 w-4 mr-1" />
                  修改联系方式
                </button>
              </div>
              
              <div className="space-y-4">
                {/* 邮箱 */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{securityStatus.email}</p>
                      <p className="text-sm text-gray-500">
                        {securityStatus.email_verified ? '已验证' : '未验证'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {securityStatus.email_verified ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    ) : (
                      <>
                        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                        <button
                          onClick={() => handleResendVerification('email')}
                          className="text-sm text-blue-600 hover:text-blue-500"
                        >
                          发送验证邮件
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* 手机号 */}
                {securityStatus.phone && (
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center">
                      <DevicePhoneMobileIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{securityStatus.phone}</p>
                        <p className="text-sm text-gray-500">
                          {securityStatus.phone_verified ? '已验证' : '未验证'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {securityStatus.phone_verified ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      ) : (
                        <>
                          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                          <button
                            onClick={() => handleResendVerification('phone')}
                            className="text-sm text-blue-600 hover:text-blue-500"
                          >
                            发送验证短信
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 联系方式修改表单 */}
              {showContactForm && (
                <form onSubmit={handleContactUpdate} className="mt-6 bg-gray-50 p-4 rounded-lg space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">邮箱地址</label>
                    <input
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">手机号码</label>
                    <input
                      type="tel"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({...contactForm, phone: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="可选"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      保存修改
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowContactForm(false)
                        setContactForm({ email: securityStatus.email, phone: securityStatus.phone || '' })
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

          {/* 安全建议 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <ShieldCheckIcon className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">安全建议</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc list-inside space-y-1">
                    {!securityStatus.two_fa_enabled && (
                      <li>启用两步验证以增强账户安全性</li>
                    )}
                    {(passkeys?.length || 0) === 0 && isPasskeySupported() && (
                      <li>设置Passkey实现无密码安全登录</li>
                    )}
                    {!securityStatus.email_verified && (
                      <li>验证您的邮箱地址以确保账户安全</li>
                    )}
                    {!securityStatus.phone && (
                      <li>添加手机号码作为额外的安全验证方式</li>
                    )}
                    <li>定期检查和更新您的安全设置</li>
                    <li>使用强密码并定期更换</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <Link to="/security/login-history" className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
              查看登录历史
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  )
} 