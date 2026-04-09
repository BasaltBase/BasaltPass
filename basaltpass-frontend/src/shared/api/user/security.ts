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

// 2FAtranslated
export const setup2FA = () => client.post('/api/v1/security/2fa/setup')
export const verify2FA = (code: string) => client.post('/api/v1/security/2fa/verify', { code })
export const disable2FA = (code: string) => client.post('/api/v1/security/2fa/disable', { code })

// getsecuritystatus
export const getSecurityStatus = (): Promise<{ data: SecurityStatus }> => 
  client.get('/api/v1/security/status')

// passwordmanagement
export const changePassword = (data: ChangePasswordRequest) => 
  client.post('/api/v1/security/password/change', data)

// translatedmanagement
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

// translatedsecuritytranslated

// emailtranslated
export const startEmailChange = async (newEmail: string, currentPassword: string) => {
  return client.post('/api/v1/user/security/email/change', {
    new_email: newEmail,
    current_password: currentPassword
  })
}

// translatedpasswordtranslated
export const enhancedChangePassword = async (data: {
  current_password: string
  new_password: string
  confirm_password: string
  device_fingerprint?: string
}) => {
  return client.post('/api/v1/user/security/password/change', data)
}

// startpasswordresettranslated
export const startPasswordReset = async (email: string) => {
  return client.post('/api/v1/security/password/reset', {
    email
  })
}

// translatedpasswordreset
export const confirmPasswordReset = async (token: string, newPassword: string, confirmPassword: string) => {
  return client.post('/api/v1/security/password/confirm', {
    token,
    new_password: newPassword,
    confirm_password: confirmPassword
  })
}

// translated
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
  
  // translatedhashtranslated
  let hash = 0
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(16)
} 