import { PButton, PCheckbox, PInput } from '@ui'
import type { FormEventHandler } from 'react'
import { useI18n } from '@shared/i18n'

interface TenantPasswordLoginFormProps {
  identifier: string
  isLoading: boolean
  password: string
  rememberMe: boolean
  setIdentifier: (value: string) => void
  setPassword: (value: string) => void
  setRememberMe: (value: boolean) => void
  setShowPassword: (value: boolean) => void
  showPassword: boolean
  submitPasswordLogin: FormEventHandler<HTMLFormElement>
}

export function TenantPasswordLoginForm({
  identifier,
  isLoading,
  password,
  rememberMe,
  setIdentifier,
  setPassword,
  setRememberMe,
  setShowPassword,
  showPassword,
  submitPasswordLogin,
}: TenantPasswordLoginFormProps) {
  const { t } = useI18n()

  return (
    <form className="mt-6 space-y-6" onSubmit={submitPasswordLogin}>
      <div className="space-y-4">
        <PInput
          id="identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          required
          label={t('auth.passwordForm.identifierLabel')}
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder={t('auth.passwordForm.identifierPlaceholder')}
        />
        <PInput
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          label={t('auth.passwordForm.passwordLabel')}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={t('auth.passwordForm.passwordPlaceholder')}
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword(!showPassword)}
        />
      </div>

      <div className="flex items-center justify-between">
        <PCheckbox
          checked={rememberMe}
          onChange={(event) => setRememberMe(event.target.checked)}
          label={t('auth.passwordForm.rememberMe')}
        />

        <div className="text-sm">
          <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
            {t('auth.passwordForm.forgotPassword')}
          </a>
        </div>
      </div>

      <div>
        <PButton type="submit" loading={isLoading} variant="primary" fullWidth>
          {t('auth.passwordForm.loginButton')}
        </PButton>
      </div>
    </form>
  )
}
