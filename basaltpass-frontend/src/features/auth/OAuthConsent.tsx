import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import client from '@api/client'
import { ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useI18n } from '@shared/i18n'

export default function OAuthConsent() {
  const { t } = useI18n()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const submittedRef = useRef(false)

  // Read OAuth authorization information from URL parameters
  const clientName = searchParams.get('client_name') || t('auth.oauthConsent.unknownApp')
  const clientDescription = searchParams.get('client_description') || ''
  const scopes = searchParams.get('scope')?.split(' ') || []
  const redirectUri = searchParams.get('redirect_uri') || ''
  const state = searchParams.get('state') || ''
  const clientId = searchParams.get('client_id') || ''
  const codeChallenge = searchParams.get('code_challenge') || ''
  const codeChallengeMethod = searchParams.get('code_challenge_method') || ''
  const privacyPolicyUrl = searchParams.get('privacy_policy_url') || ''
  const termsOfServiceUrl = searchParams.get('terms_of_service_url') || ''
  const isVerified = searchParams.get('is_verified') === 'true'

  const apiBase = client.defaults.baseURL || (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8101'
  const consentEndpoint = String(apiBase).replace(/\/$/, '') + '/api/v1/oauth/consent'

  const submitConsentForm = (action: 'allow' | 'deny') => {
    if (submittedRef.current) return
    submittedRef.current = true

    const form = document.createElement('form')
    form.method = 'POST'
    form.action = consentEndpoint

    const append = (name: string, value: string) => {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = name
      input.value = value
      form.appendChild(input)
    }

    append('action', action)
    append('client_id', clientId)
    append('redirect_uri', redirectUri)
    append('scope', scopes.join(' '))
    if (state) append('state', state)
    if (codeChallenge) append('code_challenge', codeChallenge)
    if (codeChallengeMethod) append('code_challenge_method', codeChallengeMethod)

    document.body.appendChild(form)
    form.submit()
  }

  const handleAllow = async () => {
    if (submittedRef.current) return
    setLoading(true)
    setError('')
    try {
      submitConsentForm('allow')
    } catch (err: any) {
      submittedRef.current = false
      setError(err.message || t('auth.oauthConsent.errors.authorizeFailed'))
      setLoading(false)
    }
  }

  const handleDeny = async () => {
    if (submittedRef.current) return
    setLoading(true)
    setError('')
    try {
      submitConsentForm('deny')
    } catch (err: any) {
      submittedRef.current = false
      setError(err.message || t('auth.oauthConsent.errors.operationFailed'))
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!clientId || !redirectUri) {
      setError(t('auth.oauthConsent.errors.missingParams'))
    }
  }, [clientId, redirectUri, t])

  const getScopeDisplayName = (scope: string) => {
    const scopeNames: Record<string, string> = {
      openid: t('auth.oauthConsent.scopes.openid.name'),
      profile: t('auth.oauthConsent.scopes.profile.name'),
      email: t('auth.oauthConsent.scopes.email.name'),
      phone: t('auth.oauthConsent.scopes.phone.name'),
      address: t('auth.oauthConsent.scopes.address.name'),
      read: t('auth.oauthConsent.scopes.read.name'),
      write: t('auth.oauthConsent.scopes.write.name'),
      admin: t('auth.oauthConsent.scopes.admin.name'),
    }
    return scopeNames[scope] || scope
  }

  const getScopeDescription = (scope: string) => {
    const scopeDescriptions: Record<string, string> = {
      openid: t('auth.oauthConsent.scopes.openid.description'),
      profile: t('auth.oauthConsent.scopes.profile.description'),
      email: t('auth.oauthConsent.scopes.email.description'),
      phone: t('auth.oauthConsent.scopes.phone.description'),
      address: t('auth.oauthConsent.scopes.address.description'),
      read: t('auth.oauthConsent.scopes.read.description'),
      write: t('auth.oauthConsent.scopes.write.description'),
      admin: t('auth.oauthConsent.scopes.admin.description'),
    }
    return scopeDescriptions[scope] || t('auth.oauthConsent.scopes.defaultDescription', { scope })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-4xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error ? (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{t('auth.oauthConsent.errorCard.title')}</h3>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="lg:grid lg:grid-cols-5 lg:gap-8">
              {/* Left side: application details */}
              <div className="lg:col-span-2 flex flex-col items-center lg:items-start lg:border-r lg:border-gray-200 lg:pr-8">
                <div className="flex justify-center lg:justify-start w-full mb-6">
                  <ShieldCheckIcon className="h-16 w-16 text-blue-600" />
                </div>
                <h2 className="text-2xl lg:text-3xl font-extrabold text-gray-900 text-center lg:text-left mb-4">
                  {t('auth.oauthConsent.header.title')}
                </h2>
                <p className="text-sm text-gray-600 text-center lg:text-left mb-6">
                  {t('auth.oauthConsent.header.description')}
                </p>

                {/* App avatar + verified badge */}
                <div className="flex flex-col items-center lg:items-start w-full">
                  <div className="relative mb-4">
                    <div className="h-20 w-20 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-2xl font-bold">
                        {clientName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    {/* Twitter-style verified badge */}
                    {isVerified && (
                      <div
                        className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 shadow-md"
                        title={t('auth.oauthConsent.badges.verified')}
                      >
                        {/* Checkmark icon */}
                        <svg
                          viewBox="0 0 24 24"
                          fill="white"
                          className="h-3.5 w-3.5"
                          aria-label={t('auth.oauthConsent.badges.verified')}
                        >
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <h3 className="text-xl font-medium text-gray-900 text-center lg:text-left flex items-center gap-2">
                    {clientName}
                    {isVerified && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {t('auth.oauthConsent.badges.verified')}
                      </span>
                    )}
                  </h3>
                  {clientDescription && (
                    <p className="mt-2 text-sm text-gray-500 text-center lg:text-left">
                      {clientDescription}
                    </p>
                  )}
                </div>

                {/* Privacy policy & terms of service */}
                {(privacyPolicyUrl || termsOfServiceUrl) && (
                  <div className="mt-6 w-full text-center lg:text-left">
                    <p className="text-xs text-gray-400 mb-1">{t('auth.oauthConsent.links.title')}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center lg:justify-start">
                      {privacyPolicyUrl && (
                        <a
                          href={privacyPolicyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                        >
                          {t('auth.oauthConsent.links.privacyPolicy')}
                        </a>
                      )}
                      {termsOfServiceUrl && (
                        <a
                          href={termsOfServiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                        >
                          {t('auth.oauthConsent.links.termsOfService')}
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right side: permissions & actions */}
              <div className="lg:col-span-3 mt-8 lg:mt-0">
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    {t('auth.oauthConsent.permissions.title')}
                  </h4>
                  <div className="space-y-2">
                    {scopes.map((scope) => (
                      <div key={scope} className="flex items-start">
                        <div className="flex-shrink-0">
                          <div className="h-2 w-2 bg-indigo-600 rounded-full mt-2"></div>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {getScopeDisplayName(scope)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {getScopeDescription(scope)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">{t('auth.oauthConsent.notice.title')}</h3>
                      <p className="mt-1 text-sm text-yellow-700">
                        {t('auth.oauthConsent.notice.description')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={handleDeny}
                    disabled={loading}
                    className="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? t('auth.oauthConsent.actions.processing') : t('auth.oauthConsent.actions.deny')}
                  </button>
                  <button
                    onClick={handleAllow}
                    disabled={loading}
                    className="flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {loading ? t('auth.oauthConsent.actions.processing') : t('auth.oauthConsent.actions.allow')}
                  </button>
                </div>

                <div className="mt-6 text-center lg:text-left">
                  <p className="text-xs text-gray-500">
                    {t('auth.oauthConsent.footerHint')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
