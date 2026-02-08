import client from '../client'

export interface Gender {
  id: number
  code: string
  name: string
  name_cn: string
  sort_order: number
  is_active: boolean
}

export interface Language {
  id: number
  code: string
  name: string
  name_local: string
  is_active: boolean
  sort_order: number
}

export interface Currency {
  id: number
  code: string
  name: string
  name_cn: string
  symbol: string
  decimal_places: number
  type: string
  is_active: boolean
  sort_order: number
}

export interface Timezone {
  value: string
  label: string
  offset: string
}

export interface UserProfile {
  id: number
  user_id: number
  gender_id?: number
  language_id?: number
  currency_id?: number
  timezone: string
  birth_date?: string
  bio?: string
  location?: string
  website?: string
  company?: string
  job_title?: string
  gender?: Gender
  language?: Language
  currency?: Currency
  created_at: string
  updated_at: string
}

export interface UpdateProfileData {
  gender_id?: number | null
  language_id?: number | null
  currency_id?: number | null
  timezone?: string
  birth_date?: string | null
  bio?: string
  location?: string
  website?: string
  company?: string
  job_title?: string
}

// 获取用户详细资料
export const getUserProfile = () => client.get<{ profile: UserProfile }>('/api/v1/user/profile-detail')

// 更新用户详细资料
export const updateUserProfile = (data: UpdateProfileData) => 
  client.put<{ profile: UserProfile; message: string }>('/api/v1/user/profile-detail', data)

// 获取性别列表
export const getGenders = () => client.get<{ genders: Gender[] }>('/api/v1/user/genders')

// 获取语言列表
export const getLanguages = () => client.get<{ languages: Language[] }>('/api/v1/user/languages')

// 获取货币列表
export const getCurrencies = (onlyFiat = false) => 
  client.get<{ currencies: Currency[] }>('/api/v1/user/currencies', { params: { only_fiat: onlyFiat } })

// 获取时区列表
export const getTimezones = () => client.get<{ timezones: Timezone[] }>('/api/v1/user/timezones')
