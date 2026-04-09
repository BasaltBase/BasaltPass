import { useEffect, useState } from 'react'
import { setup2FA, verify2FA } from '@api/user/security'
import { Link } from 'react-router-dom'
import Layout from '@features/user/components/Layout'
import { PInput, PButton, PSkeleton, PAlert } from '@ui'
import { ROUTES } from '@constants'
import { useI18n } from '@shared/i18n'
import { 
  ShieldCheckIcon,
  QrCodeIcon,
  KeyIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'

export default function TwoFA() {
  const { t } = useI18n()
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
      setMsg(t('pages.userTwoFA.errors.codeRequired'))
      setMsgType('error')
      return
    }

    setIsVerifying(true)
    setMsg('')
    
    try {
      await verify2FA(code)
      setMsg(t('pages.userTwoFA.success.enabled'))
      setMsgType('success')
      setCode('')
    } catch {
      setMsg(t('pages.userTwoFA.errors.invalidCode'))
      setMsgType('error')
    } finally {
      setIsVerifying(false)
    }
  }

  const copySecret = () => {
    navigator.clipboard.writeText(secret)
    setMsg(t('pages.userTwoFA.success.secretCopied'))
    setMsgType('success')
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <PSkeleton.Content cards={1} />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/*  */}
          <div className="flex items-center">
            <Link 
              to={ROUTES.user.security} 
              className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('pages.userTwoFA.header.title')}</h1>
              <p className="mt-1 text-sm text-gray-500">
                {t('pages.userTwoFA.header.description')}
              </p>
            </div>
          </div>

          {/*  */}
          {msg && (
            <PAlert
              variant={msgType === 'success' ? 'success' : 'error'}
              message={msg}
            />
          )}

          {msgType === 'success' && msg === t('pages.userTwoFA.success.enabled') ? (
            /*  */
            <div className="rounded-xl bg-white shadow-sm">
              <div className="px-4 py-5 sm:p-6 text-center">
                <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t('pages.userTwoFA.success.title')}
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  {t('pages.userTwoFA.success.description')}
                </p>
                <div className="space-y-3">
                  <Link to={ROUTES.user.security}>
                    <PButton variant="primary">{t('pages.userTwoFA.success.back')}</PButton>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            /*  */
            <>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/*  */}
                <div className="rounded-xl bg-white shadow-sm">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center mb-4">
                      <ShieldCheckIcon className="h-6 w-6 text-blue-600 mr-2" />
                      <h3 className="text-lg font-medium text-gray-900">{t('pages.userTwoFA.setup.title')}</h3>
                    </div>
                    <div className="space-y-4 text-sm text-gray-600">
                      <div className="flex items-start">
                        <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                          <span className="text-xs font-bold text-blue-600">1</span>
                        </div>
                        <p>{t('pages.userTwoFA.setup.step1')}</p>
                      </div>
                      <div className="flex items-start">
                        <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                          <span className="text-xs font-bold text-blue-600">2</span>
                        </div>
                        <p>{t('pages.userTwoFA.setup.step2')}</p>
                      </div>
                      <div className="flex items-start">
                        <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                          <span className="text-xs font-bold text-blue-600">3</span>
                        </div>
                        <p>{t('pages.userTwoFA.setup.step3')}</p>
                      </div>
                      <div className="flex items-start">
                        <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                          <span className="text-xs font-bold text-blue-600">4</span>
                        </div>
                        <p>{t('pages.userTwoFA.setup.step4')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/*  */}
                <div className="rounded-xl bg-white shadow-sm">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center mb-4">
                      <KeyIcon className="h-6 w-6 text-green-600 mr-2" />
                      <h3 className="text-lg font-medium text-gray-900">{t('pages.userTwoFA.verify.title')}</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <PInput
                          id="code"
                          type="text"
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                          placeholder={t('pages.userTwoFA.verify.codePlaceholder')}
                          maxLength={6}
                          label={t('pages.userTwoFA.verify.codeLabel')}
                        />
                      </div>
                      <PButton
                        onClick={verify}
                        loading={isVerifying}
                        disabled={!code.trim()}
                        fullWidth
                      >
                        {t('pages.userTwoFA.verify.submit')}
                      </PButton>
                    </div>
                  </div>
                </div>
              </div>

              {/*  */}
              {qr && (
                <div className="rounded-xl bg-white shadow-sm">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center mb-4">
                      <QrCodeIcon className="h-6 w-6 text-indigo-600 mr-2" />
                      <h3 className="text-lg font-medium text-gray-900">{t('pages.userTwoFA.qr.title')}</h3>
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
                          {t('pages.userTwoFA.qr.scanHint')}
                        </p>
                      </div>
                      <div className="flex flex-col justify-center">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('pages.userTwoFA.qr.manualKey')}
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
                              {t('pages.userTwoFA.qr.copy')}
                            </PButton>
                          </div>
                          <p className="mt-2 text-sm text-gray-500">
                            {t('pages.userTwoFA.qr.manualHint')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/*  */}
              <PAlert variant="info" title={t('pages.userTwoFA.securityTips.title')}>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>{t('pages.userTwoFA.securityTips.item1')}</li>
                  <li>{t('pages.userTwoFA.securityTips.item2')}</li>
                  <li>{t('pages.userTwoFA.securityTips.item3')}</li>
                  <li>{t('pages.userTwoFA.securityTips.item4')}</li>
                </ul>
              </PAlert>
            </>
          )}
        </div>
      </div>
    </Layout>
  )
} 
