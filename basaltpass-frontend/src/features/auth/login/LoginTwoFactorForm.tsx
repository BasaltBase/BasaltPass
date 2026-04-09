import { PAlert, PButton, PInput } from '@ui'
import type { FormEventHandler, RefObject } from 'react'
import { getTwoFactorPresentation } from '../tenant-login/twoFactor'
import type { LoginTwoFactorMethod } from './types'
import { useI18n } from '@shared/i18n'

interface LoginTwoFactorFormProps {
  available2FAMethods: LoginTwoFactorMethod[]
  emailCode: string
  error: string
  isLoading: boolean
  resetToPasswordStep: () => void
  setEmailCode: (value: string) => void
  setTwoFACode: (value: string) => void
  submit2FAVerify: FormEventHandler<HTMLFormElement>
  switch2FAMethod: (method: LoginTwoFactorMethod) => void
  totpInputRef: RefObject<HTMLInputElement>
  twoFACode: string
  twoFAType: LoginTwoFactorMethod
  verifySecondFactor: (totpCode?: string) => Promise<void>
}

export function LoginTwoFactorForm({
  available2FAMethods,
  emailCode,
  error,
  isLoading,
  resetToPasswordStep,
  setEmailCode,
  setTwoFACode,
  submit2FAVerify,
  switch2FAMethod,
  totpInputRef,
  twoFACode,
  twoFAType,
  verifySecondFactor,
}: LoginTwoFactorFormProps) {
  const { t } = useI18n()

  const renderInputForm = () => {
    if (twoFAType === 'totp') {
      return (
        <form className="space-y-6" onSubmit={submit2FAVerify}>
          <div className="space-y-4">
            <PInput
              id="2fa-code"
              name="2fa-code"
              type="text"
              required
              maxLength={6}
              label={t('auth.twoFactor.codeLabel')}
              placeholder={t('auth.twoFactor.codePlaceholder')}
              inputMode="numeric"
              autoComplete="one-time-code"
              ref={totpInputRef}
              value={twoFACode}
              onChange={(event) => {
                const sanitized = event.target.value.replace(/\D/g, '').slice(0, 6)
                setTwoFACode(sanitized)
                if (sanitized.length === 6) {
                  void verifySecondFactor(sanitized)
                }
              }}
            />
          </div>
          <div>
            <PButton type="submit" disabled={isLoading} variant="primary" fullWidth loading={isLoading}>
              {t('auth.twoFactor.verifyLogin')}
            </PButton>
          </div>
        </form>
      )
    }

    if (twoFAType === 'email') {
      return (
        <form className="space-y-6" onSubmit={submit2FAVerify}>
          <div className="space-y-4">
            <PInput
              id="email-code"
              name="email-code"
              type="text"
              required
              label={t('auth.twoFactor.emailCodeLabel')}
              placeholder={t('auth.twoFactor.emailCodePlaceholder')}
              value={emailCode}
              onChange={(event) => setEmailCode(event.target.value)}
            />
          </div>
          <div>
            <PButton type="submit" disabled={isLoading} variant="primary" fullWidth loading={isLoading}>
              {t('auth.twoFactor.verifyLogin')}
            </PButton>
          </div>
        </form>
      )
    }

    if (twoFAType === 'passkey') {
      const { icon: Icon } = getTwoFactorPresentation('passkey')
      return (
        <form className="space-y-6" onSubmit={submit2FAVerify}>
          <div className="space-y-4">
            <PAlert variant="info" title={t('auth.twoFactor.passkeyInfoTitle')} message={t('auth.twoFactor.passkeyInfoMessage')} />
          </div>
          <div>
            <PButton
              type="submit"
              disabled={isLoading}
              variant="primary"
              fullWidth
              loading={isLoading}
              leftIcon={<Icon className="h-5 w-5" />}
            >
              {t('auth.twoFactor.passkeyButton')}
            </PButton>
          </div>
        </form>
      )
    }

    return null
  }

  const renderMethodSelection = () => {
    if (available2FAMethods.length <= 1) {
      return null
    }

    return (
      <div>
        <h3 className="mb-4 text-lg font-medium text-gray-900">{t('auth.twoFactor.chooseMethod')}</h3>
        <div className="space-y-3">
          {available2FAMethods.map((method) => {
            const { icon: Icon, labelKey } = getTwoFactorPresentation(method)
            const isSelected = method === twoFAType

            return (
              <PButton
                key={method}
                type="button"
                variant={isSelected ? 'primary' : 'secondary'}
                fullWidth
                onClick={() => switch2FAMethod(method)}
                leftIcon={<Icon className={`h-5 w-5 ${isSelected ? 'text-white' : 'text-gray-400'}`} />}
                className={`justify-start ${
                  isSelected
                    ? 'border-blue-500 bg-blue-600'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className={`font-medium ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                  {t(labelKey)}
                </span>
                {isSelected && (
                  <div className="ml-auto">
                    <div className="h-2 w-2 rounded-full bg-white"></div>
                  </div>
                )}
              </PButton>
            )
          })}
        </div>
      </div>
    )
  }

  const renderBody = () => {
    const { labelKey } = getTwoFactorPresentation(twoFAType)
    const methodLabel = t(labelKey)

    if (available2FAMethods.length > 1) {
      return (
        <div className="space-y-6">
          {renderMethodSelection()}
          <div className="border-t pt-6">
            <h4 className="mb-4 text-md font-medium text-gray-900">{t('auth.twoFactor.useMethod', { method: methodLabel })}</h4>
            {renderInputForm()}
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">{t('auth.twoFactor.title')}</h3>
          <p className="text-sm text-gray-600">{t('auth.twoFactor.subtitle', { method: methodLabel })}</p>
        </div>
        {renderInputForm()}
      </div>
    )
  }

  return (
    <div className="mt-6">
      {error && (
        <div className="mb-6">
          <PAlert variant="error" title={t('auth.login.errorTitle')} message={error} />
        </div>
      )}
      {renderBody()}
      <div className="mt-4">
        <PButton type="button" variant="ghost" fullWidth onClick={resetToPasswordStep}>
          {t('auth.twoFactor.backToPassword')}
        </PButton>
      </div>
    </div>
  )
}
