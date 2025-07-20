import client from './client'

export const setup2FA = () => client.post('/api/v1/security/2fa/setup')
export const verify2FA = (code: string) => client.post('/api/v1/security/2fa/verify', { code }) 