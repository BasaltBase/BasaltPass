import { PAlert, PButton, PInput } from '@ui'
import type { FormEventHandler } from 'react'
import { getTwoFactorPresentation } from './twoFactor'
import type { TwoFactorMethod } from './types'

interface TenantTwoFactorFormProps {
  available2FAMethods: TwoFactorMethod[]
  emailCode: string
  error: string
  isLoading: boolean
  setEmailCode: (value: string) => void
  setStep: (step: number) => void
  setTwoFACode: (value: string) => void
  submit2FAVerify: FormEventHandler<HTMLFormElement>
  switch2FAMethod: (method: TwoFactorMethod) => void
  twoFACode: string
  twoFAType: TwoFactorMethod
}

export function TenantTwoFactorForm({
  available2FAMethods,
  emailCode,
  error,
  isLoading,
  setEmailCode,
  setStep,
  setTwoFACode,
  submit2FAVerify,
  switch2FAMethod,
  twoFACode,
  twoFAType,
}: TenantTwoFactorFormProps) {
  return (
    <form className="mt-6 space-y-6" onSubmit={submit2FAVerify}>
      {error && <PAlert variant="error" message={error} />}

      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900">二次验证</h3>
        <p className="mt-2 text-sm text-gray-600">请完成以下验证以继续登录</p>
      </div>

      {available2FAMethods.length > 1 && (
        <div className="flex justify-center space-x-2">
          {available2FAMethods.map((method) => {
            const { icon: Icon, label } = getTwoFactorPresentation(method)
            return (
              <PButton
                key={method}
                type="button"
                variant={twoFAType === method ? 'primary' : 'secondary'}
                onClick={() => switch2FAMethod(method)}
                leftIcon={<Icon className="h-5 w-5" />}
              >
                {label}
              </PButton>
            )
          })}
        </div>
      )}

      {twoFAType === 'totp' && (
        <div>
          <label htmlFor="totp-code" className="block text-sm font-medium text-gray-700">
            验证码
          </label>
          <PInput
            id="totp-code"
            name="totp-code"
            type="text"
            required
            value={twoFACode}
            onChange={(event) => setTwoFACode(event.target.value)}
            placeholder="请输入6位验证码"
            className="mt-1"
          />
        </div>
      )}

      {twoFAType === 'email' && (
        <div>
          <label htmlFor="email-code" className="block text-sm font-medium text-gray-700">
            邮箱验证码
          </label>
          <PInput
            id="email-code"
            name="email-code"
            type="text"
            required
            value={emailCode}
            onChange={(event) => setEmailCode(event.target.value)}
            placeholder="请输入邮箱验证码"
            className="mt-1"
          />
        </div>
      )}

      {twoFAType === 'passkey' && (
        <div className="rounded-md bg-blue-50 p-4 text-center">
          {(() => {
            const { icon: Icon } = getTwoFactorPresentation('passkey')
            return <Icon className="mx-auto mb-2 h-12 w-12 text-blue-600" />
          })()}
          <p className="text-sm text-gray-700">点击下方按钮使用Passkey验证</p>
        </div>
      )}

      <div>
        <PButton type="submit" loading={isLoading} fullWidth>
          {twoFAType === 'passkey' ? '使用Passkey验证' : '验证'}
        </PButton>
      </div>

      <div className="text-center">
        <PButton type="button" variant="ghost" onClick={() => setStep(1)}>
          返回登录
        </PButton>
      </div>
    </form>
  )
}
