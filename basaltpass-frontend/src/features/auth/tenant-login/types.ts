export interface TenantInfo {
  id: number
  name: string
  code: string
}

export type TwoFactorMethod = 'totp' | 'passkey' | 'email' | string
