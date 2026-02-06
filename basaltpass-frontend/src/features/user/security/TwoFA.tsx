import { useEffect, useState } from 'react'
import { setup2FA, verify2FA } from '@api/user/security'
import { Link } from 'react-router-dom'
import Layout from '@features/user/components/Layout'
import { PInput, PButton } from '@ui'
import { 
  ShieldCheckIcon,
  QrCodeIcon,
  KeyIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'

export default function TwoFA() {
  const [secret, setSecret] = useState('')
  const [qr, setQr] = useState('')
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'success' | 'error' | ''>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isVerifying, setIsVerifying] = useState(false)

  useEffect(() => {
    setup2FA().then((res) => {
      setSecret(res.data.secret)
      setQr(res.data.qr)
      setIsLoading(false)
    }).catch(() => {
      setIsLoading(false)
    })
  }, [])

  const verify = async () => {
    if (!code.trim()) {
      setMsg('请输入验证码')
      setMsgType('error')
      return
    }

    setIsVerifying(true)
    setMsg('')
    
    try {
      await verify2FA(code)
      setMsg('两步验证已成功启用！')
      setMsgType('success')
      setCode('')
    } catch {
      setMsg('验证码无效，请重试')
      setMsgType('error')
    } finally {
      setIsVerifying(false)
    }
  }

  const copySecret = () => {
    navigator.clipboard.writeText(secret)
    setMsg('密钥已复制到剪贴板')
    setMsgType('success')
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
              <h1 className="text-2xl font-bold text-gray-900">设置两步验证</h1>
              <p className="mt-1 text-sm text-gray-500">
                使用验证器应用增强您的账户安全性
              </p>
            </div>
          </div>

          {/* 消息提示 */}
          {msg && (
            <div className={`rounded-md p-4 ${
              msgType === 'success' 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  {msgType === 'success' ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-400" />
                  ) : (
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                  )}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    msgType === 'success' ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {msg}
                  </p>
                </div>
              </div>
            </div>
          )}

          {msgType === 'success' && msg.includes('成功启用') ? (
            /* 成功页面 */
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6 text-center">
                <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  两步验证已启用
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  您的账户现在更加安全了。下次登录时，除了密码外，还需要输入验证器应用生成的验证码。
                </p>
                <div className="space-y-3">
                  <Link
                    to="/security"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    返回安全设置
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            /* 设置页面 */
            <>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* 设置说明 */}
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center mb-4">
                      <ShieldCheckIcon className="h-6 w-6 text-blue-600 mr-2" />
                      <h3 className="text-lg font-medium text-gray-900">设置说明</h3>
                    </div>
                    <div className="space-y-4 text-sm text-gray-600">
                      <div className="flex items-start">
                        <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                          <span className="text-xs font-bold text-blue-600">1</span>
                        </div>
                        <p>下载并安装 Google Authenticator 或类似的验证器应用</p>
                      </div>
                      <div className="flex items-start">
                        <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                          <span className="text-xs font-bold text-blue-600">2</span>
                        </div>
                        <p>扫描下方的二维码或手动输入密钥</p>
                      </div>
                      <div className="flex items-start">
                        <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                          <span className="text-xs font-bold text-blue-600">3</span>
                        </div>
                        <p>输入验证器应用生成的6位验证码</p>
                      </div>
                      <div className="flex items-start">
                        <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                          <span className="text-xs font-bold text-blue-600">4</span>
                        </div>
                        <p>点击验证按钮完成设置</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 验证码输入 */}
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center mb-4">
                      <KeyIcon className="h-6 w-6 text-green-600 mr-2" />
                      <h3 className="text-lg font-medium text-gray-900">验证设置</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <PInput
                          id="code"
                          type="text"
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                          placeholder="请输入6位验证码"
                          maxLength={6}
                          label="验证码"
                        />
                      </div>
                      <PButton
                        onClick={verify}
                        loading={isVerifying}
                        disabled={!code.trim()}
                        fullWidth
                      >
                        验证并启用
                      </PButton>
                    </div>
                  </div>
                </div>
              </div>

              {/* 二维码和密钥 */}
              {qr && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center mb-4">
                      <QrCodeIcon className="h-6 w-6 text-purple-600 mr-2" />
                      <h3 className="text-lg font-medium text-gray-900">扫描二维码</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div className="flex flex-col items-center">
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qr)}`} 
                            alt="QR Code" 
                            className="w-48 h-48"
                          />
                        </div>
                        <p className="mt-2 text-sm text-gray-500 text-center">
                          使用验证器应用扫描此二维码
                        </p>
                      </div>
                      <div className="flex flex-col justify-center">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            手动输入密钥
                          </label>
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <PInput
                                type="text"
                                value={secret}
                                readOnly
                                className="bg-gray-50"
                              />
                            </div>
                            <PButton variant="secondary" onClick={copySecret}>
                              复制
                            </PButton>
                          </div>
                          <p className="mt-2 text-sm text-gray-500">
                            如果无法扫描二维码，请手动输入此密钥到验证器应用
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 安全提示 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <ShieldCheckIcon className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">安全提示</h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>请妥善保管您的验证器应用和设备</li>
                        <li>不要将验证码分享给任何人</li>
                        <li>建议在多个设备上设置验证器作为备份</li>
                        <li>如果丢失验证器，请联系客服恢复账户</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  )
} 