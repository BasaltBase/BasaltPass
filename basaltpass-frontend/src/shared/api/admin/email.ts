import client from '../client'

export interface EmailConfig {
  provider: string
  enabled: boolean
}

export interface SendTestEmailRequest {
  from?: string
  to: string
  subject?: string
  body?: string
  is_html?: boolean
}

export const getEmailConfig = () => client.get<{ data: EmailConfig }>('/api/v1/admin/email/config')
export const sendTestEmail = (data: SendTestEmailRequest) => client.post('/api/v1/admin/email/send-test', data)
