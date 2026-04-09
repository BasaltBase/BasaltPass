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
import { useI18n } from '@shared/i18n'

function PasskeyManagement() {
  const { t, locale } = useI18n()
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
      setError(err.response?.data?.error || t('pages.userPasskey.errors.loadFailed'))
      setPasskeys([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreatePasskey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPasskeyName.trim()) {
      setError(t('pages.userPasskey.errors.nameRequired'))
      return
    }

    setIsCreating(true)
    setError('')
    setSuccess('')

    try {
      await createPasskey(newPasskeyName.trim())
      setSuccess(t('pages.userPasskey.success.created'))
      setNewPasskeyName('')
      setShowCreateForm(false)
      await loadPasskeys()
    } catch (err: any) {
      setError(err.message || t('pages.userPasskey.errors.createFailed'))
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeletePasskey = async (id: string, name: string) => {
    if (!await uiConfirm(t('pages.userPasskey.confirm.delete', { name }))) {
      return
    }

    try {
      await deletePasskey(Number(id))
      setSuccess(t('pages.userPasskey.success.deleted'))
      await loadPasskeys()
    } catch (err: any) {
      setError(err.response?.data?.error || t('pages.userPasskey.errors.deleteFailed'))
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPasskeyIcon = (name: string) => {
    const lowerName = name.toLowerCase()
    if (lowerName.includes('\u624b\u673a') || lowerName.includes('phone') || lowerName.includes('mobile')) {
      return DevicePhoneMobileIcon
    } else if (lowerName.includes('\u7535\u8111') || lowerName.includes('desktop') || lowerName.includes('computer')) {
      return ComputerDesktopIcon
    }
    return ShieldCheckIcon
  }

  if (!isPasskeySupported()) {
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
                <h1 className="text-2xl font-bold text-gray-900">{t('pages.userPasskey.header.title')}</h1>
                <p className="mt-1 text-sm text-gray-500">
                  {t('pages.userPasskey.header.description')}
                </p>
              </div>
            </div>
            
            <PAlert variant="warning" title={t('pages.userPasskey.unsupported.title')} message={t('pages.userPasskey.unsupported.message')} />
          </div>
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
              <h1 className="text-2xl font-bold text-gray-900">{t('pages.userPasskey.header.title')}</h1>
              <p className="mt-1 text-sm text-gray-500">
                {t('pages.userPasskey.header.description')}
              </p>
            </div>
          </div>

          {/*  */}
          {error && <PAlert variant="error" message={error} dismissible onDismiss={() => setError('')} />}
          {success && <PAlert variant="success" message={success} dismissible onDismiss={() => setSuccess('')} />}

          {/* Passkey */}
          <PAlert variant="info" title={t('pages.userPasskey.info.title')} message={t('pages.userPasskey.info.message')} />

          {/* Passkey */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {t('pages.userPasskey.create.title')}
              </h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>{t('pages.userPasskey.create.description')}</p>
              </div>
              <div className="mt-5">
                {!showCreateForm ? (
                  <PButton
                    variant="primary"
                    onClick={() => setShowCreateForm(true)}
                    leftIcon={<PlusIcon className="h-4 w-4" />}
                  >
                    {t('pages.userPasskey.create.addButton')}
                  </PButton>
                ) : (
                  <form onSubmit={handleCreatePasskey} className="space-y-4">
                    <PInput
                      type="text"
                      id="passkey-name"
                      label={t('pages.userPasskey.create.nameLabel')}
                      value={newPasskeyName}
                      onChange={(e) => setNewPasskeyName(e.target.value)}
                      placeholder={t('pages.userPasskey.create.namePlaceholder')}
                    />
                    <div className="flex space-x-3">
                      <PButton
                        type="submit"
                        variant="primary"
                        disabled={isCreating}
                        loading={isCreating}
                        leftIcon={<ShieldCheckIcon className="h-4 w-4" />}
                      >
                        {t('pages.userPasskey.create.submit')}
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
                        {t('pages.userPasskey.create.cancel')}
                      </PButton>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* Passkey */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {t('pages.userPasskey.list.title')}
              </h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>{t('pages.userPasskey.list.description')}</p>
              </div>
              
              {isLoading ? (
                <PSkeleton.List items={3} />
              ) : (passkeys?.length || 0) === 0 ? (
                <div className="mt-6 text-center">
                  <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">{t('pages.userPasskey.list.emptyTitle')}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {t('pages.userPasskey.list.emptyDescription')}
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
                                  {t('pages.userPasskey.list.createdAt', { date: formatDate(passkey.created_at) })}
                                  {passkey.last_used_at && (
                                    <span className="ml-2">
                                      {t('pages.userPasskey.list.lastUsed', { date: formatDate(passkey.last_used_at) })}
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
                                {t('pages.userPasskey.list.delete')}
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