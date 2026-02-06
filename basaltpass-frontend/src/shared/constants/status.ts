export const USER_STATUS = {
  active: 'active',
  banned: 'banned',
  pending: 'pending'
} as const

export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS]
