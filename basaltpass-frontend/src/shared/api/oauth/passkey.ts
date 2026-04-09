import client from '../client'
import { 
  registerPasskey, 
  loginWithPasskey, 
  formatCredentialCreationResponse, 
  formatCredentialAssertionResponse,
  getWebAuthnErrorMessage
} from '@utils/webauthn'

export interface PasskeyInfo {
  id: number
  name: string
  created_at: string
  last_used_at?: string
}

export interface LoginTokens {
  access_token: string
}

interface Passkey2FARequest {
  options: any
  challenge: string
}

// startPasskeyregister
export async function beginPasskeyRegistration(): Promise<any> {
  const response = await client.post('/api/v1/passkey/register/begin')
  return response.data
}

// translatedPasskeyregister
export async function finishPasskeyRegistration(
  name: string, 
  challenge: string, 
  credentialResponse: any
): Promise<PasskeyInfo> {
  const response = await client.post('/api/v1/passkey/register/finish', {
    name,
    challenge,
    ...credentialResponse
  })
  return response.data
}

// registertranslatedPasskey（translated）
export async function createPasskey(name: string): Promise<PasskeyInfo> {
  try {
    // 1. translatedservicetranslatedgetregistertranslated
    const options = await beginPasskeyRegistration()
    
    // 2. translatedWebAuthn APIcreatetranslated
    const credential = await registerPasskey(options)
    
    // 3. translatedresponsetranslatedtoservicetranslated
    const credentialResponse = formatCredentialCreationResponse(credential)
    
    // 4. translatedregister
    return await finishPasskeyRegistration(name, options.publicKey.challenge, credentialResponse)
  } catch (error: any) {
    throw new Error(getWebAuthnErrorMessage(error))
  }
}

// startPasskeylogin
export async function beginPasskeyLogin(email: string): Promise<any> {
  const response = await client.post('/api/v1/passkey/login/begin', { email })
  return response.data
}

// translatedPasskeylogin
export async function finishPasskeyLogin(
  email: string,
  challenge: string,
  credentialResponse: any
): Promise<LoginTokens> {
  const response = await client.post('/api/v1/passkey/login/finish', {
    email,
    challenge,
    ...credentialResponse
  })
  return response.data
}

// translatedPasskeylogin（translated）
export async function loginWithPasskeyFlow(email: string): Promise<LoginTokens> {
  try {
    // 1. translatedservicetranslatedgetlogintranslated
    const options = await beginPasskeyLogin(email)
    
    // 2. translatedWebAuthn APIgettranslated
    const credential = await loginWithPasskey(options)
    
    // 3. translatedresponsetranslatedtoservicetranslated
    const credentialResponse = formatCredentialAssertionResponse(credential)
    
    // 4. translatedlogin
    return await finishPasskeyLogin(email, options.publicKey.challenge, credentialResponse)
  } catch (error: any) {
    throw new Error(getWebAuthnErrorMessage(error))
  }
}

export async function beginPasskey2FA(preAuthToken: string): Promise<Passkey2FARequest> {
  const response = await client.post('/api/v1/passkey/2fa/begin', {
    pre_auth_token: preAuthToken,
  })
  return response.data
}

export async function finishPasskey2FA(
  preAuthToken: string,
  challenge: string,
  credentialResponse: any
): Promise<LoginTokens> {
  const response = await client.post('/api/v1/passkey/2fa/finish', {
    pre_auth_token: preAuthToken,
    challenge,
    ...credentialResponse,
  })
  return response.data
}

export async function loginWithPasskey2FAFlow(preAuthToken: string): Promise<LoginTokens> {
  try {
    const payload = await beginPasskey2FA(preAuthToken)
    const credential = await loginWithPasskey(payload.options)
    const credentialResponse = formatCredentialAssertionResponse(credential)
    return await finishPasskey2FA(preAuthToken, payload.challenge, credentialResponse)
  } catch (error: any) {
    throw new Error(getWebAuthnErrorMessage(error))
  }
}

// getusertranslatedPasskeylist
export async function listPasskeys(): Promise<PasskeyInfo[]> {
  const response = await client.get('/api/v1/passkey/list')
  return response.data
}

// deletePasskey
export async function deletePasskey(passkeyId: number): Promise<void> {
  await client.delete(`/api/v1/passkey/${passkeyId}`)
} 