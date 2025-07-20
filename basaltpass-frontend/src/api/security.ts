import client from './client'

export interface SecurityStatus {
  password_set: boolean
  two_fa_enabled: boolean
  passkeys_count: number
  email: string
  phone?: string
  email_verified: boolean
  phone_verified: boolean
}

export interface ChangePasswordRequest {
  current_password: string
  new_password: string
  confirm_password: string
}

export interface UpdateContactRequest {
  email?: string
  phone?: string
}

// 2FA相关
export const setup2FA = () => client.post('/api/v1/security/2fa/setup')
export const verify2FA = (code: string) => client.post('/api/v1/security/2fa/verify', { code })
export const disable2FA = (code: string) => client.post('/api/v1/security/2fa/disable', { code })

// 获取安全状态
export const getSecurityStatus = (): Promise<{ data: SecurityStatus }> => 
  client.get('/api/v1/security/status')

// 密码管理
export const changePassword = (data: ChangePasswordRequest) => 
  client.post('/api/v1/security/password/change', data)

// 联系方式管理
export const updateContact = (data: UpdateContactRequest) => 
  client.put('/api/v1/security/contact', data)

export const verifyEmail = () => 
  client.post('/api/v1/security/email/verify')

export const verifyPhone = (code: string) => 
  client.post('/api/v1/security/phone/verify', { code })

export const resendEmailVerification = () => 
  client.post('/api/v1/security/email/resend')

export const resendPhoneVerification = () => 
  client.post('/api/v1/security/phone/resend') 