import client from '../client'

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

// 新的安全功能

// 邮箱变更
export const startEmailChange = async (newEmail: string, currentPassword: string) => {
  return client.post('/api/v1/user/security/email/change', {
    new_email: newEmail,
    current_password: currentPassword
  })
}

// 增强的密码修改功能
export const enhancedChangePassword = async (data: {
  current_password: string
  new_password: string
  confirm_password: string
  device_fingerprint?: string
}) => {
  return client.post('/api/v1/user/security/password/change', data)
}

// 开始密码重置流程
export const startPasswordReset = async (email: string) => {
  return client.post('/api/v1/security/password/reset', {
    email
  })
}

// 确认密码重置
export const confirmPasswordReset = async (token: string, newPassword: string, confirmPassword: string) => {
  return client.post('/api/v1/security/password/confirm', {
    token,
    new_password: newPassword,
    confirm_password: confirmPassword
  })
}

// 生成设备指纹
export const generateDeviceFingerprint = (): string => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  if (ctx) {
    ctx.textBaseline = 'top'
    ctx.font = '14px Arial'
    ctx.fillText('Device fingerprint', 2, 2)
  }
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
    navigator.platform
  ].join('|')
  
  // 简单的hash函数
  let hash = 0
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(16)
} 