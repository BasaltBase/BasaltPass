import { Link } from 'react-router-dom'
import { PButton, PCheckbox, PInput } from '@ui'
import type { FormEventHandler } from 'react'

interface LoginPasswordFormProps {
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

export function LoginPasswordForm({
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
}: LoginPasswordFormProps) {
  return (
    <form className="mt-6 space-y-5" onSubmit={submitPasswordLogin}>
      <div className="space-y-4">
        <PInput
          id="identifier"
          name="identifier"
          type="text"
          required
          label="邮箱或手机号"
          placeholder="请输入邮箱或手机号"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
        />
        <PInput
          id="password"
          name="password"
          type="password"
          required
          label="密码"
          placeholder="请输入密码"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword(!showPassword)}
        />
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <PCheckbox
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
            label="记住我"
          />
          <p className="mt-1 text-xs text-gray-500">在此设备保持 30 天登录状态</p>
        </div>
        <div className="pt-1 text-sm">
          <Link to="/reset-password" className="font-medium text-blue-600 hover:text-blue-500">
            忘记密码？
          </Link>
        </div>
      </div>

      <PButton
        type="submit"
        disabled={isLoading}
        variant="primary"
        fullWidth
        loading={isLoading}
      >
        登录
      </PButton>
    </form>
  )
}
