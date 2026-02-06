import client from '../client'

export interface SettingDTO {
  key: string
  value: any
  category?: string
  description?: string
}

export function listSettings(params?: { category?: string }) {
  return client.get<SettingDTO[]>('/admin/settings', { params })
}

export function getSetting(key: string) {
  return client.get<SettingDTO>(`/admin/settings/${encodeURIComponent(key)}`)
}

export function upsertSetting(data: SettingDTO) {
  return client.post('/admin/settings', data)
}

export function bulkUpdateSettings(items: SettingDTO[]) {
  return client.put('/admin/settings/bulk', items)
}
