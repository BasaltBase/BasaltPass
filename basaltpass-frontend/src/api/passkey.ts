import client from './client'
import { 
  registerPasskey, 
  loginWithPasskey, 
  formatCredentialCreationResponse, 
  formatCredentialAssertionResponse,
  getWebAuthnErrorMessage
} from '../utils/webauthn'

export interface PasskeyInfo {
  id: number
  name: string
  created_at: string
  last_used_at?: string
}

export interface LoginTokens {
  access_token: string
}

// 开始Passkey注册
export async function beginPasskeyRegistration(): Promise<any> {
  const response = await client.post('/api/v1/passkey/register/begin')
  return response.data
}

// 完成Passkey注册
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

// 注册新的Passkey（完整流程）
export async function createPasskey(name: string): Promise<PasskeyInfo> {
  try {
    // 1. 从服务器获取注册选项
    const options = await beginPasskeyRegistration()
    
    // 2. 使用浏览器WebAuthn API创建凭证
    const credential = await registerPasskey(options)
    
    // 3. 格式化响应并发送到服务器
    const credentialResponse = formatCredentialCreationResponse(credential)
    
    // 4. 完成注册
    return await finishPasskeyRegistration(name, options.publicKey.challenge, credentialResponse)
  } catch (error: any) {
    throw new Error(getWebAuthnErrorMessage(error))
  }
}

// 开始Passkey登录
export async function beginPasskeyLogin(email: string): Promise<any> {
  const response = await client.post('/api/v1/passkey/login/begin', { email })
  return response.data
}

// 完成Passkey登录
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

// 使用Passkey登录（完整流程）
export async function loginWithPasskeyFlow(email: string): Promise<LoginTokens> {
  try {
    // 1. 从服务器获取登录选项
    const options = await beginPasskeyLogin(email)
    
    // 2. 使用浏览器WebAuthn API获取凭证
    const credential = await loginWithPasskey(options)
    
    // 3. 格式化响应并发送到服务器
    const credentialResponse = formatCredentialAssertionResponse(credential)
    
    // 4. 完成登录
    return await finishPasskeyLogin(email, options.publicKey.challenge, credentialResponse)
  } catch (error: any) {
    throw new Error(getWebAuthnErrorMessage(error))
  }
}

// 获取用户的Passkey列表
export async function listPasskeys(): Promise<PasskeyInfo[]> {
  const response = await client.get('/api/v1/passkey/list')
  return response.data
}

// 删除Passkey
export async function deletePasskey(passkeyId: number): Promise<void> {
  await client.delete(`/api/v1/passkey/${passkeyId}`)
} 