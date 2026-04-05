import { PButton, PCheckbox, PInput } from '@ui'
import type { FormEventHandler } from 'react'

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
  return (
    <form className="mt-6 space-y-6" onSubmit={submitPasswordLogin}>
      <div className="space-y-4">
        <PInput
          id="identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          required
          label="邮箱或手机号"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder="请输入邮箱或手机号"
        />
        <PInput
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          label="密码"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="请输入密码"
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword(!showPassword)}
        />
      </div>

      <div className="flex items-center justify-between">
        <PCheckbox
          checked={rememberMe}
          onChange={(event) => setRememberMe(event.target.checked)}
          label="记住我"
        />

        <div className="text-sm">
          <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
            忘记密码？
          </a>
        </div>
      </div>

      <div>
        <PButton type="submit" loading={isLoading} variant="primary" fullWidth>
          登录
        </PButton>
      </div>
    </form>
  )
}
