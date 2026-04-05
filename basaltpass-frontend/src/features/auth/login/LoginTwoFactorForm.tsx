import { PAlert, PButton, PInput } from '@ui'
import type { FormEventHandler, RefObject } from 'react'
import { getTwoFactorPresentation } from '../tenant-login/twoFactor'
import type { LoginTwoFactorMethod } from './types'

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
              label="二步验证码"
              placeholder="请输入6位验证码"
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
              验证登录
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
              label="邮箱验证码"
              placeholder="请输入邮箱收到的验证码"
              value={emailCode}
              onChange={(event) => setEmailCode(event.target.value)}
            />
          </div>
          <div>
            <PButton type="submit" disabled={isLoading} variant="primary" fullWidth loading={isLoading}>
              验证登录
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
            <PAlert variant="info" title="使用Passkey进行二次验证" message="点击验证后，您的设备将提示您进行生物识别验证或使用安全密钥。" />
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
              使用Passkey验证
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
        <h3 className="mb-4 text-lg font-medium text-gray-900">选择验证方式</h3>
        <div className="space-y-3">
          {available2FAMethods.map((method) => {
            const { icon: Icon, label } = getTwoFactorPresentation(method)
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
                  {label}
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
    const { label } = getTwoFactorPresentation(twoFAType)

    if (available2FAMethods.length > 1) {
      return (
        <div className="space-y-6">
          {renderMethodSelection()}
          <div className="border-t pt-6">
            <h4 className="mb-4 text-md font-medium text-gray-900">使用 {label} 验证</h4>
            {renderInputForm()}
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">二次验证</h3>
          <p className="text-sm text-gray-600">请使用 {label} 完成验证</p>
        </div>
        {renderInputForm()}
      </div>
    )
  }

  return (
    <div className="mt-6">
      {error && (
        <div className="mb-6">
          <PAlert variant="error" title="登录失败" message={error} />
        </div>
      )}
      {renderBody()}
      <div className="mt-4">
        <PButton type="button" variant="ghost" fullWidth onClick={resetToPasswordStep}>
          返回重新输入账号信息
        </PButton>
      </div>
    </div>
  )
}
